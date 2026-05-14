import { z } from 'zod';

export const recipientSchema = z.object({
  address: z.string().email().describe('Recipient email address'),
  name: z.string().optional().describe('Recipient display name'),
});

export const senderSchema = z.object({
  address: z.string().email().optional().describe('Sender email address (overrides default)'),
  reply_to: z.string().email().optional().describe('Reply-to email address'),
  name: z.string().optional().describe('Sender display name'),
});

export const attachmentSchema = z.object({
  id: z.string().describe('Filename of the attachment (e.g. "invoice.pdf")'),
  data: z.string().describe('Base64-encoded file contents'),
});

export const templateIdSchema = z.string().min(1).describe('Sendwithus template ID');
export const localeSchema = z.string().min(2).describe('Locale code (e.g. "en-US", "fr-FR")');
export const versionIdSchema = z.string().min(1).describe('Template version ID');
export const snippetIdSchema = z.string().min(1).describe('Snippet ID');
export const emailAddressSchema = z.string().email().describe('Customer email address');
export const dripCampaignIdSchema = z.string().min(1).describe('Drip campaign ID');
