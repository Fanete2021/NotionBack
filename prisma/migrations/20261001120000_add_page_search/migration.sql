-- NOTE: GIN trigram indexes cannot be described in schema.prisma; they live only in SQL.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- AlterTable
ALTER TABLE "page_contents" ADD COLUMN "searchText" TEXT NOT NULL DEFAULT '';

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

-- CreateIndex
CREATE INDEX "page_contents_searchText_trgm_idx" ON "page_contents" USING gin ("searchText" gin_trgm_ops);
CREATE INDEX "pages_title_trgm_idx" ON "pages" USING gin ("title" gin_trgm_ops);
