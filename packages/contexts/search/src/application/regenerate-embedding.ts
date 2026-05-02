import { createHash } from "node:crypto";
import {
  buildSearchText,
  type CategoryRepository,
  type ProductId,
  type ProductRepository,
} from "@aidey/catalog";
import type { Database } from "@aidey/database";
import { eq } from "drizzle-orm";
import type { OpenAIEmbedder } from "../infrastructure/openai-embedder.ts";
import * as schema from "../infrastructure/schema.ts";

export interface RegenerateEmbeddingDeps {
  db: Database;
  embedder: OpenAIEmbedder;
  productRepo: ProductRepository;
  categoryRepo: CategoryRepository;
}

export interface RegenerateEmbeddingResult {
  generated: boolean;
}

/**
 * Generate an embedding for a product if its search-relevant content has changed.
 * Hash compare against the stored row; skip the OpenAI call when nothing changed.
 */
export function regenerateEmbedding(deps: RegenerateEmbeddingDeps) {
  return async (productId: ProductId): Promise<RegenerateEmbeddingResult> => {
    const product = await deps.productRepo.findById(productId);
    if (!product) return { generated: false };

    const categories = await deps.categoryRepo.listForProduct(productId);
    const searchText = buildSearchText(product, categories);
    const hash = createHash("sha256").update(searchText).digest("hex");

    const [existing] = await deps.db
      .select({ embeddingHash: schema.productEmbeddings.embeddingHash })
      .from(schema.productEmbeddings)
      .where(eq(schema.productEmbeddings.productId, productId))
      .limit(1);
    if (existing?.embeddingHash === hash) return { generated: false };

    const embedding = await deps.embedder.embed(searchText);
    const now = new Date();

    await deps.db
      .insert(schema.productEmbeddings)
      .values({
        productId,
        shopId: product.shopId,
        embedding,
        searchText,
        embeddingHash: hash,
        generatedAt: now,
      })
      .onConflictDoUpdate({
        target: schema.productEmbeddings.productId,
        set: {
          embedding,
          searchText,
          embeddingHash: hash,
          generatedAt: now,
        },
      });

    return { generated: true };
  };
}
