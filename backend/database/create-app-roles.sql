\getenv app_password DB_PASSWORD
\getenv migration_password DB_MIGRATION_PASSWORD
\getenv admin_password DB_ADMIN_PASSWORD

SELECT format(
  'CREATE ROLE project_raa_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD %L',
  :'app_password'
)
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'project_raa_app')
\gexec

SELECT format(
  'ALTER ROLE project_raa_app WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD %L',
  :'app_password'
)
\gexec

SELECT format(
  'CREATE ROLE project_raa_migrator LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD %L',
  :'migration_password'
)
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'project_raa_migrator')
\gexec

SELECT format(
  'ALTER ROLE project_raa_migrator WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD %L',
  :'migration_password'
)
\gexec

ALTER SCHEMA public OWNER TO project_raa_migrator;

DO $$
DECLARE
  database_object RECORD;
  alter_command TEXT;
BEGIN
  FOR database_object IN
    SELECT relation.relkind, namespace.nspname, relation.relname
    FROM pg_class AS relation
    JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname = 'public'
      AND relation.relowner = 'postgres'::regrole
      AND relation.relkind IN ('r', 'p', 'v', 'm', 'f')
  LOOP
    alter_command := CASE database_object.relkind
      WHEN 'v' THEN 'ALTER VIEW'
      WHEN 'm' THEN 'ALTER MATERIALIZED VIEW'
      WHEN 'f' THEN 'ALTER FOREIGN TABLE'
      ELSE 'ALTER TABLE'
    END;
    EXECUTE format(
      '%s %I.%I OWNER TO project_raa_migrator',
      alter_command,
      database_object.nspname,
      database_object.relname
    );
  END LOOP;
END
$$;

GRANT CONNECT ON DATABASE project_raa TO project_raa_app, project_raa_migrator;
GRANT USAGE ON SCHEMA public TO project_raa_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO project_raa_app;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO project_raa_app;

ALTER DEFAULT PRIVILEGES FOR ROLE project_raa_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO project_raa_app;
ALTER DEFAULT PRIVILEGES FOR ROLE project_raa_migrator IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO project_raa_app;

SELECT format('ALTER ROLE postgres WITH PASSWORD %L', :'admin_password')
\gexec
