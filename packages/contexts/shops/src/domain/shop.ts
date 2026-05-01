import type { ShopId } from "./ids.ts";

export type ShopCluster = "us1" | "eu1";

export interface Shop {
  id: ShopId;
  lightspeedId: string;
  domain: string;
  name: string;
  email: string | null;
  language: string;
  cluster: ShopCluster;
  installToken: string | null;
  userSecret: string | null;
  apiKey: string | null;
  apiSecret: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export type Credentials =
  | { kind: "install"; installToken: string; userSecret: string }
  | { kind: "manual"; apiKey: string; apiSecret: string };
