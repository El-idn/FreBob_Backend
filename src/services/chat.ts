import { listConversations, listCustomers, listMemories, listOrders, listProducts } from '../repo/index.js';
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
 * Sole knowledge Gemini may use for Bob chat:
 * - simulatedConversations: approved WhatsApp/SMS/receipt transcripts (simulated capture)
 * - aggregatedBusinessData: orders, customers, products, memories, metrics from merchant approve/entry
 */
async function buildContextPack(businessId: string) {
  const orders = await listOrders(businessId);
  const customers = await listCustomers(businessId);
  const products = await listProducts(businessId);
  const memories = await listMemories(businessId);
  const conversations = await listConversations(businessId, 8);
  const metrics = await dashboardMetrics(businessId);

  const todays = orders.filter((o) => isToday(o.createdAt) && o.orderStatus !== 'cancelled');
  const owing = customers.filter((c) => c.balanceOwed > 0);
  const lowStock = products.filter((p) => p.available <= p.lowStockThreshold);

  return {
    dataPolicy:
      'ONLY_SOURCE_OF_TRUTH: answer exclusively from simulatedConversations and aggregatedBusinessData in this JSON. No web knowledge, no general advice, no inventing.',
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

  const prompt = `You are FreBob (Bob), a business assistant for ONE Nigerian SME.

HARD RULE — allowed knowledge sources (nothing else):
1) simulatedConversations — WhatsApp/SMS/receipt transcripts the merchant captured and approved (simulated business chats).
2) aggregatedBusinessData — metrics, orders, customers, products, stock, memories derived from what the merchant entered or approved in FreBob.

FORBIDDEN:
- Outside world knowledge, news, generic SME tips, guessing prices/stock/customers
- Unapproved sample chats that are not in simulatedConversations
- Inventing facts not present in the JSON

If the JSON does not contain enough to answer, say you do not have that in the merchant’s FreBob data yet (suggest capture + approve). Write a fresh natural reply — no canned templates.
Reply in ${langNames[input.language]}.
Return ONLY JSON: { "answer": string, "evidence": string }
evidence must name which fields you used (e.g. "simulatedConversations · jollof order" or "aggregatedBusinessData.metrics").

Question: ${input.question}

Merchant data (sole source of truth):
${JSON.stringify(input.context)}`;

  const text = await geminiGenerateJson({ prompt, temperature: 0.2 });
  let raw: { answer?: string; evidence?: string };
  try {
    raw = parseGeminiJsonText(text) as { answer?: string; evidence?: string };
  } catch (err) {
    throw new Error(
      `Gemini JSON parse failed: ${err instanceof Error ? err.message : String(err)} · body=${text.slice(0, 160)}`,
    );
  }
  if (!raw.answer) {
    throw new Error(`Gemini response missing answer · body=${text.slice(0, 160)}`);
  }
  return {
    text: String(raw.answer),
    evidence: String(raw.evidence ?? 'Merchant FreBob data'),
    intent: 'gemini',
  };
}

function unavailableReply(language: Lang) {
  return {
    text: UNAVAILABLE[language],
    evidence: 'AI unavailable',
    intent: 'error',
  };
}

/** Gemini answers only from simulated + merchant-aggregated FreBob data. */
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
