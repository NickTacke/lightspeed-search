import type { ProductId } from "@aidey/catalog";

export interface SearchInput {
  query: string;
  limit?: number;
}

export interface SearchHit {
  productId: ProductId;
  title: string;
  image: string | null;
  brand: string | null;
  price: string | null;
  score: number;
}
