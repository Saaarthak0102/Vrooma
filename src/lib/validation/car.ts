import { z } from "zod";

export const carSearchFilterSchema = z.object({
  q: z.string().optional(),
  body_type: z.string().optional(),
  fuel: z.string().optional(),
  transmission: z.string().optional(),
  min_price: z.coerce.number().optional(),
  max_price: z.coerce.number().optional(),
  city: z.string().default("lucknow"),
  sort: z.enum(["price_asc", "price_desc", "newest"]).default("price_asc"),
});

export const usedCarFilterSchema = z.object({
  q: z.string().optional(),
  model: z.string().optional(),
  fuel: z.string().optional(),
  min_year: z.coerce.number().optional(),
  max_km: z.coerce.number().optional(),
  max_price: z.coerce.number().optional(),
  owners: z.coerce.number().optional(),
  sort: z.enum(["price_asc", "price_desc", "year_desc", "km_asc"]).default("price_asc"),
});

export type CarSearchFilterInput = z.infer<typeof carSearchFilterSchema>;
export type UsedCarFilterInput = z.infer<typeof usedCarFilterSchema>;
