export { type CombinedConfig, getConfig } from "./application/get-config.ts";
export {
  type RegenerateEmbeddingDeps,
  type RegenerateEmbeddingResult,
  regenerateEmbedding,
} from "./application/regenerate-embedding.ts";
export { type SearchQueryDeps, searchQuery } from "./application/search-query.ts";
export { updateSearchConfig } from "./application/update-search-config.ts";
export { updateWidgetConfig } from "./application/update-widget-config.ts";
export type { SearchHit, SearchInput } from "./domain/search.ts";
export {
  DEFAULT_ENABLED_FIELDS,
  DEFAULT_RESULT_LIMIT,
  DEFAULT_SEMANTIC_THRESHOLD,
  type SearchConfig,
} from "./domain/search-config.ts";
export { DEFAULT_VISIBLE_FIELDS, type WidgetConfig } from "./domain/widget-config.ts";
export {
  createOpenAIEmbedder,
  type OpenAIEmbedder,
  type OpenAIEmbedderConfig,
} from "./infrastructure/openai-embedder.ts";
export * as schema from "./infrastructure/schema.ts";
export {
  createSearchConfigRepository,
  type SearchConfigPatch,
  type SearchConfigRepository,
} from "./infrastructure/search-config-repository.ts";
export {
  createWidgetConfigRepository,
  type WidgetConfigPatch,
  type WidgetConfigRepository,
} from "./infrastructure/widget-config-repository.ts";
