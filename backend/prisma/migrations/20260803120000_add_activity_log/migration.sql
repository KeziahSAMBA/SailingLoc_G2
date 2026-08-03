-- CreateTable
CREATE TABLE "activity_log" (
    "id_log" SERIAL NOT NULL,
    "level" VARCHAR(10) NOT NULL DEFAULT 'info',
    "category" VARCHAR(50) NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "message" VARCHAR(500),
    "actor_id" INTEGER,
    "actor_email" VARCHAR(255),
    "target_type" VARCHAR(50),
    "target_id" VARCHAR(50),
    "meta" JSONB,
    "ip" VARCHAR(64),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_log_pkey" PRIMARY KEY ("id_log")
);

-- CreateIndex
CREATE INDEX "activity_log_created_at_idx" ON "activity_log"("created_at");

-- CreateIndex
CREATE INDEX "activity_log_category_created_at_idx" ON "activity_log"("category", "created_at");

-- CreateIndex
CREATE INDEX "activity_log_actor_id_idx" ON "activity_log"("actor_id");

-- AddForeignKey
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "user"("id_user") ON DELETE SET NULL ON UPDATE CASCADE;

