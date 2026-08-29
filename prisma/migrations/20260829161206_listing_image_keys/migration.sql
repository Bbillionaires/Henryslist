/*
  Warnings:

  - Added the required column `key` to the `ListingImage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `thumbnailKey` to the `ListingImage` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ListingImage" ADD COLUMN     "key" TEXT NOT NULL,
ADD COLUMN     "thumbnailKey" TEXT NOT NULL;
