export type AlertId = string & { readonly __brand: "AlertId" };
export const alertId = (s: string): AlertId => s as AlertId;
