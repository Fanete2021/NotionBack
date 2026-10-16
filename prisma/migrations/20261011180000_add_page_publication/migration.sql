-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'HIDDEN');

-- AlterTable
ALTER TABLE "pages" ADD COLUMN "slug" TEXT,
ADD COLUMN "seoTitle" TEXT,
ADD COLUMN "seoDescription" TEXT,
ADD COLUMN "publicationStatus" "PublicationStatus",
ADD COLUMN "publishedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "pages_slug_key" ON "pages"("slug");

-- CreateIndex
CREATE INDEX "pages_publicationStatus_publishedAt_id_idx" ON "pages"("publicationStatus", "publishedAt", "id");
