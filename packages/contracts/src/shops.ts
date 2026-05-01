import { z } from "zod";

export const shopSchema = z.object({
  id: z.uuid(),
  domain: z.string(),
  name: z.string(),
  cluster: z.enum(["us1", "eu1"]),
});
export type ShopDto = z.infer<typeof shopSchema>;

export const onboardManualKeySchema = z.object({
  domain: z.string().min(1),
  apiKey: z.string().min(1),
  apiSecret: z.string().min(1),
  cluster: z.enum(["us1", "eu1"]),
});
export type OnboardManualKeyInput = z.infer<typeof onboardManualKeySchema>;
