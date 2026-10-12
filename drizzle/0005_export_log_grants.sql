-- Exports are logged by the database, stamped with the transaction's actor,
-- so the app can neither skip the actor nor rewrite the log.
CREATE FUNCTION log_export(p_table text, p_rows integer, p_filters jsonb DEFAULT '{}'::jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  INSERT INTO export_log (table_name, row_count, filters, actor_id, actor_name)
  VALUES (p_table, p_rows, coalesce(p_filters, '{}'::jsonb), pc_actor_id(), pc_actor_name());
END $$;
--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION log_export(text, integer, jsonb) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION log_export(text, integer, jsonb) TO pharmcare_app;
--> statement-breakpoint
GRANT SELECT ON export_log TO pharmcare_app;
