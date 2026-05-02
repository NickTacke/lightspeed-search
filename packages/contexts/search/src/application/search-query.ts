import { productId } from "@aidey/catalog";
import type { Database } from "@aidey/database";
import type { ShopId } from "@aidey/shops";
import { sql } from "drizzle-orm";
import type { SearchHit, SearchInput } from "../domain/search.ts";
import type { OpenAIEmbedder } from "../infrastructure/openai-embedder.ts";
import type { SearchConfigRepository } from "../infrastructure/search-config-repository.ts";

export interface SearchQueryDeps {
  db: Database;
  embedder: OpenAIEmbedder;
  searchConfigRepo: SearchConfigRepository;
}

interface RawHit extends Record<string, unknown> {
  id: string;
  title: string;
  image: string | null;
  brand: string | null;
  price: string | null;
  score: number;
}

/**
 * Hybrid search: tsvector lexical match + pgvector cosine similarity.
 * Score = 0.5 * ts_rank + 0.5 * (1 - cosine_distance).
 * When semanticEnabled is false, falls back to tsvector-only.
 */
export function searchQuery(deps: SearchQueryDeps) {
  return async (shopId: ShopId, input: SearchInput): Promise<SearchHit[]> => {
    const config = await deps.searchConfigRepo.getOrCreate(shopId);
    const limit = input.limit ?? config.resultLimit;
    const queryText = input.query.trim();
    if (queryText.length === 0) return [];

    if (!config.semanticEnabled) {
      const rows = await deps.db.execute<RawHit>(sql`
        SELECT
          p.id,
          p.title,
          p.image,
          p.brand,
          p.price,
          ts_rank(pe.search_vector, plainto_tsquery('simple', ${queryText})) AS score
        FROM products p
        JOIN product_embeddings pe ON pe.product_id = p.id
        WHERE p.shop_id = ${shopId}
          AND p.deleted_at IS NULL
          AND p.visible = true
          AND pe.search_vector @@ plainto_tsquery('simple', ${queryText})
        ORDER BY score DESC
        LIMIT ${limit}
      `);
      return (rows as unknown as RawHit[]).map((r) => ({
        productId: productId(r.id),
        title: r.title,
        image: r.image,
        brand: r.brand,
        price: r.price,
        score: Number(r.score),
      }));
    }

    const queryEmbedding = await deps.embedder.embed(queryText);
    const queryVector = `[${queryEmbedding.join(",")}]`;

    const rows = await deps.db.execute<RawHit>(sql`
      SELECT
        p.id,
        p.title,
        p.image,
        p.brand,
        p.price,
        (
          0.5 * ts_rank(pe.search_vector, plainto_tsquery('simple', ${queryText})) +
          0.5 * (1 - (pe.embedding <=> ${queryVector}::vector))
        ) AS score
      FROM products p
      JOIN product_embeddings pe ON pe.product_id = p.id
      WHERE p.shop_id = ${shopId}
        AND p.deleted_at IS NULL
        AND p.visible = true
        AND pe.embedding IS NOT NULL
      ORDER BY score DESC
      LIMIT ${limit}
    `);
    return (rows as unknown as RawHit[]).map((r) => ({
      productId: productId(r.id),
      title: r.title,
      image: r.image,
      brand: r.brand,
      price: r.price,
      score: Number(r.score),
    }));
  };
}
