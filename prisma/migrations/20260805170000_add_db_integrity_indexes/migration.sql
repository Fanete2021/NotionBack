-- один OWNER на workspace (частичный уникальный индекс)
CREATE UNIQUE INDEX one_owner_per_workspace
  ON "workspace_members"("workspaceId")
  WHERE role = 'OWNER';

-- уникальность позиций среди соседей (корневые с NULL тоже учитываются, нужен PG15+)
CREATE UNIQUE INDEX projects_position_unique
  ON "projects"("workspaceId", "parentProjectId", "position")
  NULLS NOT DISTINCT;

CREATE UNIQUE INDEX pages_position_unique
  ON "pages"("workspaceId", "projectId", "parentPageId", "position")
  NULLS NOT DISTINCT;
