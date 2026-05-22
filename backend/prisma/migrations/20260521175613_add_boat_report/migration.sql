-- CreateEnum
CREATE TYPE "report_status" AS ENUM ('pending', 'resolved', 'dismissed');

-- CreateTable
CREATE TABLE "boat_report" (
    "id_report" SERIAL NOT NULL,
    "id_boat" INTEGER NOT NULL,
    "id_user" INTEGER,
    "reason" VARCHAR(500) NOT NULL,
    "status" "report_status" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "boat_report_pkey" PRIMARY KEY ("id_report")
);

-- CreateIndex
CREATE INDEX "boat_report_id_boat_idx" ON "boat_report"("id_boat");

-- AddForeignKey
ALTER TABLE "boat_report" ADD CONSTRAINT "boat_report_id_boat_fkey" FOREIGN KEY ("id_boat") REFERENCES "boat"("id_boat") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boat_report" ADD CONSTRAINT "boat_report_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "user"("id_user") ON DELETE SET NULL ON UPDATE CASCADE;
