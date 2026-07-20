/*
  Warnings:

  - A unique constraint covering the columns `[userId,articleId]` on the table `Bookmark` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Bookmark_articleId_key";

-- CreateIndex
CREATE UNIQUE INDEX "Bookmark_userId_articleId_key" ON "Bookmark"("userId", "articleId");
