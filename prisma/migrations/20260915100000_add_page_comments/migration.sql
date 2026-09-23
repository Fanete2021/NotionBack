-- CreateTable
CREATE TABLE "page_comments" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "anchorId" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "page_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "page_comments_pageId_createdAt_idx" ON "page_comments"("pageId", "createdAt");

-- CreateIndex
CREATE INDEX "page_comments_pageId_anchorId_idx" ON "page_comments"("pageId", "anchorId");

-- CreateIndex
CREATE INDEX "page_comments_pageId_resolved_idx" ON "page_comments"("pageId", "resolved");

-- AddForeignKey
ALTER TABLE "page_comments" ADD CONSTRAINT "page_comments_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_comments" ADD CONSTRAINT "page_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_comments" ADD CONSTRAINT "page_comments_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
