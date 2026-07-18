-- DropForeignKey
ALTER TABLE "boat" DROP CONSTRAINT "boat_id_port_fkey";

-- AlterTable
ALTER TABLE "image" ADD COLUMN     "id_dispute" INTEGER;

-- AddForeignKey
ALTER TABLE "boat" ADD CONSTRAINT "boat_id_port_fkey" FOREIGN KEY ("id_port") REFERENCES "port"("id_port") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "image" ADD CONSTRAINT "image_id_dispute_fkey" FOREIGN KEY ("id_dispute") REFERENCES "dispute"("id_dispute") ON DELETE SET NULL ON UPDATE CASCADE;
