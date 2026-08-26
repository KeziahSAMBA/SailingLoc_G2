-- Anonymisation RGPD : horodatage du traitement, sert aussi de preuve d'exécution.
ALTER TABLE "user" ADD COLUMN "anonymized_at" TIMESTAMP(3);
