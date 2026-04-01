import { z } from 'zod';

export const selectAccountsSchema = z.object({
  body: z.object({
    siteId: z.string().optional(),
    siteName: z.string().min(1, "Site name is required").optional(),
    ga4PropertyId: z.string().optional(),
    ga4TokenId: z.string().optional(),
    gscSiteUrl: z.string().optional(),
    gscTokenId: z.string().optional(),
    googleAdsCustomerId: z.string().optional(),
    googleAdsTokenId: z.string().optional(),
    facebookAdAccountId: z.string().optional(),
    facebookTokenId: z.string().optional(),
  }),
});

export const siteIdParamSchema = z.object({
  params: z.object({
    siteId: z.string().min(24, "Invalid Site ID"),
  }),
});

export const resumeSyncSchema = z.object({
  body: z.object({
    siteId: z.string().min(24, "Invalid Site ID"),
    source: z.enum(['ga4', 'gsc', 'google-ads', 'facebook-ads']),
  }),
});
