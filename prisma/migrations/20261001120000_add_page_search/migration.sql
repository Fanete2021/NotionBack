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

-- Mirrors src/modules/pages/pages-content/utils/extract-plain-text.ts
CREATE OR REPLACE FUNCTION extract_plain_text(node jsonb, depth integer)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  item jsonb;
  result text := '';
BEGIN
  IF depth > 100 OR node IS NULL OR jsonb_typeof(node) NOT IN ('object', 'array') THEN
    RETURN '';
  END IF;

  IF jsonb_typeof(node) = 'array' THEN
    FOR item IN SELECT value FROM jsonb_array_elements(node)
    LOOP
      result := result || extract_plain_text(item, depth + 1);
    END LOOP;
    RETURN result;
  END IF;

  IF jsonb_typeof(node -> 'text') = 'string' THEN
    result := result || (node ->> 'text');
  END IF;

  IF jsonb_typeof(node -> 'content') = 'array' THEN
    result := result || extract_plain_text(node -> 'content', depth + 1) || ' ';
  END IF;

  RETURN result;
END;
$$;

-- PostgreSQL \s is ASCII. JavaScript \s / trim also folds these Unicode spaces.
UPDATE "page_contents" pc
SET "searchText" = btrim(regexp_replace(
  extract_plain_text(pc."json", 0),
  '[' || chr(9) || chr(10) || chr(11) || chr(12) || chr(13) || chr(32)
    || chr(160) || chr(5760)
    || chr(8192) || '-' || chr(8202)
    || chr(8232) || chr(8233) || chr(8239) || chr(8287)
    || chr(12288) || chr(65279) || ']+',
  ' ',
  'g'
));

DROP FUNCTION extract_plain_text(jsonb, integer);

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
