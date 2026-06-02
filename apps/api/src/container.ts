import {
  createAlert,
  createAlertRepository,
  deleteAlert,
  getAlert,
  listAlerts,
  updateAlert,
} from "@aidey/alerts";
import {
  createCategoryRepository,
  createProductRepository,
  createVariantRepository,
} from "@aidey/catalog";
import { createDatabase } from "@aidey/database";
import { createAuth, createEmailSender } from "@aidey/identity";
import {
  createOpenAIEmbedder,
  createSearchConfigRepository,
  createWidgetConfigRepository,
  getConfig,
  regenerateEmbedding,
  type SearchConfigPatch,
  type SearchInput,
  searchQuery,
  updateSearchConfig,
  updateWidgetConfig,
  type WidgetConfigPatch,
} from "@aidey/search";
import {
  type CreateFromInstallInput,
  type CreateFromManualKeyInput,
  createFromInstall,
  createFromManualKey,
  createShopRepository,
  getShop,
  getShopByDomain,
  listForUser,
  type Shop,
  type ShopCluster,
  schema as shopsSchema,
  uninstallShop,
} from "@aidey/shops";
import {
  createSyncLogRepository,
  fullSync,
  type HandleWebhookInput,
  handleWebhook,
  lastSuccessful,
  listLogs,
  type SyncTrigger,
  triggerCron,
} from "@aidey/sync";
import { isNull } from "drizzle-orm";
import type { Env } from "./env.ts";
import { createLogger } from "./lib/logger.ts";

export function createContainer(env: Env) {
  const logger = createLogger(env);
  const db = createDatabase(env.DATABASE_URL);
  const email = createEmailSender({
    apiKey: env.RESEND_API_KEY,
    from: env.EMAIL_FROM,
    devMode: env.EMAIL_DEV_MODE,
    logger: (msg) => logger.info(msg),
  });
  const auth = createAuth({
    db,
    email,
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    webURL: env.WEB_URL,
    cookieDomain: env.COOKIE_DOMAIN || undefined,
  });

  const shopRepo = createShopRepository(db);
  const shops = {
    createFromManualKey: (input: CreateFromManualKeyInput) =>
      createFromManualKey({ repo: shopRepo }, input),
    createFromInstall: (input: CreateFromInstallInput) =>
      createFromInstall({ repo: shopRepo }, input),
    getById: getShop(shopRepo),
    getByDomain: getShopByDomain(shopRepo),
    listForUser: listForUser(shopRepo),
    uninstall: uninstallShop(shopRepo),
  };

  const alertRepo = createAlertRepository(db);
  const alerts = {
    create: createAlert(alertRepo),
    list: listAlerts(alertRepo),
    get: getAlert(alertRepo),
    update: updateAlert(alertRepo),
    delete: deleteAlert(alertRepo),
  };

  const productRepo = createProductRepository(db);
  const categoryRepo = createCategoryRepository(db);
  const variantRepo = createVariantRepository(db);
  const syncLogRepo = createSyncLogRepository(db);

  const embedder = createOpenAIEmbedder({ apiKey: env.OPENAI_API_KEY });
  const searchConfigRepo = createSearchConfigRepository(db);
  const widgetConfigRepo = createWidgetConfigRepository(db);
  const search = {
    query: (shopId: string, input: SearchInput) =>
      searchQuery({ db, embedder, searchConfigRepo })(shopId as never, input),
    regenerate: regenerateEmbedding({ db, embedder, productRepo, categoryRepo }),
    getConfig: (shopId: string) =>
      getConfig({ searchConfigRepo, widgetConfigRepo })(shopId as never),
    updateSearchConfig: (shopId: string, patch: SearchConfigPatch) =>
      updateSearchConfig(searchConfigRepo)(shopId as never, patch),
    updateWidgetConfig: (shopId: string, patch: WidgetConfigPatch) =>
      updateWidgetConfig(widgetConfigRepo)(shopId as never, patch),
  };

  const listConnectedShops = async (): Promise<Shop[]> => {
    const rows = await db
      .select()
      .from(shopsSchema.shops)
      .where(isNull(shopsSchema.shops.deletedAt));
    return rows
      .filter((r) => (r.installToken && r.userSecret) || (r.apiKey && r.apiSecret))
      .map(
        (r) =>
          ({
            id: r.id as never,
            lightspeedId: r.lightspeedId,
            domain: r.domain,
            name: r.name,
            email: r.email,
            language: r.language,
            cluster: r.cluster as ShopCluster,
            installToken: r.installToken,
            userSecret: r.userSecret,
            apiKey: r.apiKey,
            apiSecret: r.apiSecret,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
            deletedAt: r.deletedAt,
          }) satisfies Shop,
      );
  };

  const syncDeps = {
    db,
    syncLogRepo,
    productRepo,
    categoryRepo,
    variantRepo,
    appKey: env.LIGHTSPEED_APP_KEY,
    regenerateEmbedding: search.regenerate,
  };

  const sync = {
    fullSync: (shop: Shop, trigger: SyncTrigger) => fullSync(syncDeps, shop, trigger),
    handleWebhook: (input: HandleWebhookInput) => handleWebhook(syncDeps, input),
    triggerCron: () => triggerCron({ ...syncDeps, listConnectedShops }),
    listLogs: listLogs(syncLogRepo),
    lastSuccessful: lastSuccessful(syncLogRepo),
  };

  return { db, env, auth, shops, alerts, sync, search, logger };
}

export type Container = ReturnType<typeof createContainer>;
