-- Demandes du formulaire public de contact, suivies par l'admin.
CREATE TABLE "contact_request" (
    "id_request" SERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "subject" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'new',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    CONSTRAINT "contact_request_pkey" PRIMARY KEY ("id_request")
);
CREATE INDEX "contact_request_status_idx" ON "contact_request"("status");
