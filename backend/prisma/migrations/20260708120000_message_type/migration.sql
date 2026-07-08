-- Type de message : 'text' (normal), 'support_welcome' (accueil automatique du
-- support), 'support_resolved' (demande marquée comme traitée par l'admin).
ALTER TABLE "message" ADD COLUMN "type" VARCHAR(30) NOT NULL DEFAULT 'text';
