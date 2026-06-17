-- CreateTable
CREATE TABLE "raw_contacts" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "source_platform" VARCHAR(20) NOT NULL,
    "source_type" VARCHAR(40) NOT NULL,
    "full_name" VARCHAR(150),
    "first_name" VARCHAR(80),
    "last_name" VARCHAR(80),
    "profile_url" VARCHAR(500),
    "username" VARCHAR(100),
    "headline" TEXT,
    "company_name" VARCHAR(150),
    "company_domain" VARCHAR(200),
    "job_title" VARCHAR(150),
    "city" VARCHAR(80),
    "state" VARCHAR(80),
    "country" VARCHAR(80),
    "source_post_url" VARCHAR(500),
    "source_keyword" VARCHAR(200),
    "source_tweet_text" TEXT,
    "email" VARCHAR(255),
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_source" VARCHAR(30),
    "phone" VARCHAR(30),
    "linkedin_url" VARCHAR(500),
    "twitter_url" VARCHAR(500),
    "enrichment_status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "intent_score" INTEGER NOT NULL DEFAULT 0,
    "category_id" VARCHAR(50),
    "scraped_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enriched_at" TIMESTAMPTZ(6),
    "promoted_to_lead" BOOLEAN NOT NULL DEFAULT false,
    "promoted_at" TIMESTAMPTZ(6),

    CONSTRAINT "raw_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scrape_jobs" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "job_type" VARCHAR(40) NOT NULL,
    "platform" VARCHAR(20) NOT NULL,
    "parameters" JSONB,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "contacts_found" INTEGER NOT NULL DEFAULT 0,
    "contacts_new" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scrape_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_searches" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "platform" VARCHAR(20) NOT NULL,
    "search_query" VARCHAR(500) NOT NULL,
    "category_id" VARCHAR(50),
    "label" VARCHAR(100),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "run_frequency" VARCHAR(20) NOT NULL DEFAULT 'daily',
    "last_run_at" TIMESTAMPTZ(6),
    "last_since_id" VARCHAR(40),
    "total_leads" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_searches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrichment_log" (
    "id" UUID NOT NULL,
    "service" VARCHAR(20) NOT NULL,
    "credits_used" INTEGER NOT NULL DEFAULT 0,
    "credits_limit" INTEGER,
    "period_start" DATE,
    "contact_id" UUID,
    "result" VARCHAR(20),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enrichment_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "raw_contacts_enrichment_status_idx" ON "raw_contacts"("enrichment_status");

-- CreateIndex
CREATE INDEX "raw_contacts_category_id_idx" ON "raw_contacts"("category_id");

-- CreateIndex
CREATE INDEX "raw_contacts_intent_score_idx" ON "raw_contacts"("intent_score" DESC);

-- CreateIndex
CREATE INDEX "raw_contacts_source_platform_idx" ON "raw_contacts"("source_platform");

-- CreateIndex
CREATE INDEX "raw_contacts_user_id_idx" ON "raw_contacts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "raw_contacts_source_platform_profile_url_key" ON "raw_contacts"("source_platform", "profile_url");

-- CreateIndex
CREATE INDEX "enrichment_log_service_created_at_idx" ON "enrichment_log"("service", "created_at");

-- AddForeignKey
ALTER TABLE "raw_contacts" ADD CONSTRAINT "raw_contacts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scrape_jobs" ADD CONSTRAINT "scrape_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrichment_log" ADD CONSTRAINT "enrichment_log_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "raw_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
