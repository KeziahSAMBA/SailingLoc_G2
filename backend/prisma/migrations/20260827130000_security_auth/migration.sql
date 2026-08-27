-- Les jetons de confirmation sont désormais des empreintes SHA-256 et
-- disposent d'une échéance. Les valeurs éventuellement stockées en clair
-- dans une base antérieure sont invalidées : l'utilisateur peut demander un
-- nouveau lien via /resend-verification.
ALTER TABLE "user"
  ADD COLUMN "email_verification_token_expires_at" TIMESTAMP(3),
  ADD COLUMN "auth_version" INTEGER NOT NULL DEFAULT 0;

UPDATE "user"
SET "email_verification_token" = NULL,
    "email_verification_token_expires_at" = NULL
WHERE "email_verification_token" IS NOT NULL;
