-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "notifiedDaysBefore" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
