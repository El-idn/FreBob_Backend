import { z } from 'zod';

export const languageSchema = z.enum(['en', 'pcm', 'yo', 'ha', 'ig']);
export const captureSourceSchema = z.enum(['whatsapp', 'sms', 'scanner', 'manual']);
export const paymentStatusSchema = z.enum(['unpaid', 'partially_paid', 'paid']);
export const orderStatusSchema = z.enum([
  'enquiry',
  'reserved',
  'confirmed',
  'cancelled',
  'fulfilled',
]);
export const paymentMethodSchema = z.enum(['cash', 'transfer', 'pos', 'other']);

export const extractedFieldsSchema = z.object({
  eventType: z.string(),
  customerName: z.string(),
  productName: z.string(),
  variant: z.string().optional(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
  total: z.number().nonnegative(),
  amountPaid: z.number().nonnegative(),
  balance: z.number().nonnegative(),
  paymentStatus: paymentStatusSchema,
  orderStatus: orderStatusSchema,
  paymentMethod: paymentMethodSchema,
  uncertainFields: z.array(z.string()).default([]),
});

export const extractRequestSchema = z.object({
  businessId: z.string().uuid(),
  source: captureSourceSchema,
  text: z.string().min(1).optional(),
  sampleId: z.string().optional(),
  imageBase64: z.string().optional(),
  mimeType: z.string().optional(),
});

export const approveRequestSchema = z.object({
  businessId: z.string().uuid(),
  extractionId: z.string().uuid(),
  fields: extractedFieldsSchema,
  sourceText: z.string().optional(),
  sourceLabel: z.string().optional(),
});

export const rejectRequestSchema = z.object({
  businessId: z.string().uuid(),
  extractionId: z.string().uuid(),
  reason: z.string().optional(),
});

export const ttsRequestSchema = z.object({
  businessId: z.string().uuid(),
  text: z.string().min(1).max(2000),
  language: languageSchema.default('en'),
  voice: z.string().optional(),
});

export const sttRequestSchema = z.object({
  businessId: z.string().uuid(),
  audioBase64: z.string().min(80),
  mimeType: z.string().optional(),
  language: languageSchema.optional(),
});

export type ExtractedFields = z.infer<typeof extractedFieldsSchema>;
export type ExtractRequest = z.infer<typeof extractRequestSchema>;
export type ApproveRequest = z.infer<typeof approveRequestSchema>;
export type TtsRequest = z.infer<typeof ttsRequestSchema>;
export type SttRequest = z.infer<typeof sttRequestSchema>;
