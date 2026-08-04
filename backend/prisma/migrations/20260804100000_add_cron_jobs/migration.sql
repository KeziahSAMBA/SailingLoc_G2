-- CreateTable
CREATE TABLE "cron_job" (
    "id_job" SERIAL NOT NULL,
    "key" VARCHAR(50) NOT NULL,
    "schedule" VARCHAR(50) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "dry_run" BOOLEAN NOT NULL DEFAULT true,
    "params" JSONB,
    "last_run_at" TIMESTAMP(3),
    "last_status" VARCHAR(20),
    "next_run_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "cron_job_pkey" PRIMARY KEY ("id_job")
);

-- CreateTable
CREATE TABLE "cron_run" (
    "id_run" SERIAL NOT NULL,
    "id_job" INTEGER NOT NULL,
    "trigger" VARCHAR(20) NOT NULL DEFAULT 'schedule',
    "status" VARCHAR(20) NOT NULL DEFAULT 'running',
    "dry_run" BOOLEAN NOT NULL DEFAULT false,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "duration_ms" INTEGER,
    "affected" INTEGER NOT NULL DEFAULT 0,
    "result" JSONB,
    "error" VARCHAR(1000),
    "actor_id" INTEGER,
    "actor_email" VARCHAR(255),

    CONSTRAINT "cron_run_pkey" PRIMARY KEY ("id_run")
);

-- CreateIndex
CREATE UNIQUE INDEX "cron_job_key_key" ON "cron_job"("key");

-- CreateIndex
CREATE INDEX "cron_run_id_job_started_at_idx" ON "cron_run"("id_job", "started_at");

-- CreateIndex
CREATE INDEX "cron_run_status_idx" ON "cron_run"("status");

-- CreateIndex
CREATE INDEX "cron_run_started_at_idx" ON "cron_run"("started_at");

-- AddForeignKey
ALTER TABLE "cron_run" ADD CONSTRAINT "cron_run_id_job_fkey" FOREIGN KEY ("id_job") REFERENCES "cron_job"("id_job") ON DELETE CASCADE ON UPDATE CASCADE;