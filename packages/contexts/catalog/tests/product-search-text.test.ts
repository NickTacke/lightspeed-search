import { describe, expect, test } from "bun:test";
import type { Product } from "../src/domain/product.ts";
import { buildSearchText } from "../src/domain/product-search-text.ts";

const baseProduct: Product = {
  id: "p" as never,
  shopId: "s" as never,
  lightspeedId: "1",
  title: "Red Sneakers",
  fulltitle: null,
  description: "Comfortable everyday red sneakers",
  fullDescription: null,
  brand: "Acme",
  handle: null,
  image: null,
  price: null,
  compareAtPrice: null,
  sku: null,
  ean: null,
  tags: ["shoes", "casual"],
  visible: true,
  sortOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

describe("buildSearchText", () => {
  test("includes title, brand, tags, categories, description", () => {
    const text = buildSearchText(baseProduct, [{ title: "Footwear" }, { title: "Sneakers" }]);
    expect(text).toContain("Red Sneakers");
    expect(text).toContain("Acme");
    expect(text).toContain("shoes");
    expect(text).toContain("casual");
    expect(text).toContain("Footwear");
    expect(text).toContain("Sneakers");
    expect(text).toContain("Comfortable");
  });

  test("skips empty/null parts", () => {
    const text = buildSearchText({ ...baseProduct, brand: null, tags: [], description: null }, []);
    expect(text).toBe("Red Sneakers");
  });

  test("truncates long descriptions to 500 chars", () => {
    const long = "A".repeat(2000);
    const text = buildSearchText({ ...baseProduct, description: long, brand: null, tags: [] }, []);
    expect(text.length).toBeLessThan(700);
  });
});
