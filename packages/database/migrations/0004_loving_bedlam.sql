CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"lightspeed_id" text NOT NULL,
	"title" text NOT NULL,
	"handle" text,
	"description" text,
	"image" text,
	"visible" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"parent_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "product_categories" (
	"product_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	CONSTRAINT "product_categories_product_id_category_id_pk" PRIMARY KEY("product_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"lightspeed_id" text NOT NULL,
	"title" text NOT NULL,
	"fulltitle" text,
	"description" text,
	"full_description" text,
	"brand" text,
	"handle" text,
	"image" text,
	"price" numeric,
	"compare_at_price" numeric,
	"sku" text,
	"ean" text,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"lightspeed_id" text NOT NULL,
	"title" text NOT NULL,
	"price_incl" numeric,
	"price_excl" numeric,
	"old_price_incl" numeric,
	"old_price_excl" numeric,
	"sku" text,
	"ean" text,
	"article_code" text,
	"stock_level" integer DEFAULT 0 NOT NULL,
	"stock_tracking" text DEFAULT 'disabled' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "product_embeddings" (
	"product_id" uuid PRIMARY KEY NOT NULL,
	"shop_id" uuid NOT NULL,
	"embedding" vector(1536),
	"search_vector" "tsvector",
	"search_text" text,
	"embedding_hash" text,
	"generated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variants" ADD CONSTRAINT "variants_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variants" ADD CONSTRAINT "variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_embeddings" ADD CONSTRAINT "product_embeddings_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_embeddings" ADD CONSTRAINT "product_embeddings_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_shop_ls_uq" ON "categories" USING btree ("shop_id","lightspeed_id");--> statement-breakpoint
CREATE INDEX "categories_shop_active_idx" ON "categories" USING btree ("shop_id","deleted_at");--> statement-breakpoint
CREATE INDEX "categories_parent_idx" ON "categories" USING btree ("parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "products_shop_ls_uq" ON "products" USING btree ("shop_id","lightspeed_id");--> statement-breakpoint
CREATE INDEX "products_shop_active_idx" ON "products" USING btree ("shop_id","deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "variants_shop_ls_uq" ON "variants" USING btree ("shop_id","lightspeed_id");--> statement-breakpoint
CREATE INDEX "variants_product_idx" ON "variants" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "variants_shop_article_idx" ON "variants" USING btree ("shop_id","article_code");--> statement-breakpoint
CREATE INDEX "product_embeddings_search_vector_idx" ON "product_embeddings" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "product_embeddings_shop_idx" ON "product_embeddings" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS product_embeddings_embedding_idx
ON product_embeddings USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);--> statement-breakpoint
CREATE TRIGGER product_embeddings_search_vector_trg
BEFORE INSERT OR UPDATE ON product_embeddings
FOR EACH ROW EXECUTE FUNCTION rebuild_search_vector();