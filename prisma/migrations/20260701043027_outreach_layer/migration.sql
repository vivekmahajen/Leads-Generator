-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "email_checked_at" TIMESTAMPTZ(6),
ADD COLUMN     "email_verified" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "sequences" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "from_name" VARCHAR(120) NOT NULL,
    "from_email" VARCHAR(255) NOT NULL,
    "footer_address" TEXT,
    "region" VARCHAR(10),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sequence_steps" (
    "id" UUID NOT NULL,
    "sequence_id" UUID NOT NULL,
    "step_order" INTEGER NOT NULL,
    "delay_hours" INTEGER NOT NULL DEFAULT 0,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,

    CONSTRAINT "sequence_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollments" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "sequence_id" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "current_step" INTEGER NOT NULL DEFAULT 0,
    "next_send_at" TIMESTAMPTZ(6),
    "claimed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outreach_messages" (
    "id" UUID NOT NULL,
    "enrollment_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "step_order" INTEGER NOT NULL,
    "provider_message_id" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'queued',
    "to_email" VARCHAR(255),
    "error" TEXT,
    "sent_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outreach_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppressions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "reason" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suppressions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sequences_user_id_idx" ON "sequences"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "sequence_steps_sequence_id_step_order_key" ON "sequence_steps"("sequence_id", "step_order");

-- CreateIndex
CREATE INDEX "enrollments_status_next_send_at_idx" ON "enrollments"("status", "next_send_at");

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_lead_id_sequence_id_key" ON "enrollments"("lead_id", "sequence_id");

-- CreateIndex
CREATE UNIQUE INDEX "outreach_messages_provider_message_id_key" ON "outreach_messages"("provider_message_id");

-- CreateIndex
CREATE INDEX "outreach_messages_user_id_sent_at_idx" ON "outreach_messages"("user_id", "sent_at");

-- CreateIndex
CREATE UNIQUE INDEX "suppressions_user_id_email_key" ON "suppressions"("user_id", "email");

-- AddForeignKey
ALTER TABLE "sequences" ADD CONSTRAINT "sequences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sequence_steps" ADD CONSTRAINT "sequence_steps_sequence_id_fkey" FOREIGN KEY ("sequence_id") REFERENCES "sequences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "lead_deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_sequence_id_fkey" FOREIGN KEY ("sequence_id") REFERENCES "sequences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreach_messages" ADD CONSTRAINT "outreach_messages_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppressions" ADD CONSTRAINT "suppressions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
