-- NOTE: GIN trigram indexes cannot be described in schema.prisma; they live only in SQL.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- AlterTable
ALTER TABLE "page_contents" ADD COLUMN "searchText" TEXT NOT NULL DEFAULT '';
ALTER TABLE "page_contents" ADD COLUMN "workspaceId" TEXT;

-- Backfill workspaceId from parent page
UPDATE "page_contents" pc
SET "workspaceId" = p."workspaceId"
FROM "pages" p
WHERE p."id" = pc."pageId";

ALTER TABLE "page_contents" ALTER COLUMN "workspaceId" SET NOT NULL;

-- Backfill plain text from ProseMirror JSON
UPDATE "page_contents" pc
SET "searchText" = COALESCE(
  (
    SELECT string_agg(t #>> '{}', ' ')
    FROM jsonb_path_query(pc."json", 'strict $.**.text') AS t
    WHERE jsonb_typeof(t) = 'string'
  ),
  ''
);

-- Keep page freshness in sync with content for existing rows
UPDATE "pages" p
SET "updatedAt" = pc."updatedAt"
FROM "page_contents" pc
WHERE pc."pageId" = p."id"
  AND pc."updatedAt" > p."updatedAt";

-- CreateIndex (workspace-scoped trigram search)
CREATE INDEX "page_contents_workspaceId_searchText_trgm_idx"
  ON "page_contents" USING gin ("workspaceId", "searchText" gin_trgm_ops);
CREATE INDEX "pages_workspaceId_title_trgm_idx"
  ON "pages" USING gin ("workspaceId", "title" gin_trgm_ops);
