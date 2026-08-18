/*
  Warnings:

  - You are about to drop the column `coverUrl` on the `pages` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "pages_position_unique";

-- DropIndex
DROP INDEX "projects_position_unique";

-- AlterTable
ALTER TABLE "pages" DROP COLUMN "coverUrl";
