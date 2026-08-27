-- Persist the provider lifecycle independently from the public payment
-- status. This lets a retry distinguish a PaymentIntent creation/capture
-- that was interrupted from a payment that is simply awaiting the card.
ALTER TABLE "payment"
  ADD COLUMN "payment_state" VARCHAR(40) NOT NULL DEFAULT 'legacy';

UPDATE "payment"
SET "payment_state" = CASE
  WHEN "status" = 'pending' AND "transaction_ref" IS NULL THEN 'legacy_pending'
  WHEN "status" = 'pending' THEN 'requires_capture'
  WHEN "status" = 'success' THEN 'succeeded'
  WHEN "status" = 'refunded' THEN 'refunded'
  WHEN "status" = 'failed' THEN 'failed'
  ELSE 'legacy'
END;

CREATE INDEX "payment_payment_state_idx"
  ON "payment"("payment_state");
