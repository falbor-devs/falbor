ALTER TABLE "demand_capture_opportunities" ADD COLUMN IF NOT EXISTS "product_relevance" real;
ALTER TABLE "demand_capture_opportunities" ADD COLUMN IF NOT EXISTS "confidence" real;
ALTER TABLE "demand_capture_opportunities" ADD COLUMN IF NOT EXISTS "scoring_method" varchar(64);
