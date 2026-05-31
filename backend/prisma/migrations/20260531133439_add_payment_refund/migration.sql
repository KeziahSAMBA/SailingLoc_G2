-- AlterTable
ALTER TABLE "payment" ADD COLUMN     "id_dispute" INTEGER,
ADD COLUMN     "refund_reason" VARCHAR(500),
ADD COLUMN     "refunded_amount" DECIMAL(65,30),
ADD COLUMN     "refunded_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "payment_id_dispute_idx" ON "payment"("id_dispute");

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_id_dispute_fkey" FOREIGN KEY ("id_dispute") REFERENCES "dispute"("id_dispute") ON DELETE SET NULL ON UPDATE CASCADE;
