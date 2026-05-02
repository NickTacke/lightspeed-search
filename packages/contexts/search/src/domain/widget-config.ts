import type { ShopId } from "@aidey/shops";

export interface WidgetConfig {
  shopId: ShopId;
  widgetEnabled: boolean;
  accentColor: string | null;
  borderRadius: number | null;
  darkMode: boolean | null;
  visibleFields: string[];
  maxDropdownResults: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export const DEFAULT_VISIBLE_FIELDS: ReadonlyArray<string> = [
  "image",
  "brand",
  "title",
  "price",
  "salePrice",
  "categoryTag",
];
