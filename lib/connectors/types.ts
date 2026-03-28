import { z } from "zod";
import type { LeadPriority, LeadSource } from "@/types/prospecting";

export type ProspectSearchResult = {
  id: string;
  company: string;
  niche: string;
  region: string;
  monthlyBudget: string;
  score: number;
  priority: LeadPriority;
  trigger: string;
  source: LeadSource;
  icp: string;
  contact: string;
  sourceUrl?: string;
};

export type ProspectSearchRequest = {
  icp: string;
  niche: string;
  region: string;
  city?: string;
  sources: LeadSource[];
  limitPerSource: number;
};

export type ProspectSearchResponse = {
  results: ProspectSearchResult[];
  connectorStatus: Partial<Record<LeadSource, string>>;
};

export type GenericConnectorItem = {
  company?: string;
  niche?: string;
  region?: string;
  monthlyBudget?: string;
  score?: number;
  trigger?: string;
  contact?: string;
  sourceUrl?: string;
};

export type ConnectorErrorResult = {
  results: ProspectSearchResult[];
  status: string;
  retryable?: boolean;
};

// --- Zod schemas for external API validation ---

export const ApifyRunResponseSchema = z.object({
  data: z
    .object({
      status: z.string().optional(),
      defaultDatasetId: z.string().optional(),
    })
    .optional(),
});
export type ApifyRunResponse = z.infer<typeof ApifyRunResponseSchema>;

export const GooglePlaceSchema = z.object({
  displayName: z.object({ text: z.string() }).optional(),
  googleMapsUri: z.string().optional(),
  formattedAddress: z.string().optional(),
  rating: z.number().optional(),
  userRatingCount: z.number().optional(),
  websiteUri: z.string().optional(),
  nationalPhoneNumber: z.string().optional(),
});
export type GooglePlace = z.infer<typeof GooglePlaceSchema>;

export const GooglePlacesResponseSchema = z.object({
  places: z.array(GooglePlaceSchema).optional(),
});
export type GooglePlacesResponse = z.infer<typeof GooglePlacesResponseSchema>;

export const GenericConnectorPayloadSchema = z.array(z.record(z.string(), z.unknown()));

// --- Uazapi WhatsApp API schemas ---

export const UazapiNumberCheckSchema = z.object({
  exists: z.boolean(),
  jid: z.string().optional(),
  number: z.string().optional(),
});
export type UazapiNumberCheck = z.infer<typeof UazapiNumberCheckSchema>;

export const UazapiSendResponseSchema = z.object({
  messageId: z.string().optional(),
  status: z.string().optional(),
  error: z.string().optional(),
});
export type UazapiSendResponse = z.infer<typeof UazapiSendResponseSchema>;
