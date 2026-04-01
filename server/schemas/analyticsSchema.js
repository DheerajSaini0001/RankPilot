import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const analyticsQuerySchema = z.object({
  query: z.object({
    startDate: z.string().regex(dateRegex, "Format must be YYYY-MM-DD"),
    endDate: z.string().regex(dateRegex, "Format must be YYYY-MM-DD"),
    siteId: z.string().optional(),
    device: z.string().optional(),
    channel: z.string().optional(),
    campaign: z.string().optional(),
  }),
});

export const syncDataSchema = z.object({
  body: z.object({
    siteId: z.string().min(24, "Invalid Site ID format"),
  }),
});
