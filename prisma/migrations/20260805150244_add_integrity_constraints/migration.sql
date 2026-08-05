/*
  Warnings:

  - The values [MEMBER] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[id,workspaceId]` on the table `pages` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id,workspaceId]` on the table `projects` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('OWNER', 'ADMIN', 'EDITOR', 'VIEWER');
ALTER TABLE "public"."workspace_members" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "workspace_members" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "public"."Role_old";
ALTER TABLE "workspace_members" ALTER COLUMN "role" SET DEFAULT 'EDITOR';
COMMIT;

-- DropForeignKey
ALTER TABLE "pages" DROP CONSTRAINT "pages_parentPageId_fkey";

-- DropForeignKey
ALTER TABLE "pages" DROP CONSTRAINT "pages_projectId_fkey";

-- DropForeignKey
ALTER TABLE "projects" DROP CONSTRAINT "projects_parentProjectId_fkey";

-- AlterTable
ALTER TABLE "workspace_members" ALTER COLUMN "role" SET DEFAULT 'EDITOR';

-- CreateIndex
CREATE UNIQUE INDEX "pages_id_workspaceId_key" ON "pages"("id", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "projects_id_workspaceId_key" ON "projects"("id", "workspaceId");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_parentProjectId_workspaceId_fkey" FOREIGN KEY ("parentProjectId", "workspaceId") REFERENCES "projects"("id", "workspaceId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pages" ADD CONSTRAINT "pages_projectId_workspaceId_fkey" FOREIGN KEY ("projectId", "workspaceId") REFERENCES "projects"("id", "workspaceId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pages" ADD CONSTRAINT "pages_parentPageId_workspaceId_fkey" FOREIGN KEY ("parentPageId", "workspaceId") REFERENCES "pages"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;
