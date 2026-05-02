import type { ShopId } from "@aidey/shops";
import type {
  WidgetConfigPatch,
  WidgetConfigRepository,
} from "../infrastructure/widget-config-repository.ts";

export const updateWidgetConfig =
  (repo: WidgetConfigRepository) => (shopId: ShopId, patch: WidgetConfigPatch) =>
    repo.update(shopId, patch);
