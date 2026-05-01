export type UserId = string & { readonly __brand: "UserId" };
export type SessionId = string & { readonly __brand: "SessionId" };

export const userId = (s: string): UserId => s as UserId;
export const sessionId = (s: string): SessionId => s as SessionId;
