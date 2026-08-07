CREATE TYPE "invoice_kind" AS ENUM ('rental', 'commission');

CREATE TABLE "invoice" (
    "id_invoice" SERIAL NOT NULL,
    "id_booking" INTEGER NOT NULL,
    "kind" "invoice_kind" NOT NULL,
    "series" VARCHAR(8) NOT NULL,
    "year" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL,
    "number" VARCHAR(32) NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL,
    "total_amount" DECIMAL(65,30) NOT NULL,
    "commission" DECIMAL(65,30) NOT NULL,
    "net_amount" DECIMAL(65,30) NOT NULL,
    "vat_rate" DECIMAL(65,30) NOT NULL,
    "vat_amount" DECIMAL(65,30) NOT NULL,
    "issuer_name" VARCHAR(255) NOT NULL,
    "issuer_address" VARCHAR(500) NOT NULL,
    "issuer_legal" VARCHAR(500) NOT NULL,
    "issuer_vat" VARCHAR(64),
    "customer_name" VARCHAR(255) NOT NULL,
    "customer_email" VARCHAR(255) NOT NULL,
    "customer_address" VARCHAR(500),
    "boat_name" VARCHAR(255) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "nights" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_pkey" PRIMARY KEY ("id_invoice")
);

CREATE UNIQUE INDEX "invoice_number_key" ON "invoice"("number");
CREATE UNIQUE INDEX "invoice_id_booking_kind_key" ON "invoice"("id_booking", "kind");
CREATE UNIQUE INDEX "invoice_series_year_sequence_key" ON "invoice"("series", "year", "sequence");
CREATE INDEX "invoice_id_booking_idx" ON "invoice"("id_booking");

ALTER TABLE "invoice" ADD CONSTRAINT "invoice_id_booking_fkey"
    FOREIGN KEY ("id_booking") REFERENCES "booking"("id_booking")
    ON DELETE RESTRICT ON UPDATE CASCADE;
