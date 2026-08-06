-- Relance envoyée avant la fermeture d'un compte en pause : remise à null par
-- la réactivation, comme inactivity_notified_at l'est par une reconnexion.
ALTER TABLE "user" ADD COLUMN "pause_notified_at" TIMESTAMP(3);