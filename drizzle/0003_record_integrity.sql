-- Record integrity enforced inside Postgres (see CLAUDE.md "Record integrity").
-- The app sets the actor per write transaction:
--   select set_config('app.user_id', $1, true), set_config('app.user_name', $2, true)
-- A write without an actor fails.

CREATE FUNCTION pc_actor_id() RETURNS uuid
LANGUAGE plpgsql STABLE SET search_path = pg_catalog AS $$
DECLARE
  v uuid := nullif(current_setting('app.user_id', true), '')::uuid;
BEGIN
  IF v IS NULL THEN
    RAISE EXCEPTION 'app.user_id is not set for this transaction' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN v;
END $$;
--> statement-breakpoint

CREATE FUNCTION pc_actor_name() RETURNS text
LANGUAGE plpgsql STABLE SET search_path = pg_catalog AS $$
DECLARE
  v text := nullif(btrim(current_setting('app.user_name', true)), '');
BEGIN
  IF v IS NULL THEN
    RAISE EXCEPTION 'app.user_name is not set for this transaction' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN v;
END $$;
--> statement-breakpoint

-- Stamp the creator from the actor, ignoring whatever the app sent, so nobody
-- can create rows that another pharmacist then "owns".
CREATE FUNCTION pc_before_insert() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  NEW.created_by := pc_actor_id();
  NEW.created_by_name := pc_actor_name();
  NEW.created_at := now();
  NEW.updated_by := NULL;
  NEW.updated_at := NULL;
  IF NEW.cancelled_at IS NOT NULL OR NEW.cancelled_by IS NOT NULL OR NEW.cancel_reason IS NOT NULL THEN
    RAISE EXCEPTION 'a record cannot be created already cancelled' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint

-- Owner-only edits, immutable identity, cancel = one-way.
-- Exception: anyone may sync the HIS columns of patients (still audited).
CREATE FUNCTION pc_before_update() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE
  actor uuid := pc_actor_id();
  meta_cols text[] := ARRAY['updated_by', 'updated_at'];
  his_cols text[] := ARRAY['prefix', 'first_name', 'last_name', 'sex', 'birth_date', 'birth_date_estimated', 'his_synced_at'];
  old_row jsonb := to_jsonb(OLD);
  new_row jsonb := to_jsonb(NEW);
BEGIN
  -- Nothing changed: skip the write and the audit entry.
  IF (new_row - meta_cols) = (old_row - meta_cols) THEN
    RETURN NULL;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.created_by IS DISTINCT FROM OLD.created_by
     OR NEW.created_by_name IS DISTINCT FROM OLD.created_by_name
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR (new_row -> 'patient_id') IS DISTINCT FROM (old_row -> 'patient_id') THEN
    RAISE EXCEPTION 'id, patient_id and created_* cannot be changed' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF OLD.cancelled_at IS NOT NULL THEN
    RAISE EXCEPTION 'a cancelled record cannot be changed' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF actor IS DISTINCT FROM OLD.created_by THEN
    IF TG_TABLE_NAME <> 'patients' OR (new_row - his_cols - meta_cols) <> (old_row - his_cols - meta_cols) THEN
      RAISE EXCEPTION 'only the pharmacist who recorded this can change it' USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;

  IF NEW.cancelled_at IS NOT NULL THEN
    IF nullif(btrim(NEW.cancel_reason), '') IS NULL THEN
      RAISE EXCEPTION 'a cancel reason is required' USING ERRCODE = 'check_violation';
    END IF;
    NEW.cancelled_at := now();
    NEW.cancelled_by := actor;
  ELSIF NEW.cancelled_by IS NOT NULL OR NEW.cancel_reason IS NOT NULL THEN
    RAISE EXCEPTION 'set cancelled_at together with cancel_reason' USING ERRCODE = 'check_violation';
  END IF;

  NEW.updated_by := actor;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
--> statement-breakpoint

-- Runs as pharmcare_owner so audit_log stays read-only for the app.
CREATE FUNCTION pc_audit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  meta_cols text[] := ARRAY['updated_by', 'updated_at'];
  new_row jsonb := to_jsonb(NEW) - meta_cols;
  old_row jsonb;
  act text;
  changes jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    act := 'insert';
    changes := new_row;
  ELSE
    old_row := to_jsonb(OLD) - meta_cols;
    SELECT jsonb_object_agg(k, jsonb_build_object('from', old_row -> k, 'to', new_row -> k))
      INTO changes
      FROM jsonb_object_keys(new_row) AS k
     WHERE (old_row -> k) IS DISTINCT FROM (new_row -> k);
    IF changes IS NULL THEN
      RETURN NULL;
    END IF;
    act := CASE WHEN OLD.cancelled_at IS NULL AND NEW.cancelled_at IS NOT NULL THEN 'cancel' ELSE 'update' END;
  END IF;

  INSERT INTO audit_log (table_name, record_id, patient_id, action, actor_id, actor_name, diff)
  VALUES (
    TG_TABLE_NAME,
    NEW.id,
    CASE WHEN TG_TABLE_NAME = 'patients' THEN NEW.id ELSE (new_row ->> 'patient_id')::uuid END,
    act,
    pc_actor_id(),
    pc_actor_name(),
    changes
  );
  RETURN NULL;
END $$;
--> statement-breakpoint

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['patients', 'visits', 'drps', 'high_alert_monitoring', 'adrs', 'technique_assessments'] LOOP
    EXECUTE format('CREATE TRIGGER %I BEFORE INSERT ON %I FOR EACH ROW EXECUTE FUNCTION pc_before_insert()', t || '_before_insert', t);
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION pc_before_update()', t || '_before_update', t);
    EXECUTE format('CREATE TRIGGER %I AFTER INSERT OR UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION pc_audit()', t || '_audit', t);
    -- No DELETE, ever: records are cancelled instead.
    EXECUTE format('GRANT SELECT, INSERT, UPDATE ON %I TO pharmcare_app', t);
  END LOOP;
END $$;
--> statement-breakpoint

-- Tighter than deploy/PLAN.md (which said INSERT + SELECT): only the definer
-- trigger writes audit_log, so the app cannot forge entries.
GRANT SELECT ON audit_log TO pharmcare_app;
--> statement-breakpoint

-- The app cannot DELETE login_attempts; this is its only way to prune them.
CREATE FUNCTION purge_login_attempts() RETURNS integer
LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  WITH gone AS (DELETE FROM login_attempts WHERE attempted_at < now() - interval '30 days' RETURNING 1)
  SELECT count(*)::integer FROM gone
$$;
--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION purge_login_attempts() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION purge_login_attempts() TO pharmcare_app;
