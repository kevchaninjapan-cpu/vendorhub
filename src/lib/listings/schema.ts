import { z } from "zod";

export const disclosuresSchema = z.object({
  lim_provided: z.boolean().optional(),
  title_provided: z.boolean().optional(),
  weathertightness_disclosed: z.boolean().optional(),
  unconsented_works: z.boolean().optional(),
  building_report_provided: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
});

export const addressStepSchema = z.object({
  dvr_record_id: z.string().nullish(),
  auckland_rate_assessment_id: z.string().nullish(),
  formatted_address: z.string().min(5, "Address is required"),
  address_norm: z.string().nullish(),
  street_address: z.string().min(2),
  suburb: z.string().min(2),
  region: z.string().min(2),
  postcode: z.string().nullish(),
  lat: z.number(),
  lng: z.number(),
});

export const detailsStepSchema = z.object({
  pack_tier: z.enum(["starter", "pro", "elite"]),
  property_type: z.enum([
    "house", "apartment", "townhouse", "unit", "section", "lifestyle", "other",
  ]),
  bedrooms: z.coerce.number().int().min(0).max(20),
  bathrooms: z.coerce.number().int().min(0).max(20),
  parking: z.coerce.number().int().min(0).max(20),
  floor_area_sqm: z.coerce.number().positive().nullable().optional(),
  land_area_sqm: z.coerce.number().positive().nullable().optional(),
  year_built: z.coerce.number().int().min(1800).max(new Date().getFullYear() + 1)
    .nullable().optional(),
  chattels: z.array(z.string()).default([]),
  headline: z.string().min(10, "Add a short headline").max(120),
  description: z.string().min(50, "Add at least a short description").max(8000),

  method_of_sale: z.enum(["asking_price", "negotiation", "tender", "beo"]),
  asking_price: z.coerce.number().positive().nullable().optional(),
  price_text: z.string().nullable().optional(),
  tender_close_at: z.string().nullable().optional(),
  beo_amount: z.coerce.number().positive().nullable().optional(),
}).superRefine((v, ctx) => {
  if (v.method_of_sale === "asking_price" && !v.asking_price) {
    ctx.addIssue({ code: "custom", path: ["asking_price"], message: "Required for asking price" });
  }
  if (v.method_of_sale === "tender" && !v.tender_close_at) {
    ctx.addIssue({ code: "custom", path: ["tender_close_at"], message: "Tender close date required" });
  }
  if (v.method_of_sale === "beo" && !v.beo_amount) {
    ctx.addIssue({ code: "custom", path: ["beo_amount"], message: "BEO amount required" });
  }
});

export const mediaStepSchema = z.object({
  mediaIds: z.array(z.string().uuid()).min(4, "Add at least 4 photos"),
  coverMediaId: z.string().uuid("Pick a cover photo"),
});

export const disclosuresStepSchema = z.object({
  disclosures: disclosuresSchema,
  acknowledgements: z.object({
    rea_disclaimer_accepted: z
      .boolean()
      .refine((v) => v === true, {
        message: "You must acknowledge the REA disclaimer",
      }),
    accurate_info_confirmed: z
      .boolean()
      .refine((v) => v === true, {
        message: "Confirm details are accurate",
      }),
  }),
});

export type AddressStep = z.infer<typeof addressStepSchema>;
export type DetailsStep = z.infer<typeof detailsStepSchema>;
export type MediaStep = z.infer<typeof mediaStepSchema>;
export type DisclosuresStep = z.infer<typeof disclosuresStepSchema>;