import {
  type CategoryRepository,
  type CategoryUpsertInput,
  categoryId,
  type ProductId,
  type ProductRepository,
  type ProductUpsertInput,
  type VariantRepository,
  type VariantUpsertInput,
} from "@aidey/catalog";
import type { Database } from "@aidey/database";
import {
  catalogEndpoints,
  categoriesEndpoints,
  createLightspeedClient,
  type LightspeedClient,
  type LightspeedCredentials,
} from "@aidey/lightspeed";
import type { Shop } from "@aidey/shops";
import { sql } from "drizzle-orm";
import type { SyncLog, SyncTrigger } from "../domain/sync-log.ts";
import type { SyncLogRepository } from "../infrastructure/sync-log-repository.ts";

export interface RegenerateEmbeddingResult {
  generated: boolean;
}

export interface FullSyncDeps {
  db: Database;
  syncLogRepo: SyncLogRepository;
  productRepo: ProductRepository;
  categoryRepo: CategoryRepository;
  variantRepo: VariantRepository;
  /**
   * Our partner-app API key (env LIGHTSPEED_APP_KEY). Used as the Basic-auth
   * username for shops created via the install flow — only the manual-key
   * flow uses per-shop apiKey/apiSecret.
   */
  appKey: string;
  lightspeedClientFactory?: (creds: LightspeedCredentials) => LightspeedClient;
  regenerateEmbedding?: (productId: ProductId) => Promise<RegenerateEmbeddingResult>;
}

/**
 * Pick the right Basic-auth pair for the shop's install origin. Per
 * https://developers.lightspeedhq.com/ecom/tutorials/installing-an-app/,
 * partner-app installs authenticate as Basic(APP_KEY, userSecret); manual
 * API-key installs use the per-shop (apiKey, apiSecret) generated in LS admin.
 */
function shopCredentials(shop: Shop, appKey: string): { apiKey: string; apiSecret: string } {
  if (shop.installToken && shop.userSecret) {
    return { apiKey: appKey, apiSecret: shop.userSecret };
  }
  if (shop.apiKey && shop.apiSecret) {
    return { apiKey: shop.apiKey, apiSecret: shop.apiSecret };
  }
  throw new Error("shop has no Lightspeed credentials");
}

const PAGE_LIMIT = 250;

/**
 * Pull the full catalog from Lightspeed for a shop, upsert products/categories/variants,
 * soft-delete rows not seen in this run. Wraps in a per-shop advisory lock so concurrent
 * syncs across instances collide safely.
 */
export async function fullSync(
  deps: FullSyncDeps,
  shop: Shop,
  trigger: SyncTrigger,
): Promise<SyncLog> {
  const log = await deps.syncLogRepo.start(shop.id, trigger);
  const factory = deps.lightspeedClientFactory ?? createLightspeedClient;

  // Per-shop advisory lock (hashtext gives a deterministic int from the shop UUID)
  const lockKey = `aidey:sync:${shop.id}`;
  const lockAcquired = await tryAdvisoryLock(deps.db, lockKey);
  if (!lockAcquired) {
    const completed = await deps.syncLogRepo.complete(log.id, {
      status: "failure",
      errorMessage: "another sync is already running for this shop",
    });
    return completed ?? log;
  }

  try {
    const { apiKey, apiSecret } = shopCredentials(shop, deps.appKey);
    const client = factory({
      cluster: shop.cluster,
      apiKey,
      apiSecret,
      language: shop.language,
    });

    // 1. Categories first (products may reference them)
    const seenCategoryIds = new Set<string>();
    let page = 1;
    while (true) {
      const cats = await categoriesEndpoints.listCategories(client, { page, limit: PAGE_LIMIT });
      if (cats.length === 0) break;
      for (const cat of cats) {
        const input: CategoryUpsertInput = {
          shopId: shop.id,
          lightspeedId: String(cat.id),
          title: cat.title,
          handle: cat.url ?? null,
          description: cat.description ?? null,
          image: cat.image?.src ?? null,
          visible: cat.visibility !== "hidden",
          sortOrder: cat.sortOrder ?? 0,
          parentLightspeedId: cat.parent?.id ? String(cat.parent.id) : null,
        };
        await deps.categoryRepo.upsertByLightspeedId(input);
        seenCategoryIds.add(String(cat.id));
      }
      page++;
    }
    await deps.categoryRepo.softDeleteMissing(shop.id, [...seenCategoryIds]);

    // 2. Products + variants
    const seenProductIds = new Set<string>();
    const seenVariantIds = new Set<string>();
    let embeddingsGenerated = 0;
    page = 1;
    while (true) {
      const products = await catalogEndpoints.listProducts(client, { page, limit: PAGE_LIMIT });
      if (products.length === 0) break;

      for (const p of products) {
        const productInput: ProductUpsertInput = {
          shopId: shop.id,
          lightspeedId: String(p.id),
          title: p.title,
          fulltitle: p.fulltitle ?? null,
          description: p.description ?? null,
          fullDescription: p.content ?? null,
          brand: p.brand?.title ?? null,
          handle: p.handle ?? null,
          image: p.image?.src ?? null,
          price: p.price != null ? String(p.price) : null,
          compareAtPrice: p.oldPrice != null ? String(p.oldPrice) : null,
          sku: p.sku ?? null,
          ean: p.ean ?? null,
          tags: parseTags(p.tags),
          visible: p.visibility !== "hidden",
          sortOrder: p.sortOrder ?? 0,
        };
        const upsertResult = await deps.productRepo.upsertByLightspeedId(productInput);
        const product = upsertResult.product;
        seenProductIds.add(String(p.id));

        // Set product → categories from the embedded set
        const embeddedCats = p.categoriesSet?.resource?.embedded?.categories ?? [];
        if (embeddedCats.length > 0) {
          const catRows = await deps.categoryRepo.listForShop(shop.id);
          const idMap = new Map(catRows.map((c) => [c.lightspeedId, c.id]));
          const resolved = embeddedCats
            .map((c) => idMap.get(String(c.id)))
            .filter((c): c is NonNullable<typeof c> => Boolean(c))
            .map((c) => categoryId(c));
          await deps.categoryRepo.setProductCategories(product.id, resolved);
        }

        // Variants
        for (const v of p.variants ?? []) {
          const variantInput: VariantUpsertInput = {
            shopId: shop.id,
            productId: product.id,
            lightspeedId: String(v.id),
            title: v.title ?? "",
            priceIncl: v.priceIncl != null ? String(v.priceIncl) : null,
            priceExcl: v.priceExcl != null ? String(v.priceExcl) : null,
            oldPriceIncl: v.oldPriceIncl != null ? String(v.oldPriceIncl) : null,
            oldPriceExcl: v.oldPriceExcl != null ? String(v.oldPriceExcl) : null,
            sku: v.sku ?? null,
            ean: v.ean ?? null,
            articleCode: v.articleCode ?? null,
            stockLevel: v.stockLevel ?? 0,
            stockTracking: v.stockTracking ?? "disabled",
            isDefault: v.isDefault ?? false,
            sortOrder: v.sortOrder ?? 0,
          };
          await deps.variantRepo.upsertByLightspeedId(variantInput);
          seenVariantIds.add(String(v.id));
        }

        // 3. Embedding regen: only when product changed and embedder is wired
        if (deps.regenerateEmbedding && upsertResult.changed) {
          try {
            const r = await deps.regenerateEmbedding(product.id);
            if (r.generated) embeddingsGenerated++;
          } catch (err) {
            console.error("[sync] embedding regen failed", err);
            // Don't fail the whole sync; just log and continue
          }
        }
      }
      page++;
    }
    await deps.productRepo.softDeleteMissing(shop.id, [...seenProductIds]);
    await deps.variantRepo.softDeleteMissing(shop.id, [...seenVariantIds]);

    const completed = await deps.syncLogRepo.complete(log.id, {
      status: "success",
      productsTotal: seenProductIds.size,
      categoriesTotal: seenCategoryIds.size,
      embeddingsGenerated,
    });
    return completed ?? log;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const completed = await deps.syncLogRepo.complete(log.id, {
      status: "failure",
      errorMessage: message,
    });
    return completed ?? log;
  } finally {
    await releaseAdvisoryLock(deps.db, lockKey);
  }
}

/** Parse Lightspeed's CSV tags into an array. */
function parseTags(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

async function tryAdvisoryLock(db: Database, key: string): Promise<boolean> {
  const result = await db.execute<{ ok: boolean }>(
    sql`SELECT pg_try_advisory_lock(hashtext(${key})) AS ok`,
  );
  return Boolean((result as unknown as Array<{ ok: boolean }>)[0]?.ok);
}

async function releaseAdvisoryLock(db: Database, key: string): Promise<void> {
  await db.execute(sql`SELECT pg_advisory_unlock(hashtext(${key}))`);
}
