-- AlterTable
ALTER TABLE "pages" ADD COLUMN "deletedBy" TEXT;

-- AddForeignKey
ALTER TABLE "pages" ADD CONSTRAINT "pages_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
