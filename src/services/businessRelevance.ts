import type { ExtractRequest } from '../schemas.js';

/** Thrown when input is not a business sale/order/invoice/receipt-style message. */
export class ExtractionIrrelevantError extends Error {
  reason: string;

  constructor(reason: string) {
    super(reason);
    this.name = 'ExtractionIrrelevantError';
    this.reason = reason;
  }
}

const BUSINESS_HINT =
  /₦|\bnaira\b|\bpay|\bpaid|\btransfer|\bcash|\bpos\b|\border|\bsell|\bsold|\bbuy|\bprice|\bhow much|\binvoice|\breceipt|\bstock|\bkeep\b|\breserve|\bqty\b|\bquantity|\bpcs\b|\bpack|\bdeliver|\bbalance|\bowe|\bproduct|\bgoods|\bitem\b|\bcustomer:|\bseller:|\bcharg|\bphone|\bjollof|\bsuya|\bmalaria|\blaundry|\banakra|\banara|\bwholesale|\brice\b|\bnoodles|\bdetergent|\bbuds|\bsamsung|\bgalaxy|\ba15|\ba05|\bbraid|\bmanicure|\bsuit\b|\bumbrella|\bbale\b/i;

const GREETING_LINE =
  /^(customer:\s*|seller:\s*)?(how far|how are you|good morning|good evening|good afternoon|hello|hi|sup|wetin dey|you dey|ok|okay|thanks|thank you|lol|haha|abeg|please call me|see you|i dey fine|i'm fine)[\s!.?]*$/i;

/**
 * Heuristic for mock / offline extract. Gemini does a stronger classification when configured.
 */
export function isBusinessRelevantText(text: string): boolean {
  const t = text.trim();
  if (t.length < 6) return false;
  if (GREETING_LINE.test(t)) return false;

  const lines = t
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const bodyLines = lines.map((line) => line.replace(/^[^:]+:\s*/i, '').trim());
  if (
    bodyLines.length > 0 &&
    bodyLines.length <= 3 &&
    bodyLines.every((line) => GREETING_LINE.test(line) || line.length < 10)
  ) {
    return BUSINESS_HINT.test(t);
  }

  if (BUSINESS_HINT.test(t)) return true;
  if (/\d{3,}/.test(t) && /(want|need|keep|buy|sell|pay|order|for me|deliver)/i.test(t)) {
    return true;
  }
  return false;
}

export function assertBusinessRelevant(input: ExtractRequest): void {
  if (input.sampleId) return;
  if (input.source === 'scanner' || input.source === 'manual') return;
  if (input.imageBase64) return;

  const text = input.text?.trim() ?? '';
  if (!text) {
    throw new ExtractionIrrelevantError(
      'No conversation text to extract. Paste a business chat, SMS, or receipt.',
    );
  }
  if (!isBusinessRelevantText(text)) {
    throw new ExtractionIrrelevantError(
      'This does not look like a business sale, order, invoice, or receipt. Paste a customer order chat or receipt instead.',
    );
  }
}
