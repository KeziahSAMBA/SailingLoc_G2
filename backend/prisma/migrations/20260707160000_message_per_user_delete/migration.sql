-- Suppression « pour moi » : chaque côté d'un message peut le masquer chez lui
-- (deleted_at reste la suppression « pour tout le monde », par l'expéditeur).
ALTER TABLE "message" ADD COLUMN "sender_deleted_at" TIMESTAMP(3);
ALTER TABLE "message" ADD COLUMN "receiver_deleted_at" TIMESTAMP(3);
