-- CreateEnum
CREATE TYPE "boat_status" AS ENUM ('draft', 'pending', 'published', 'refused');

-- AlterTable
ALTER TABLE "boat" ADD COLUMN "status" "boat_status" NOT NULL DEFAULT 'draft';

-- Reprise de l'existant : annonce en ligne → publiée, sinon en attente de validation
UPDATE "boat" SET "status" = CASE WHEN "is_published" THEN 'published'::"boat_status" ELSE 'pending'::"boat_status" END;