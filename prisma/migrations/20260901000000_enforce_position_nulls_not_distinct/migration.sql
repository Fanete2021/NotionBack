DO $$
DECLARE
  target RECORD;
BEGIN
  FOR target IN
    SELECT * FROM (VALUES
      (
        'projects_workspaceId_parentProjectId_position_key',
        'CREATE UNIQUE INDEX "projects_workspaceId_parentProjectId_position_key" ON "projects"("workspaceId", "parentProjectId", "position") NULLS NOT DISTINCT'
      ),
      (
        'pages_workspaceId_projectId_parentPageId_position_key',
        'CREATE UNIQUE INDEX "pages_workspaceId_projectId_parentPageId_position_key" ON "pages"("workspaceId", "projectId", "parentPageId", "position") NULLS NOT DISTINCT'
      )
    ) AS t(index_name, create_sql)
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_index i
      JOIN pg_class c ON c.oid = i.indexrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relname = target.index_name
        AND n.nspname = current_schema()
        AND i.indnullsnotdistinct
    ) THEN
      EXECUTE format('DROP INDEX IF EXISTS %I', target.index_name);
      EXECUTE target.create_sql;
    END IF;
  END LOOP;
END
$$;
