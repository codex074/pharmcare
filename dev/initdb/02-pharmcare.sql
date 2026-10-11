-- Same statements the production runbook applies on CT 103 (deploy/PLAN.md "Role"),
-- with dev-only passwords.

CREATE ROLE pharmcare_owner LOGIN PASSWORD 'dev-owner-pass' CONNECTION LIMIT 2;
CREATE ROLE pharmcare_app   LOGIN PASSWORD 'dev-app-pass'   CONNECTION LIMIT 10;
ALTER ROLE pharmcare_app SET statement_timeout = '15s';

CREATE DATABASE pharmcare OWNER pharmcare_owner;
REVOKE CONNECT ON DATABASE pharmcare FROM PUBLIC;
GRANT CONNECT ON DATABASE pharmcare TO pharmcare_app;

-- In the `postgres` database: read only the user columns login needs.
GRANT USAGE ON SCHEMA public TO pharmcare_app;
GRANT SELECT (id, pha_id, prefix, f_name, l_name, role, password, is_active, must_change_password)
  ON public.users TO pharmcare_app;

\connect pharmcare
ALTER SCHEMA public OWNER TO pharmcare_owner;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO pharmcare_app;
