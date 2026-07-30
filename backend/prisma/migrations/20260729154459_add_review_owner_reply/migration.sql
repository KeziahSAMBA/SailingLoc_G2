-- AlterTable
ALTER TABLE "review" ADD COLUMN     "owner_reply" TEXT,
ADD COLUMN     "owner_reply_at" TIMESTAMP(3);
