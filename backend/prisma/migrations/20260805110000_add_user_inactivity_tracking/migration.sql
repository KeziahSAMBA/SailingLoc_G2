-- Suivi de l'inactivité : dernière connexion et relance avant suppression.
ALTER TABLE "user" ADD COLUMN "last_login_at" TIMESTAMP(3);
ALTER TABLE "user" ADD COLUMN "inactivity_notified_at" TIMESTAMP(3);
CREATE INDEX "user_last_login_at_idx" ON "user"("last_login_at");
