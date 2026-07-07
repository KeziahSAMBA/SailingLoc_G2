-- Documents rattachés à un bateau (ex. carte grise déposée avec l'annonce).
ALTER TABLE "document" ADD COLUMN "id_boat" INTEGER;
ALTER TABLE "document" ADD CONSTRAINT "document_id_boat_fkey" FOREIGN KEY ("id_boat") REFERENCES "boat"("id_boat") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "document_id_boat_idx" ON "document"("id_boat");
