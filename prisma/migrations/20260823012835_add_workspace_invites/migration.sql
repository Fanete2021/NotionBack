DO $$
BEGIN
  IF to_regclass('"projects_workspaceId_parentProjectId_position_key"') IS NULL THEN
    IF to_regclass('"projects_position_unique"') IS NOT NULL THEN
      ALTER INDEX "projects_position_unique"
        RENAME TO "projects_workspaceId_parentProjectId_position_key";
    ELSE
      CREATE UNIQUE INDEX "projects_workspaceId_parentProjectId_position_key"
        ON "projects"("workspaceId", "parentProjectId", "position")
        NULLS NOT DISTINCT;
    END IF;
  END IF;

  IF to_regclass('"pages_workspaceId_projectId_parentPageId_position_key"') IS NULL THEN
    IF to_regclass('"pages_position_unique"') IS NOT NULL THEN
      ALTER INDEX "pages_position_unique"
        RENAME TO "pages_workspaceId_projectId_parentPageId_position_key";
    ELSE
      CREATE UNIQUE INDEX "pages_workspaceId_projectId_parentPageId_position_key"
        ON "pages"("workspaceId", "projectId", "parentPageId", "position")
        NULLS NOT DISTINCT;
    END IF;
  END IF;
END
$$;

-- CreateTable
CREATE TABLE "workspace_invites" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'EDITOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workspace_invites_tokenHash_key" ON "workspace_invites"("tokenHash");

-- CreateIndex
CREATE INDEX "workspace_invites_workspaceId_idx" ON "workspace_invites"("workspaceId");

-- AddForeignKey
ALTER TABLE "workspace_invites" ADD CONSTRAINT "workspace_invites_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_invites" ADD CONSTRAINT "workspace_invites_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
