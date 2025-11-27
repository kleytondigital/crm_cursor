-- AlterEnum
ALTER TYPE "ContentType" ADD VALUE 'LOCATION';

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;
