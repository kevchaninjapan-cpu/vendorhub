import { z } from "zod";

export const offerFormSchema = z.object({
  amount: z.coerce.number().positive("Amount must be > 0"),
  finance_condition: z.boolean().default(false),
  building_report_condition: z.boolean().default(false),
  lim_condition: z.boolean().default(false),
  settlement_date: z.string().optional(),
  expires_at: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

export type OfferForm = z.infer<typeof offerFormSchema>;

export const counterOfferSchema = z.object({
  amount: z.coerce.number().positive(),
  notes: z.string().max(2000).optional(),
});