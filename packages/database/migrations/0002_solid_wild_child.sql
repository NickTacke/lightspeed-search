CREATE TABLE "shops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lightspeed_id" text NOT NULL,
	"domain" text NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"language" text DEFAULT 'en' NOT NULL,
	"cluster" text DEFAULT 'eu1' NOT NULL,
	"install_token" text,
	"user_secret" text,
	"api_key" text,
	"api_secret" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user_shops" (
	"user_id" text NOT NULL,
	"shop_id" uuid NOT NULL,
	"role" text DEFAULT 'owner' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_shops_user_id_shop_id_pk" PRIMARY KEY("user_id","shop_id")
);
--> statement-breakpoint
CREATE TABLE "widget_domains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"domain" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_shops" ADD CONSTRAINT "user_shops_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_shops" ADD CONSTRAINT "user_shops_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "widget_domains" ADD CONSTRAINT "widget_domains_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "shops_lightspeed_id_uq" ON "shops" USING btree ("lightspeed_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shops_domain_uq" ON "shops" USING btree ("domain");--> statement-breakpoint
CREATE UNIQUE INDEX "widget_domains_domain_uq" ON "widget_domains" USING btree ("domain");