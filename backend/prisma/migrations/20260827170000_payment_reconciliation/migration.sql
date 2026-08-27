-- Keep provider/database disagreements durable and retryable.  The public
-- payment status remains unchanged until Stripe confirms the operation.
ALTER TABLE "payment"
  ADD COLUMN "reconciliation_error" VARCHAR(500),
  ADD COLUMN "reconciliation_at" TIMESTAMP(3);

CREATE INDEX "payment_reconciliation_state_idx"
  ON "payment"("payment_state", "reconciliation_at");
