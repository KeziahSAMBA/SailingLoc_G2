-- CreateTable
CREATE TABLE "boat_availability" (
    "id_availability" SERIAL NOT NULL,
    "id_boat" INTEGER NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "price_override" DECIMAL(65,30),
    "notes" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "boat_availability_pkey" PRIMARY KEY ("id_availability")
);

-- CreateTable
CREATE TABLE "boat_equipment" (
    "id_equipment" SERIAL NOT NULL,
    "id_boat" INTEGER NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "boat_equipment_pkey" PRIMARY KEY ("id_equipment")
);

-- CreateIndex
CREATE INDEX "boat_availability_id_boat_idx" ON "boat_availability"("id_boat");

-- CreateIndex
CREATE INDEX "boat_equipment_id_boat_idx" ON "boat_equipment"("id_boat");

-- AddForeignKey
ALTER TABLE "boat_availability" ADD CONSTRAINT "boat_availability_id_boat_fkey" FOREIGN KEY ("id_boat") REFERENCES "boat"("id_boat") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boat_equipment" ADD CONSTRAINT "boat_equipment_id_boat_fkey" FOREIGN KEY ("id_boat") REFERENCES "boat"("id_boat") ON DELETE RESTRICT ON UPDATE CASCADE;
