-- Brouillons d'annonce : ces colonnes peuvent rester vides tant que l'annonce
-- n'est pas soumise pour validation (la soumission les exige toujours).
ALTER TABLE "boat" ALTER COLUMN "id_port" DROP NOT NULL;
ALTER TABLE "boat" ALTER COLUMN "size" DROP NOT NULL;
ALTER TABLE "boat" ALTER COLUMN "daily_price" DROP NOT NULL;
ALTER TABLE "boat" ALTER COLUMN "capacity" DROP NOT NULL;
ALTER TABLE "boat" ALTER COLUMN "registration" DROP NOT NULL;