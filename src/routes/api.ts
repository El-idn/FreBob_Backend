import { Router } from 'express';
import { z } from 'zod';
import {
  approveRequestSchema,
  extractRequestSchema,
  paymentMethodSchema,
  rejectRequestSchema,
  ttsRequestSchema,
} from '../schemas.js';
import { requireAuth, requireBusinessAccess } from '../middleware/auth.js';
import { approveExtraction } from '../services/approve.js';
import { answerChat, dashboardMetrics } from '../services/chat.js';
import { recomputeMoney, runExtraction } from '../services/extraction.js';
import { cancelOrder, recordPayment } from '../services/orders.js';
import { synthesizeSpeech, yarnGptConfigured } from '../services/voice.js';
import {
  addProduct,
  bootstrapAppUser,
  createBusinessForAuthUser,
  DEMO_BUSINESS_ID,
  getAppUserByAuthId,
  getBusiness,
  listBusinessesForAuthUser,
  listCustomers,
  listMemories,
  listOrders,
  listProducts,
  resetDemoStore,
  saveExtraction,
  storeMode,
  updateExtractionStatus,
} from '../repo/index.js';
import { getSupabase } from '../supabase.js';

function param(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'frebob-server',
    store: storeMode(),
    supabaseConfigured: Boolean(getSupabase()),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    yarnGptConfigured: yarnGptConfigured(),
    demoBusinessId: DEMO_BUSINESS_ID,
    time: new Date().toISOString(),
  });
});

apiRouter.post('/demo/reset', (req, res) => {
  if (getSupabase()) {
    res.status(400).json({
      error: 'Demo reset is only available in memory mode (no Supabase).',
    });
    return;
  }
  if (req.header('X-Demo-Mode') !== '1') {
    res.status(401).json({ error: 'Send X-Demo-Mode: 1 to reset demo data' });
    return;
  }
  resetDemoStore();
  res.json({ ok: true, businessId: DEMO_BUSINESS_ID });
});

apiRouter.get('/auth/me', requireAuth, async (req, res, next) => {
  try {
    const authUserId = req.auth!.authUserId!;
    const user = await getAppUserByAuthId(authUserId);
    if (!user) {
      res.status(404).json({
        error: 'Profile not found',
        hint: 'Call POST /v1/auth/bootstrap after sign-up.',
      });
      return;
    }
    const businesses = await listBusinessesForAuthUser(authUserId);
    res.json({ user, businesses });
  } catch (err) {
    next(err);
  }
});

apiRouter.post('/auth/bootstrap', requireAuth, async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(1).optional(),
      preferredLanguage: z.enum(['en', 'pcm', 'yo', 'ha', 'ig']).optional(),
    });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid bootstrap payload', details: parsed.error.flatten() });
      return;
    }

    const authUserId = req.auth!.authUserId!;
    const supabase = getSupabase()!;
    const header = req.header('Authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    const { data: authData } = await supabase.auth.getUser(token);
    const email = authData.user?.email ?? '';
    const metaName =
      typeof authData.user?.user_metadata?.name === 'string'
        ? authData.user.user_metadata.name
        : undefined;

    const user = await bootstrapAppUser({
      authUserId,
      email,
      name: parsed.data.name || metaName || email.split('@')[0] || 'FreBob user',
      preferredLanguage: parsed.data.preferredLanguage,
    });
    const businesses = await listBusinessesForAuthUser(authUserId);
    res.json({ user, businesses });
  } catch (err) {
    next(err);
  }
});

apiRouter.post('/auth/businesses', requireAuth, async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(2),
      category: z.string().optional(),
      location: z.string().optional(),
      phone: z.string().optional(),
      currency: z.string().min(3).optional(),
      preferredLanguage: z.enum(['en', 'pcm', 'yo', 'ha', 'ig']).optional(),
      starterProducts: z
        .array(
          z.object({
            name: z.string().min(2),
            unitPrice: z.number().nonnegative().optional(),
            available: z.number().int().nonnegative().optional(),
            variant: z.string().optional(),
          }),
        )
        .optional(),
      inventoryNotes: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid business payload', details: parsed.error.flatten() });
      return;
    }

    const authUserId = req.auth!.authUserId!;
    const result = await createBusinessForAuthUser({
      authUserId,
      name: parsed.data.name,
      category: parsed.data.category,
      location: parsed.data.location,
      phone: parsed.data.phone,
      currency: parsed.data.currency,
      preferredLanguage: parsed.data.preferredLanguage,
      starterProducts: (parsed.data.starterProducts ?? []).map((p) => ({
        name: p.name,
        unitPrice: p.unitPrice ?? 10_000,
        available: p.available ?? 10,
        variant: p.variant,
      })),
    });

    if (parsed.data.inventoryNotes?.trim()) {
      const note = parsed.data.inventoryNotes.trim();
      const { error } = await getSupabase()!.from('business_memories').insert({
        id: crypto.randomUUID(),
        business_id: result.business.id,
        kind: 'onboarding',
        content: note,
        trust_level: 'suggested',
      });
      if (error) console.warn('inventory notes memory failed:', error.message);
    }

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

apiRouter.post('/extract', requireBusinessAccess, async (req, res, next) => {
  try {
    const parsed = extractRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid extract payload', details: parsed.error.flatten() });
      return;
    }

    const result = await runExtraction(parsed.data);
    const fields = recomputeMoney(result.fields);
    const now = new Date().toISOString();

    await saveExtraction({
      id: result.extractionId,
      businessId: parsed.data.businessId,
      source: parsed.data.source,
      sourceText: result.sourceText,
      fields,
      status: 'unconfirmed',
      createdAt: now,
    });

    res.status(201).json({
      extractionId: result.extractionId,
      status: 'unconfirmed',
      source: parsed.data.source,
      sourceText: result.sourceText,
      fields,
    });
  } catch (err) {
    next(err);
  }
});

apiRouter.post('/extractions/:id/approve', requireBusinessAccess, async (req, res, next) => {
  try {
    const body = { ...req.body, extractionId: param(req.params.id) };
    const parsed = approveRequestSchema.safeParse(body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid approve payload', details: parsed.error.flatten() });
      return;
    }

    const result = await approveExtraction(parsed.data);
    if (!result.ok) {
      res.status(result.status).json({ error: result.reason });
      return;
    }

    res.json({
      ok: true,
      orderId: result.orderId,
      order: result.order,
    });
  } catch (err) {
    next(err);
  }
});

apiRouter.post('/extractions/:id/reject', requireBusinessAccess, async (req, res, next) => {
  try {
    const body = { ...req.body, extractionId: param(req.params.id) };
    const parsed = rejectRequestSchema.safeParse(body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid reject payload', details: parsed.error.flatten() });
      return;
    }
    await updateExtractionStatus(parsed.data.extractionId, 'rejected');
    res.json({ ok: true, status: 'rejected' });
  } catch (err) {
    next(err);
  }
});

apiRouter.get('/businesses/:businessId', requireBusinessAccess, async (req, res, next) => {
  try {
    const business = await getBusiness(param(req.params.businessId));
    if (!business) {
      res.status(404).json({ error: 'Business not found' });
      return;
    }
    res.json({ business });
  } catch (err) {
    next(err);
  }
});

apiRouter.get('/businesses/:businessId/products', requireBusinessAccess, async (req, res, next) => {
  try {
    const products = await listProducts(param(req.params.businessId));
    res.json({ products });
  } catch (err) {
    next(err);
  }
});

apiRouter.post('/businesses/:businessId/products', requireBusinessAccess, async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(2),
      variant: z.string().optional(),
      unitPrice: z.number().nonnegative(),
      available: z.number().int().nonnegative(),
      lowStockThreshold: z.number().int().positive().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid product', details: parsed.error.flatten() });
      return;
    }
    const product = await addProduct({
      businessId: param(req.params.businessId),
      name: parsed.data.name,
      variant: parsed.data.variant,
      unitPrice: parsed.data.unitPrice,
      available: parsed.data.available,
      reserved: 0,
      lowStockThreshold: parsed.data.lowStockThreshold ?? 5,
    });
    res.status(201).json({ product });
  } catch (err) {
    next(err);
  }
});

apiRouter.get('/businesses/:businessId/customers', requireBusinessAccess, async (req, res, next) => {
  try {
    const customers = await listCustomers(param(req.params.businessId));
    res.json({ customers });
  } catch (err) {
    next(err);
  }
});

apiRouter.get('/businesses/:businessId/orders', requireBusinessAccess, async (req, res, next) => {
  try {
    const orders = await listOrders(param(req.params.businessId));
    res.json({ orders });
  } catch (err) {
    next(err);
  }
});

apiRouter.post(
  '/businesses/:businessId/orders/:orderId/payments',
  requireBusinessAccess,
  async (req, res, next) => {
    try {
      const schema = z.object({
        amount: z.number().positive(),
        method: paymentMethodSchema.optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid payment', details: parsed.error.flatten() });
        return;
      }
      const result = await recordPayment({
        businessId: param(req.params.businessId),
        orderId: param(req.params.orderId),
        amount: parsed.data.amount,
        method: parsed.data.method,
      });
      if (!result.ok) {
        res.status(result.status).json({ error: result.reason });
        return;
      }
      res.json({ ok: true, order: result.order, payment: result.payment });
    } catch (err) {
      next(err);
    }
  },
);

apiRouter.post(
  '/businesses/:businessId/orders/:orderId/cancel',
  requireBusinessAccess,
  async (req, res, next) => {
    try {
      const result = await cancelOrder({
        businessId: param(req.params.businessId),
        orderId: param(req.params.orderId),
      });
      if (!result.ok) {
        res.status(result.status).json({ error: result.reason });
        return;
      }
      res.json({ ok: true, order: result.order });
    } catch (err) {
      next(err);
    }
  },
);

apiRouter.get('/businesses/:businessId/memories', requireBusinessAccess, async (req, res, next) => {
  try {
    const memories = await listMemories(param(req.params.businessId));
    res.json({ memories });
  } catch (err) {
    next(err);
  }
});

apiRouter.get('/businesses/:businessId/dashboard', requireBusinessAccess, async (req, res, next) => {
  try {
    const metrics = await dashboardMetrics(param(req.params.businessId));
    res.json(metrics);
  } catch (err) {
    next(err);
  }
});

apiRouter.post('/businesses/:businessId/chat', requireBusinessAccess, async (req, res, next) => {
  try {
    const schema = z.object({
      question: z.string().min(1),
      language: z.enum(['en', 'pcm', 'yo', 'ha', 'ig']).optional(),
      speak: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid chat payload', details: parsed.error.flatten() });
      return;
    }
    const language = parsed.data.language ?? 'en';
    const answer = await answerChat({
      businessId: param(req.params.businessId),
      question: parsed.data.question,
      language,
    });

    let voice: Awaited<ReturnType<typeof synthesizeSpeech>> | undefined;
    if (parsed.data.speak) {
      try {
        voice = await synthesizeSpeech({
          text: answer.text,
          language,
        });
      } catch (err) {
        console.warn('TTS after chat failed:', err);
        voice = {
          supported: false,
          reason: err instanceof Error ? err.message : 'TTS failed',
          audioBase64: null,
        };
      }
    }

    res.json({ ...answer, voice });
  } catch (err) {
    next(err);
  }
});

apiRouter.post('/tts', requireBusinessAccess, async (req, res, next) => {
  try {
    const parsed = ttsRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid TTS payload', details: parsed.error.flatten() });
      return;
    }
    if (!yarnGptConfigured() && parsed.data.language !== 'pcm') {
      res.status(503).json({
        supported: false,
        reason: 'YARNGPT_API_KEY is not configured on the server.',
        audioBase64: null,
      });
      return;
    }
    const result = await synthesizeSpeech({
      text: parsed.data.text,
      language: parsed.data.language,
      voice: parsed.data.voice,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});
