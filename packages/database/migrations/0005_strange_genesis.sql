CREATE TABLE "sync_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"status" text DEFAULT 'syncing' NOT NULL,
	"trigger" text DEFAULT 'cron' NOT NULL,
	"products_total" integer DEFAULT 0 NOT NULL,
	"products_added" integer DEFAULT 0 NOT NULL,
	"products_updated" integer DEFAULT 0 NOT NULL,
	"products_failed" integer DEFAULT 0 NOT NULL,
	"categories_total" integer DEFAULT 0 NOT NULL,
	"embeddings_generated" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "sync_logs" ADD CONSTRAINT "sync_logs_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sync_logs_shop_idx" ON "sync_logs" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "sync_logs_shop_status_idx" ON "sync_logs" USING btree ("shop_id","status");