import {
  extractedFieldsSchema,
  type ExtractedFields,
  type ExtractRequest,
} from '../schemas.js';
import {
  assertBusinessRelevant,
  ExtractionIrrelevantError,
} from './businessRelevance.js';
import { geminiGenerateContent, getGeminiApiKey, parseGeminiJsonText } from './gemini.js';
/**
 * Live Gemini extraction (text + optional image) with deterministic money recompute.
 * Falls back to mock fixtures when GEMINI_API_KEY is missing or the call fails.
 * Rejects non-business conversations (personal chat / greetings).
 */
export async function runExtraction(
  input: ExtractRequest,
): Promise<{ extractionId: string; fields: ExtractedFields; sourceText: string }> {
  if (getGeminiApiKey()) {
    try {
      const gemini = await runGeminiExtraction(input);
      if (gemini) {
        return { ...gemini, fields: recomputeMoney(gemini.fields) };
      }
    } catch (err) {
      if (err instanceof ExtractionIrrelevantError) throw err;
      console.warn('Gemini extraction failed, falling back to mock:', err);
    }
  }
  assertBusinessRelevant(input);
  const mock = runMockExtraction(input);
  return { ...mock, fields: recomputeMoney(mock.fields) };
}

async function runGeminiExtraction(
  input: ExtractRequest,
): Promise<{ extractionId: string; fields: ExtractedFields; sourceText: string } | null> {
  const key = getGeminiApiKey();
  if (!key) return null;

  const sourceText =
    input.text ??
    (input.sampleId ? `Sample ${input.sampleId}` : 'Document / image extraction');

  const prompt = `You are FreBob, an SME operations assistant for Nigerian retail.
First classify whether this ${input.source} input is business-related.
Business-related means: sales, orders, reservations, payments, invoices, receipts, stock or product/service enquiry for goods or services.
NOT business-related: personal greetings, social chat, spam, or anything without a commercial transaction or inventory intent.

If NOT business-related, return ONLY JSON:
{ "relevant": false, "reason": "short merchant-friendly explanation" }

If business-related, extract structured fields. Currency is Nigerian Naira. Preserve product model numbers; do not invent missing prices — list uncertain field names in uncertainFields.
Return ONLY JSON:
{
  "relevant": true,
  "eventType": string,
  "customerName": string,
  "productName": string,
  "variant": string | optional,
  "quantity": number,
  "unitPrice": number,
  "amountPaid": number,
  "orderStatus": "enquiry"|"reserved"|"confirmed"|"cancelled"|"fulfilled",
  "paymentMethod": "cash"|"transfer"|"pos"|"other",
  "uncertainFields": string[]
}
Do not include total, balance, or paymentStatus — the server computes those.
Input text (may be empty if image-only):
${sourceText}`;

  type Part =
    | { text: string }
    | { inline_data: { mime_type: string; data: string } };

  const parts: Part[] = [{ text: prompt }];
  if (input.imageBase64) {
    const raw = input.imageBase64.includes(',')
      ? input.imageBase64.split(',').pop()!
      : input.imageBase64;
    parts.push({
      inline_data: {
        mime_type: input.mimeType || 'image/jpeg',
        data: raw.replace(/\s/g, ''),
      },
    });
  }

  const { text } = await geminiGenerateContent({
    parts,
    temperature: 0.1,
    json: true,
  });

  const raw = parseGeminiJsonText(text) as Record<string, unknown>;
  if (raw.relevant === false) {
    throw new ExtractionIrrelevantError(
      String(
        raw.reason ||
          'This does not look like a business sale, order, invoice, or receipt.',
      ),
    );
  }

  const quantity = Number(raw.quantity) || 1;
  const unitPrice = Number(raw.unitPrice) || 0;
  const amountPaid = Number(raw.amountPaid) || 0;
  const total = quantity * unitPrice;
  const balance = Math.max(0, total - amountPaid);

  const draft = {
    eventType: String(raw.eventType ?? 'Sale'),
    customerName: String(raw.customerName ?? 'Unknown customer'),
    productName: String(raw.productName ?? 'Unknown product'),
    variant: raw.variant ? String(raw.variant) : undefined,
    quantity,
    unitPrice,
    total,
    amountPaid,
    balance,
    paymentStatus:
      amountPaid <= 0 ? 'unpaid' : amountPaid >= total ? 'paid' : 'partially_paid',
    orderStatus: raw.orderStatus ?? 'enquiry',
    paymentMethod: raw.paymentMethod ?? 'transfer',
    uncertainFields: Array.isArray(raw.uncertainFields)
      ? raw.uncertainFields.map(String)
      : [],
  };

  const parsed = extractedFieldsSchema.safeParse(draft);
  if (!parsed.success) return null;

  return {
    extractionId: crypto.randomUUID(),
    sourceText: input.imageBase64
      ? `${sourceText}\n[image attached for OCR]`
      : sourceText,
    fields: parsed.data,
  };
}

function runMockExtraction(
  input: ExtractRequest,
): { extractionId: string; fields: ExtractedFields; sourceText: string } {
  const text = (input.text ?? '').toLowerCase();
  const extractionId = crypto.randomUUID();

  if (input.sampleId === 'sample_flagship' || text.includes('a15')) {
    const quantity = 2;
    const unitPrice = 185000;
    const amountPaid = 200000;
    const total = quantity * unitPrice;
    return {
      extractionId,
      sourceText: input.text ?? 'Flagship Samsung A15 sample',
      fields: {
        eventType: 'Reservation / sale order',
        customerName: 'Ada Okoro',
        productName: 'Samsung A15',
        variant: '128GB',
        quantity,
        unitPrice,
        total,
        amountPaid,
        balance: Math.max(0, total - amountPaid),
        paymentStatus: 'partially_paid',
        orderStatus: 'reserved',
        paymentMethod: 'transfer',
        uncertainFields: [],
      },
    };
  }

  if (input.source === 'sms' || text.includes('sold')) {
    const quantity = 1;
    const unitPrice = 185000;
    const amountPaid = 185000;
    return {
      extractionId,
      sourceText: input.text ?? 'SMS simulation',
      fields: {
        eventType: 'Sale',
        customerName: 'SMS customer',
        productName: 'Samsung A15',
        variant: '128GB',
        quantity,
        unitPrice,
        total: unitPrice,
        amountPaid,
        balance: 0,
        paymentStatus: 'paid',
        orderStatus: 'confirmed',
        paymentMethod: text.includes('cash') ? 'cash' : 'transfer',
        uncertainFields: ['customerName'],
      },
    };
  }

  if (input.source === 'scanner' || input.imageBase64) {
    const quantity = 2;
    const unitPrice = 12000;
    const total = 24000;
    return {
      extractionId,
      sourceText: 'Mock receipt OCR placeholder',
      fields: {
        eventType: 'Sale',
        customerName: 'Receipt customer',
        productName: '25W Fast Charger',
        quantity,
        unitPrice,
        total,
        amountPaid: total,
        balance: 0,
        paymentStatus: 'paid',
        orderStatus: 'confirmed',
        paymentMethod: 'cash',
        uncertainFields: ['customerName'],
      },
    };
  }

  const quantity = 1;
  const unitPrice = 75000;
  const total = unitPrice * quantity;
  return {
    extractionId,
    sourceText: input.text ?? 'Generic extraction placeholder',
    fields: {
      eventType: 'Sale',
      customerName: 'Unknown customer',
      productName: 'Galaxy Buds FE',
      quantity,
      unitPrice,
      total,
      amountPaid: 0,
      balance: total,
      paymentStatus: 'unpaid',
      orderStatus: 'enquiry',
      paymentMethod: 'transfer',
      uncertainFields: ['customerName', 'amountPaid'],
    },
  };
}

export function recomputeMoney(fields: ExtractedFields): ExtractedFields {
  const total = fields.unitPrice * fields.quantity;
  const balance = Math.max(0, total - fields.amountPaid);
  let paymentStatus: ExtractedFields['paymentStatus'] = 'unpaid';
  if (fields.amountPaid <= 0) paymentStatus = 'unpaid';
  else if (fields.amountPaid >= total) paymentStatus = 'paid';
  else paymentStatus = 'partially_paid';
  return { ...fields, total, balance, paymentStatus };
}
