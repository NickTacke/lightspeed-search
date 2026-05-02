import type { ShopId } from "@aidey/shops";
import type { SearchConfig } from "../domain/search-config.ts";
import type { WidgetConfig } from "../domain/widget-config.ts";
import type { SearchConfigRepository } from "../infrastructure/search-config-repository.ts";
import type { WidgetConfigRepository } from "../infrastructure/widget-config-repository.ts";

export interface CombinedConfig {
  search: SearchConfig;
  widget: WidgetConfig;
}

export function getConfig(deps: {
  searchConfigRepo: SearchConfigRepository;
  widgetConfigRepo: WidgetConfigRepository;
}) {
  return async (shopId: ShopId): Promise<CombinedConfig> => ({
    search: await deps.searchConfigRepo.getOrCreate(shopId),
    widget: await deps.widgetConfigRepo.getOrCreate(shopId),
  });
}
