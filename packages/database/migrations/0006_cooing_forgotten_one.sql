CREATE TABLE "search_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"enabled_fields" text[] DEFAULT '{"title","tags","brand","description"}' NOT NULL,
	"field_weights" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"semantic_threshold" integer DEFAULT 3 NOT NULL,
	"result_limit" integer DEFAULT 20 NOT NULL,
	"semantic_enabled" boolean DEFAULT true NOT NULL,
	"exact_match_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "widget_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"widget_enabled" boolean DEFAULT true NOT NULL,
	"accent_color" text,
	"border_radius" integer,
	"dark_mode" boolean,
	"visible_fields" text[] DEFAULT '{"image","brand","title","price","salePrice","categoryTag"}' NOT NULL,
	"max_dropdown_results" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "search_configs" ADD CONSTRAINT "search_configs_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "widget_configs" ADD CONSTRAINT "widget_configs_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "search_configs_shop_uq" ON "search_configs" USING btree ("shop_id");--> statement-breakpoint
CREATE UNIQUE INDEX "widget_configs_shop_uq" ON "widget_configs" USING btree ("shop_id");