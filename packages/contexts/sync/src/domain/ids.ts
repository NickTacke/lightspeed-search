export type SyncLogId = string & { readonly __brand: "SyncLogId" };
export const syncLogId = (s: string): SyncLogId => s as SyncLogId;
