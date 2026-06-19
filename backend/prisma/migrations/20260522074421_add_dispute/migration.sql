-- CreateEnum
CREATE TYPE "dispute_status" AS ENUM ('open', 'resolved', 'rejected');

-- CreateTable
CREATE TABLE "dispute" (
    "id_dispute" SERIAL NOT NULL,
    "id_booking" INTEGER NOT NULL,
    "id_user" INTEGER,
    "reason" VARCHAR(1000) NOT NULL,
    "status" "dispute_status" NOT NULL DEFAULT 'open',
    "resolution" VARCHAR(1000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "dispute_pkey" PRIMARY KEY ("id_dispute")
);

-- CreateIndex
CREATE INDEX "dispute_id_booking_idx" ON "dispute"("id_booking");

-- AddForeignKey
ALTER TABLE "dispute" ADD CONSTRAINT "dispute_id_booking_fkey" FOREIGN KEY ("id_booking") REFERENCES "booking"("id_booking") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispute" ADD CONSTRAINT "dispute_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "user"("id_user") ON DELETE SET NULL ON UPDATE CASCADE;
