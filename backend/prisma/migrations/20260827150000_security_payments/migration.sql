-- Empêche deux tentatives de paiement actives pour la même réservation.
-- Les écritures historiques concurrentes sont conservées, mais seule la plus
-- récente reste actionnable ; les doublons sont neutralisés avant l'index.
WITH ranked AS (
  SELECT
    id_payment,
    ROW_NUMBER() OVER (PARTITION BY id_booking ORDER BY id_payment DESC) AS rn
  FROM "payment"
  WHERE status IN ('pending', 'success')
)
UPDATE "payment" AS p
SET status = 'failed'
FROM ranked AS r
WHERE p.id_payment = r.id_payment
  AND r.rn > 1;

ALTER TABLE "payment"
  ADD COLUMN "idempotency_key" VARCHAR(255),
  ADD COLUMN "attempt" INTEGER NOT NULL DEFAULT 1;

CREATE UNIQUE INDEX "payment_idempotency_key_key"
  ON "payment"("idempotency_key");
CREATE UNIQUE INDEX "payment_one_active_per_booking_key"
  ON "payment"("id_booking")
  WHERE status IN ('pending', 'success');

-- Un montant remboursé est toujours exprimé dans la devise du paiement et ne
-- peut jamais dépasser le débit réel. Les paiements pending libérés côté
-- Stripe gardent refunded_amount à NULL.
ALTER TABLE "payment"
  ADD CONSTRAINT "payment_amount_nonnegative_check" CHECK ("amount" >= 0),
  ADD CONSTRAINT "payment_commission_nonnegative_check" CHECK ("commission" >= 0),
  ADD CONSTRAINT "payment_refunded_amount_valid_check"
    CHECK ("refunded_amount" IS NULL OR ("refunded_amount" >= 0 AND "refunded_amount" <= "amount"));

-- Les contrôles applicatifs « aucun litige ouvert » sont soumis aux courses
-- entre deux workers ; cette contrainte rend la règle vraie au niveau SQL.
CREATE UNIQUE INDEX "dispute_one_open_per_booking_key"
  ON "dispute"("id_booking")
  WHERE status = 'open';

-- Déduplication durable des livraisons Stripe. Le statut est volontairement
-- textuel pour permettre de reprendre un événement en erreur sans migration
-- d'enum ; l'identifiant Stripe reste la contrainte d'unicité forte.
CREATE TABLE "stripe_webhook_event" (
  "id_event" SERIAL NOT NULL,
  "event_id" VARCHAR(255) NOT NULL,
  "event_type" VARCHAR(100) NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'processing',
  "payload_hash" VARCHAR(128),
  "error" VARCHAR(500),
  "processed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3),

  CONSTRAINT "stripe_webhook_event_pkey" PRIMARY KEY ("id_event")
);

CREATE UNIQUE INDEX "stripe_webhook_event_event_id_key"
  ON "stripe_webhook_event"("event_id");
CREATE INDEX "stripe_webhook_event_status_created_at_idx"
  ON "stripe_webhook_event"("status", "created_at");
CREATE INDEX "stripe_webhook_event_created_at_idx"
  ON "stripe_webhook_event"("created_at");
