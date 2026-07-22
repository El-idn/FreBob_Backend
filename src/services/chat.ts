import { listCustomers, listMemories, listOrders, listProducts } from '../repo/index.js';
import { dashboardMetrics } from './chatMetrics.js';

export { dashboardMetrics } from './chatMetrics.js';

const REPLIES = {
  sales: {
    en: 'Today’s approved sales value is based on confirmed orders only.',
    pcm: 'Wetin you sell today na only the ones you don approve.',
    yo: 'Iye tita ti o fọwọ́ sí lónìí nìkan ni a ń lo.',
    ha: 'Kudiyar sayarwa ta yau tana danganta ne kawai da umarni da aka amince.',
    ig: 'Ego e rere taa dabere na iwu e kwadoro naanị.',
  },
  moneyIn: {
    en: 'Money received today from approved payments:',
    pcm: 'Money wey enter today from approved payments:',
    yo: 'Owó tí o gba lónìí látàrí ìsanwó tí a fọwọ́ sí:',
    ha: 'Kudin da aka karɓa yau daga biya da aka amince:',
    ig: 'Ego batara taa site n’ịkwụ ụgwọ e kwadoro:',
  },
  balance: {
    en: 'These customers still owe balances on approved orders.',
    pcm: 'Na these people still dey owe you for approved orders.',
    yo: 'Àwọn oníbàárà wọ̀nyí ṣì jẹ ọ́ níwọ̀n owó.',
    ha: 'Waɗannan abokan ciniki har yanzu suna bin ku biyan kuɗi.',
    ig: 'Ndị ahịa ndị a ka ji gị ụgwọ.',
  },
  bestSeller: {
    en: 'Your top-selling product from approved orders is:',
    pcm: 'Product wey sell pass from approved orders na:',
    yo: 'Ọjà tó ta jùlọ nínú àwọn ìbéèrè tí a fọwọ́ sí ni:',
    ha: 'Kayan da ya fi sayarwa daga umarni da aka amince shine:',
    ig: 'Ngwaahịa kacha ere site n’iwu e kwadoro bụ:',
  },
  stock: {
    en: 'These products are at or below the low-stock threshold.',
    pcm: 'These products don dey low for stock.',
    yo: 'Àwọn ọjà wọ̀nyí ti kéré ní ìkàsílẹ̀.',
    ha: 'Waɗannan kayayyaki sun yi ƙasa a stock.',
    ig: 'Ngwaahịa ndị a dị obere n’ụlọ ahịa.',
  },
  missing: {
    en: 'I don’t have enough approved data to answer that yet. Capture a chat or sale, then approve it.',
    pcm: 'I no get enough approved data to answer that. Capture something and approve am first.',
    yo: 'Mi ò ní ìwé tí a fọwọ́ sí tó tó láti dáhùn.',
    ha: 'Ba ni isasshen bayanai da aka amince na amsa wannan.',
    ig: 'Enweghị m data e kwadoro zuru ezu ịza nke ahụ.',
  },
} as const;

type Lang = keyof (typeof REPLIES)['sales'];

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const n = new Date();
  return (
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate()
  );
}

async function buildContextPack(businessId: string) {
  const orders = await listOrders(businessId);
  const customers = await listCustomers(businessId);
  const products = await listProducts(businessId);
  const memories = await listMemories(businessId);
  const metrics = await dashboardMetrics(businessId);

  const todays = orders.filter((o) => isToday(o.createdAt) && o.orderStatus !== 'cancelled');
  const owing = customers.filter((c) => c.balanceOwed > 0);
  const lowStock = products.filter((p) => p.available <= p.lowStockThreshold);

  return {
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
    memories: memories.slice(0, 10).map((m) => ({
      kind: m.kind,
      content: m.content,
    })),
  };
}

async function answerWithGemini(input: {
  businessId: string;
  question: string;
  language: Lang;
  context: Awaited<ReturnType<typeof buildContextPack>>;
}): Promise<{ text: string; evidence: string; intent: string } | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  const langNames: Record<Lang, string> = {
    en: 'English',
    pcm: 'Nigerian Pidgin',
    yo: 'Yoruba',
    ha: 'Hausa',
    ig: 'Igbo',
  };

  const prompt = `You are FreBob, a business operations assistant for one Nigerian SME.
Answer ONLY from the approved business context JSON below. Never invent orders, customers, prices, or stock.
If data is missing, say so clearly. Reply in ${langNames[input.language]}.
Return ONLY JSON: { "answer": string, "evidence": string }
Question: ${input.question}
Approved context:
${JSON.stringify(input.context)}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
    }),
  });
  if (!response.ok) throw new Error(`Gemini chat HTTP ${response.status}`);

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;
  const raw = JSON.parse(text) as { answer?: string; evidence?: string };
  if (!raw.answer) return null;
  return {
    text: String(raw.answer),
    evidence: String(raw.evidence ?? 'Approved business records'),
    intent: 'gemini',
  };
}

function answerWithRules(input: {
  question: string;
  language: Lang;
  context: Awaited<ReturnType<typeof buildContextPack>>;
}) {
  const lower = input.question.toLowerCase();
  const { metrics, balances, lowStock, todaysOrders } = input.context;
  const lang = input.language;

  const productSales = new Map<string, number>();
  // best seller approximated from context products via todays — use memories/orders already in pack
  let bestSeller = '—';

  type Intent = keyof typeof REPLIES;
  let key: Intent = 'missing';
  if (/owe|balance|lowo|ji ụgwọ|who still|tun je/.test(lower)) key = 'balance';
  else if (/money (in|enter|entered|received)|received today|how much money/.test(lower))
    key = 'moneyIn';
  else if (/sell pass|best seller|top.?sell|sold most|wetin i sell pass/.test(lower))
    key = 'bestSeller';
  else if (/stock|low|fọdụrụ|kaya|ngwaahịa|obere|almost out/.test(lower)) key = 'stock';
  else if (/sell|sold|sales|sayarwa|tita|how much did i/.test(lower)) key = 'sales';

  let detail = '';
  let evidence = '';
  if (key === 'sales') {
    detail = ` ₦${metrics.salesToday.toLocaleString('en-NG')} across ${metrics.ordersToday} order(s).`;
    evidence = `${todaysOrders.length} approved order(s) today`;
  } else if (key === 'moneyIn') {
    detail = ` ₦${metrics.moneyInToday.toLocaleString('en-NG')}.`;
    evidence = `Payments on ${metrics.ordersToday} approved order(s) today`;
  } else if (key === 'balance') {
    detail =
      balances.length === 0
        ? ' Nobody currently owes a balance.'
        : ` ${balances.map((c) => `${c.name} (₦${c.balanceOwed.toLocaleString('en-NG')})`).join(', ')}.`;
    evidence =
      balances.length === 0
        ? 'Customer balances (none outstanding)'
        : balances.map((c) => c.name).join(', ');
  } else if (key === 'bestSeller') {
    // derive from lowStock/products sales not fully in pack — use first memory or dash
    for (const o of todaysOrders) {
      const name = o.items.split(',')[0]?.replace(/^\d+x\s*/, '').trim();
      if (name) {
        productSales.set(name, (productSales.get(name) ?? 0) + 1);
      }
    }
    let bestQty = 0;
    for (const [name, qty] of productSales) {
      if (qty > bestQty) {
        bestQty = qty;
        bestSeller = name;
      }
    }
    detail = ` ${bestSeller}.`;
    evidence = 'Approved order line items';
  } else if (key === 'stock') {
    detail =
      lowStock.length === 0
        ? ' No products are low right now.'
        : ` ${lowStock.map((p) => `${p.name} (${p.available} left)`).join(', ')}.`;
    evidence =
      lowStock.length === 0 ? 'Inventory thresholds' : lowStock.map((p) => p.name).join(', ');
  } else {
    evidence = 'No matching approved records';
  }

  return {
    text: `${REPLIES[key][lang]}${detail}`,
    evidence,
    intent: key,
  };
}

export async function answerChat(input: {
  businessId: string;
  question: string;
  language?: string;
}) {
  const lang = (['en', 'pcm', 'yo', 'ha', 'ig'].includes(input.language ?? '')
    ? input.language
    : 'en') as Lang;

  const context = await buildContextPack(input.businessId);

  if (process.env.GEMINI_API_KEY) {
    try {
      const gemini = await answerWithGemini({
        businessId: input.businessId,
        question: input.question,
        language: lang,
        context,
      });
      if (gemini) return gemini;
    } catch (err) {
      console.warn('Gemini chat failed, using rules:', err);
    }
  }

  return answerWithRules({ question: input.question, language: lang, context });
}
