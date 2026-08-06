-- Désactivation volontaire du compte : à distinguer d'un blocage administrateur,
-- qui laisse cette colonne à null.
ALTER TABLE "user" ADD COLUMN "deactivated_at" TIMESTAMP(3);