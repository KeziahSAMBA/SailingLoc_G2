-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('admin', 'proprietaire', 'locataire');

-- CreateEnum
CREATE TYPE "booking_status" AS ENUM ('pending', 'confirmed', 'refused', 'cancelled');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('pending', 'success', 'failed', 'refunded');

-- CreateEnum
CREATE TYPE "document_status" AS ENUM ('pending', 'validated', 'refused');

-- CreateEnum
CREATE TYPE "review_status" AS ENUM ('pending', 'validated', 'refused');

-- CreateTable
CREATE TABLE "user" (
    "id_user" SERIAL NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "role" "user_role" NOT NULL DEFAULT 'locataire',
    "phone" VARCHAR(20),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "reset_token" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "user_pkey" PRIMARY KEY ("id_user")
);

-- CreateTable
CREATE TABLE "port" (
    "id_port" SERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "country" VARCHAR(100) NOT NULL,
    "latitude" DECIMAL(65,30),
    "longitude" DECIMAL(65,30),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "port_pkey" PRIMARY KEY ("id_port")
);

-- CreateTable
CREATE TABLE "boat" (
    "id_boat" SERIAL NOT NULL,
    "id_user" INTEGER NOT NULL,
    "id_port" INTEGER NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "size" DECIMAL(65,30) NOT NULL,
    "engine" VARCHAR(100),
    "with_skipper" BOOLEAN NOT NULL DEFAULT false,
    "daily_price" DECIMAL(65,30) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "build_year" INTEGER,
    "registration" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "boat_pkey" PRIMARY KEY ("id_boat")
);

-- CreateTable
CREATE TABLE "booking" (
    "id_booking" SERIAL NOT NULL,
    "id_user" INTEGER NOT NULL,
    "id_boat" INTEGER NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" "booking_status" NOT NULL DEFAULT 'pending',
    "total_amount" DECIMAL(65,30) NOT NULL,
    "booking_date" TIMESTAMP(3) NOT NULL,
    "cancellation_reason" TEXT,
    "cancellation_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "booking_pkey" PRIMARY KEY ("id_booking")
);

-- CreateTable
CREATE TABLE "payment" (
    "id_payment" SERIAL NOT NULL,
    "id_booking" INTEGER NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "commission" DECIMAL(65,30) NOT NULL,
    "payment_date" TIMESTAMP(3) NOT NULL,
    "payment_method" VARCHAR(50) NOT NULL,
    "status" "payment_status" NOT NULL DEFAULT 'pending',
    "transaction_ref" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_pkey" PRIMARY KEY ("id_payment")
);

-- CreateTable
CREATE TABLE "document" (
    "id_document" SERIAL NOT NULL,
    "id_user" INTEGER NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_url" VARCHAR(500) NOT NULL,
    "upload_date" TIMESTAMP(3) NOT NULL,
    "status" "document_status" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "document_pkey" PRIMARY KEY ("id_document")
);

-- CreateTable
CREATE TABLE "message" (
    "id_message" SERIAL NOT NULL,
    "id_sender" INTEGER NOT NULL,
    "id_receiver" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "message_pkey" PRIMARY KEY ("id_message")
);

-- CreateTable
CREATE TABLE "review" (
    "id_review" SERIAL NOT NULL,
    "id_user" INTEGER NOT NULL,
    "id_booking" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "status" "review_status" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "review_pkey" PRIMARY KEY ("id_review")
);

-- CreateTable
CREATE TABLE "image" (
    "id_image" SERIAL NOT NULL,
    "id_boat" INTEGER,
    "id_user" INTEGER,
    "url" VARCHAR(500) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "image_pkey" PRIMARY KEY ("id_image")
);

-- CreateTable
CREATE TABLE "user_boat_favorite" (
    "id_favorite" SERIAL NOT NULL,
    "id_user" INTEGER NOT NULL,
    "id_boat" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_boat_favorite_pkey" PRIMARY KEY ("id_favorite")
);

-- CreateTable
CREATE TABLE "booking_document" (
    "id_booking_doc" SERIAL NOT NULL,
    "id_booking" INTEGER NOT NULL,
    "id_document" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_document_pkey" PRIMARY KEY ("id_booking_doc")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "port_name_key" ON "port"("name");

-- CreateIndex
CREATE INDEX "boat_id_user_idx" ON "boat"("id_user");

-- CreateIndex
CREATE INDEX "boat_id_port_idx" ON "boat"("id_port");

-- CreateIndex
CREATE UNIQUE INDEX "boat_registration_key" ON "boat"("registration");

-- CreateIndex
CREATE INDEX "booking_id_user_idx" ON "booking"("id_user");

-- CreateIndex
CREATE INDEX "booking_id_boat_idx" ON "booking"("id_boat");

-- CreateIndex
CREATE INDEX "booking_status_idx" ON "booking"("status");

-- CreateIndex
CREATE INDEX "payment_id_booking_idx" ON "payment"("id_booking");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transaction_ref_key" ON "payment"("transaction_ref");

-- CreateIndex
CREATE INDEX "message_id_sender_idx" ON "message"("id_sender");

-- CreateIndex
CREATE INDEX "message_id_receiver_idx" ON "message"("id_receiver");

-- CreateIndex
CREATE INDEX "review_id_booking_idx" ON "review"("id_booking");

-- CreateIndex
CREATE UNIQUE INDEX "user_boat_favorite_id_user_id_boat_key" ON "user_boat_favorite"("id_user", "id_boat");

-- CreateIndex
CREATE UNIQUE INDEX "booking_document_id_booking_id_document_key" ON "booking_document"("id_booking", "id_document");

-- AddForeignKey
ALTER TABLE "boat" ADD CONSTRAINT "boat_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "user"("id_user") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boat" ADD CONSTRAINT "boat_id_port_fkey" FOREIGN KEY ("id_port") REFERENCES "port"("id_port") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "user"("id_user") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_id_boat_fkey" FOREIGN KEY ("id_boat") REFERENCES "boat"("id_boat") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_id_booking_fkey" FOREIGN KEY ("id_booking") REFERENCES "booking"("id_booking") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "document_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "user"("id_user") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_id_sender_fkey" FOREIGN KEY ("id_sender") REFERENCES "user"("id_user") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_id_receiver_fkey" FOREIGN KEY ("id_receiver") REFERENCES "user"("id_user") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "user"("id_user") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_id_booking_fkey" FOREIGN KEY ("id_booking") REFERENCES "booking"("id_booking") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "image" ADD CONSTRAINT "image_id_boat_fkey" FOREIGN KEY ("id_boat") REFERENCES "boat"("id_boat") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "image" ADD CONSTRAINT "image_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "user"("id_user") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_boat_favorite" ADD CONSTRAINT "user_boat_favorite_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "user"("id_user") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_boat_favorite" ADD CONSTRAINT "user_boat_favorite_id_boat_fkey" FOREIGN KEY ("id_boat") REFERENCES "boat"("id_boat") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_document" ADD CONSTRAINT "booking_document_id_booking_fkey" FOREIGN KEY ("id_booking") REFERENCES "booking"("id_booking") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_document" ADD CONSTRAINT "booking_document_id_document_fkey" FOREIGN KEY ("id_document") REFERENCES "document"("id_document") ON DELETE RESTRICT ON UPDATE CASCADE;

