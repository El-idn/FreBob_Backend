import { PRODUCT_KNOWLEDGE } from '../data/productKnowledge.js';
import { getBusiness, listConversations, listCustomers, listMemories, listOrders, listProducts } from '../repo/index.js';
import { dashboardMetrics } from './chatMetrics.js';
import { geminiGenerateJson, getGeminiApiKey, parseGeminiJsonText } from './gemini.js';

export { dashboardMetrics } from './chatMetrics.js';

type Lang = 'en' | 'pcm' | 'yo' | 'ha' | 'ig';

const UNAVAILABLE = {
  en: 'Bob AI is unavailable right now. Check that Gemini is configured on the FreBob server, then try again.',
  pcm: 'Bob AI no dey available now. Make sure Gemini dey set for FreBob server, then try again.',
  yo: 'Bob AI kò sí nísinsin yìí. Rí i dájú pé Gemini wà lórí ẹ̀rọ FreBob, kí o tún gbìyànjú.',
  ha: 'Bob AI ba ya samuwa yanzu. Tabbatar da an saita Gemini a uwar garken FreBob, sa\'an nan sake gwadawa.',
  ig: 'Bob AI adịghị ugbu a. Gbaa mbọ hụ na Gemini dị na sava FreBob, wee nwaa ọzọ.',
} as const;

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const n = new Date();
  return (
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate()
  );
}

function truncateTranscript(text: string, max = 500): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

/**
 * Knowledge Gemini may use for Bob chat:
 * - productKnowledge: curated FreBob identity / trust / FAQ (not the open web)
 * - businessProfile: this merchant’s shop name/category for personalization
 * - simulatedConversations: approved WhatsApp/SMS/receipt transcripts
 * - aggregatedBusinessData: orders, customers, products, memories, metrics
 */
async function buildContextPack(businessId: string) {
  const [business, orders, customers, products, memories, conversations, metrics] =
    await Promise.all([
      getBusiness(businessId),
      listOrders(businessId),
      listCustomers(businessId),
      listProducts(businessId),
      listMemories(businessId),
      listConversations(businessId, 8),
      dashboardMetrics(businessId),
    ]);

  const todays = orders.filter((o) => isToday(o.createdAt) && o.orderStatus !== 'cancelled');
  const owing = customers.filter((c) => c.balanceOwed > 0);
  const lowStock = products.filter((p) => p.available <= p.lowStockThreshold);

  return {
    dataPolicy:
      'SOURCE RULES: (1) App/product/trust/FAQ questions → productKnowledge only (plus businessProfile for addressing the merchant). (2) Merchant ops facts (sales, stock, balances, customers, orders, what happened in chats) → only simulatedConversations and aggregatedBusinessData. (3) You may weave product value WITH this merchant’s live numbers when helpful. (4) No open web, news, or inventing merchant facts.',
    productKnowledge: PRODUCT_KNOWLEDGE,
    businessProfile: business
      ? {
          name: business.name,
          category: business.category,
          location: business.location,
          currency: business.currency,
          preferredLanguage: business.preferredLanguage,
        }
      : null,
    simulatedConversations: conversations.map((c) => ({
      label: c.sourceLabel,
      transcript: truncateTranscript(c.sourceText),
      approvedAt: c.createdAt,
    })),
    aggregatedBusinessData: {
      metrics,
      todaysOrders: todays.slice(0, 8).map((o) => ({
        id: o.id,
        customerName: o.customerName,
        total: o.total,
        amountPaid: o.amountPaid,
        balance: o.balance,
        status: o.orderStatus,
        items: o.items.map((i) => `${i.quantity}x ${i.productName}`).join(', '),
      })),
      balances: owing.map((c) => ({ name: c.name, balanceOwed: c.balanceOwed })),
      lowStock: lowStock.map((p) => ({
        name: p.name,
        variant: p.variant,
        available: p.available,
        reserved: p.reserved,
      })),
      products: products.map((p) => ({
        name: p.name,
        variant: p.variant,
        available: p.available,
        unitPrice: p.unitPrice,
      })),
      customers: customers.slice(0, 40).map((c) => ({
        name: c.name,
        balanceOwed: c.balanceOwed,
      })),
      memories: memories.slice(0, 10).map((m) => ({
        kind: m.kind,
        content: m.content,
      })),
    },
  };
}

async function answerWithGemini(input: {
  businessId: string;
  question: string;
  language: Lang;
  context: Awaited<ReturnType<typeof buildContextPack>>;
}): Promise<{ text: string; evidence: string; intent: string } | null> {
  if (!getGeminiApiKey()) return null;

  const langNames: Record<Lang, string> = {
    en: 'English',
    pcm: 'Nigerian Pidgin',
    yo: 'Yoruba',
    ha: 'Hausa',
    ig: 'Igbo',
  };

  const shopName = input.context.businessProfile?.name?.trim();
  const addressAs = shopName ? `the owner of ${shopName}` : 'this merchant';

  const prompt = `You are FreBob — people call you Bob. You are speaking directly to ${addressAs}, a Nigerian SME user of the FreBob app.

VOICE (mandatory):
- Second person (“you”, “your shop”). Warm, clear, helpful — like a sharp business partner, not a report generator.
- Answer the question first in 1–3 short paragraphs. Feel like you are responding to THIS person.
- Do NOT open with “Based on your business data”, “Based on your FreBob data”, “According to the records”, or similar.
- Do NOT sound like a refusal template. If merchant ops data is missing, say so plainly and invite them to capture + approve — still friendly.

HARD RULE — allowed knowledge sources (nothing else):
1) productKnowledge — FreBob identity, how it works, capabilities, trust/money, privacy, FAQ. Use this for “what is FreBob?”, “do you keep my money?”, benefits of the app, languages, how capture works, etc.
2) businessProfile — shop name/category for personalization only (not inventing sales).
3) simulatedConversations — WhatsApp/SMS/receipt transcripts the merchant captured and approved.
4) aggregatedBusinessData — metrics, orders, customers, products, stock, memories from what they entered or approved.

FORBIDDEN:
- Outside world knowledge, news, generic SME tips unrelated to FreBob or their JSON
- Inventing prices, stock, customers, or balances not in the JSON
- Claiming FreBob holds, escrows, or moves money (productKnowledge.trustAndMoney is authoritative)
- Describing FreBob as only a WhatsApp-import demo; sample WhatsApp seed is optional exploration, not the whole product

When beneficial (e.g. “what do I benefit?”), combine productKnowledge with their real metrics, balances, and customer names from aggregatedBusinessData.
If an ops question cannot be answered from simulatedConversations / aggregatedBusinessData, say you do not have that in their FreBob records yet and suggest capture + approve.
Reply in ${langNames[input.language]}.
Return ONLY valid JSON with exactly two string fields: { "answer": string, "evidence": string }
JSON rules: escape any double quotes inside strings as \\"; for paragraph breaks use \\n (escaped) so the JSON stays valid — do not insert raw line breaks inside the JSON string values; write Naira amounts as NGN 370000 or NGN 370,000 (avoid special currency glyphs).
evidence must name which fields you used (e.g. "productKnowledge.trustAndMoney", "aggregatedBusinessData.metrics", "simulatedConversations").

Question: ${input.question}

Context pack:
${JSON.stringify(input.context)}`;

  const text = await geminiGenerateJson({ prompt, temperature: 0.35 });
  let raw: { answer?: string; evidence?: string };
  try {
    raw = parseGeminiJsonText(text) as { answer?: string; evidence?: string };
  } catch (err) {
    throw new Error(
      `Gemini JSON parse failed: ${err instanceof Error ? err.message : String(err)} · body=${text.slice(0, 220)}`,
    );
  }
  if (!raw.answer?.trim()) {
    throw new Error(`Gemini response missing answer · body=${text.slice(0, 220)}`);
  }
  return {
    text: unescapeChatText(String(raw.answer).trim()),
    evidence: unescapeChatText(String(raw.evidence ?? 'FreBob context').trim()),
    intent: 'gemini',
  };
}

/** Turn leftover \\n / \\t sequences into real whitespace (loose Gemini JSON recovery). */
function unescapeChatText(value: string): string {
  if (!/\\[nrt"\\]/.test(value)) return value;
  return value
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

function unavailableReply(language: Lang) {
  return {
    text: UNAVAILABLE[language],
    evidence: 'AI unavailable',
    intent: 'error',
  };
}

/** Gemini answers from productKnowledge + this merchant’s FreBob data. */
export async function answerChat(input: {
  businessId: string;
  question: string;
  language?: string;
}) {
  const lang = (['en', 'pcm', 'yo', 'ha', 'ig'].includes(input.language ?? '')
    ? input.language
    : 'en') as Lang;

  const context = await buildContextPack(input.businessId);

  if (!getGeminiApiKey()) {
    return unavailableReply(lang);
  }

  try {
    const gemini = await answerWithGemini({
      businessId: input.businessId,
      question: input.question,
      language: lang,
      context,
    });
    if (gemini) return gemini;
  } catch (err) {
    console.warn('Gemini chat failed:', err);
    const detail = err instanceof Error ? err.message : String(err);
    return {
      text: UNAVAILABLE[lang],
      evidence: `AI unavailable: ${detail.slice(0, 240)}`,
      intent: 'error',
    };
  }

  return unavailableReply(lang);
}
