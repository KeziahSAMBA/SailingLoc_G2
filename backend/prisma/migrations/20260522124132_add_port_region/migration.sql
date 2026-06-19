-- AlterTable
ALTER TABLE "port" ADD COLUMN     "department" VARCHAR(3),
ADD COLUMN     "region" VARCHAR(100);

-- Rétroremplissage des ports existants (créés avant l'ajout de region/department).
UPDATE "port" SET "department" = '06', "region" = 'Provence-Alpes-Côte d''Azur' WHERE "name" = 'Port Vieux';
UPDATE "port" SET "department" = '13', "region" = 'Provence-Alpes-Côte d''Azur' WHERE "name" = 'Port de la Joliette';
UPDATE "port" SET "department" = '17', "region" = 'Nouvelle-Aquitaine'          WHERE "name" = 'Port des Minimes';
UPDATE "port" SET "department" = '64', "region" = 'Nouvelle-Aquitaine'          WHERE "name" = 'Port de Socoa';
UPDATE "port" SET "department" = '30', "region" = 'Occitanie'                   WHERE "name" = 'Port Camargue';
UPDATE "port" SET "department" = '06', "region" = 'Provence-Alpes-Côte d''Azur' WHERE "name" = 'Port de Cannes';
UPDATE "port" SET "department" = '83', "region" = 'Provence-Alpes-Côte d''Azur' WHERE "name" = 'Port de Saint-Tropez';
UPDATE "port" SET "department" = '29', "region" = 'Bretagne'                    WHERE "name" = 'Port de Brest';
