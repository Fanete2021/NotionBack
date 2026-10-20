ALTER TABLE "pages" ADD COLUMN "updatedById" TEXT;

UPDATE "pages" SET "updatedById" = "authorId";

ALTER TABLE "pages" ALTER COLUMN "updatedById" SET NOT NULL;

ALTER TABLE "pages" ADD CONSTRAINT "pages_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
