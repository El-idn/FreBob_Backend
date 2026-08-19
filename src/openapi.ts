import { DEMO_BUSINESS_ID } from './data/seed.js';

type JsonObject = Record<string, unknown>;

const DEMO = DEMO_BUSINESS_ID;

const language = {
  type: 'string',
  enum: ['en', 'pcm', 'yo', 'ha', 'ig'],
} as const;

const captureSource = {
  type: 'string',
  enum: ['whatsapp', 'sms', 'scanner', 'manual', 'voice'],
} as const;

const paymentStatus = {
  type: 'string',
  enum: ['unpaid', 'partially_paid', 'paid'],
} as const;

const orderStatus = {
  type: 'string',
  enum: ['enquiry', 'reserved', 'confirmed', 'cancelled', 'fulfilled'],
} as const;

const paymentMethod = {
  type: 'string',
  enum: ['cash', 'transfer', 'pos', 'other'],
} as const;

const uuid = { type: 'string', format: 'uuid' } as const;
const isoDate = { type: 'string', format: 'date-time' } as const;

const ErrorSchema = {
  type: 'object',
  required: ['error'],
  properties: {
    error: { type: 'string' },
    hint: { type: 'string' },
    code: { type: 'string' },
    details: { type: 'object', additionalProperties: true },
    demoBusinessId: uuid,
  },
};

const json = (schema: JsonObject, example?: unknown) => ({
  content: {
    'application/json': {
      schema,
      ...(example !== undefined ? { example } : {}),
    },
  },
});

const errorResponse = (description: string) => ({
  description,
  ...json({ $ref: '#/components/schemas/Error' }),
});

const businessIdParam = {
  name: 'businessId',
  in: 'path',
  required: true,
  schema: uuid,
  example: DEMO,
};

const businessAccess = [{ bearerAuth: [] }, { demoMode: [] }];
const bearerOnly = [{ bearerAuth: [] }];
const demoOnly = [{ demoMode: [] }];

export const openApiSpec: JsonObject = {
  openapi: '3.0.3',
  info: {
    title: 'FreBob API',
    version: '1.0.0',
    description: [
      'Express BFF for the FreBob mobile app.',
      '',
      '**Auth**',
      '- Explore Demo / memory mode: Authorize with `demoMode` and value `1` (`X-Demo-Mode: 1`). Use business id `' +
        DEMO +
        '`.',
      '- Real users: Authorize with a Supabase `Bearer` access token. The user must be a member of the business.',
      '',
      'Money and stock mutations happen only after **Approve**. Extracted fields stay `unconfirmed` until then.',
    ].join('\n'),
  },
  servers: [
    { url: '/v1', description: 'This server' },
    { url: 'http://localhost:4000/v1', description: 'Local' },
  ],
  tags: [
    { name: 'Health', description: 'Liveness and provider flags' },
    { name: 'Demo', description: 'In-memory demo reset' },
    { name: 'Auth', description: 'Supabase JWT profile and onboarding' },
    { name: 'Extract', description: 'Capture → review → approve / reject' },
    { name: 'Business', description: 'Business profile and sync bundle' },
    { name: 'Catalog', description: 'Products and customers' },
    { name: 'Orders', description: 'Orders, payments, cancel' },
    { name: 'Memory', description: 'Approved notes and chat corpus' },
    { name: 'AI', description: 'Ask Bob, TTS, STT' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        security: [],
        responses: {
          200: {
            description: 'Service status',
            ...json(
              { $ref: '#/components/schemas/Health' },
              {
                ok: true,
                service: 'frebob-server',
                store: 'memory',
                supabaseConfigured: false,
                geminiConfigured: true,
                geminiModel: 'gemini-3.5-flash',
                yarnGptConfigured: true,
                demoBusinessId: DEMO,
                time: '2026-08-18T15:00:00.000Z',
              },
            ),
          },
        },
      },
    },
    '/demo/reset': {
      post: {
        tags: ['Demo'],
        summary: 'Reset in-memory demo data',
        description: 'Only available when Supabase is not configured. Requires `X-Demo-Mode: 1`. Pass an optional `category` to seed category-specific demo data.',
        security: demoOnly,
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  category: {
                    type: 'string',
                    description: 'Business category to seed. Defaults to Electronics if omitted.',
                    example: 'Food & Restaurant',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Demo store reset',
            ...json({
              type: 'object',
              required: ['ok', 'businessId'],
              properties: {
                ok: { type: 'boolean', example: true },
                businessId: uuid,
              },
            }),
          },
          400: errorResponse('Supabase is configured — reset is memory-mode only'),
          401: errorResponse('Missing X-Demo-Mode: 1'),
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Current profile and businesses',
        security: bearerOnly,
        responses: {
          200: {
            description: 'Signed-in user',
            ...json({ $ref: '#/components/schemas/AuthSession' }),
          },
          401: errorResponse('Missing or invalid Bearer token'),
          404: errorResponse('Profile not found — call POST /auth/bootstrap'),
          503: errorResponse('Supabase is not configured'),
        },
      },
    },
    '/auth/bootstrap': {
      post: {
        tags: ['Auth'],
        summary: 'Upsert public.users from the JWT',
        security: bearerOnly,
        requestBody: {
          required: false,
          ...json({ $ref: '#/components/schemas/BootstrapRequest' }),
        },
        responses: {
          200: {
            description: 'Profile upserted',
            ...json({ $ref: '#/components/schemas/AuthSession' }),
          },
          400: errorResponse('Invalid bootstrap payload'),
          401: errorResponse('Missing or invalid Bearer token'),
          503: errorResponse('Supabase is not configured'),
        },
      },
    },
    '/auth/businesses': {
      post: {
        tags: ['Auth'],
        summary: 'Create business and owner membership',
        security: bearerOnly,
        requestBody: {
          required: true,
          ...json({ $ref: '#/components/schemas/CreateBusinessRequest' }),
        },
        responses: {
          201: {
            description: 'Business created',
            ...json({ $ref: '#/components/schemas/CreateBusinessResponse' }),
          },
          400: errorResponse('Invalid business payload'),
          401: errorResponse('Missing or invalid Bearer token'),
          503: errorResponse('Supabase is not configured'),
        },
      },
    },
    '/extract': {
      post: {
        tags: ['Extract'],
        summary: 'Extract a sale from text, image, or voice transcript',
        description:
          'Uses Gemini when `GEMINI_API_KEY` is set; otherwise mock fixtures. Voice extract requires `text`. Server recomputes total, balance, and paymentStatus.',
        security: businessAccess,
        requestBody: {
          required: true,
          ...json(
            { $ref: '#/components/schemas/ExtractRequest' },
            {
              businessId: DEMO,
              source: 'whatsapp',
              sampleId: 'sample_flagship',
            },
          ),
        },
        responses: {
          201: {
            description: 'Unconfirmed extraction',
            ...json({ $ref: '#/components/schemas/ExtractResponse' }),
          },
          400: errorResponse('Invalid extract payload'),
          401: errorResponse('Unauthorized'),
          403: errorResponse('Not a member of this business'),
          422: errorResponse('Not business-related (code: not_business_related)'),
        },
      },
    },
    '/extractions/{id}/approve': {
      post: {
        tags: ['Extract'],
        summary: 'Approve extraction and persist order',
        security: businessAccess,
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: uuid,
            description: 'Extraction id',
          },
        ],
        requestBody: {
          required: true,
          ...json({ $ref: '#/components/schemas/ApproveRequest' }),
        },
        responses: {
          200: {
            description: 'Order created',
            ...json({ $ref: '#/components/schemas/ApproveResponse' }),
          },
          400: errorResponse('Invalid approve payload'),
          401: errorResponse('Unauthorized'),
          403: errorResponse('Not a member of this business'),
          404: errorResponse('Extraction not found'),
          409: errorResponse('Already approved/rejected or not enough stock'),
        },
      },
    },
    '/extractions/{id}/reject': {
      post: {
        tags: ['Extract'],
        summary: 'Reject extraction (no stock change)',
        security: businessAccess,
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: uuid,
          },
        ],
        requestBody: {
          required: true,
          ...json({ $ref: '#/components/schemas/RejectRequest' }),
        },
        responses: {
          200: {
            description: 'Rejected',
            ...json({
              type: 'object',
              required: ['ok', 'status'],
              properties: {
                ok: { type: 'boolean', example: true },
                status: { type: 'string', example: 'rejected' },
              },
            }),
          },
          400: errorResponse('Invalid reject payload'),
          401: errorResponse('Unauthorized'),
          404: errorResponse('Extraction not found for this business'),
        },
      },
    },
    '/businesses/{businessId}': {
      get: {
        tags: ['Business'],
        summary: 'Get business profile',
        security: businessAccess,
        parameters: [businessIdParam],
        responses: {
          200: {
            description: 'Business',
            ...json({
              type: 'object',
              required: ['business'],
              properties: { business: { $ref: '#/components/schemas/Business' } },
            }),
          },
          401: errorResponse('Unauthorized'),
          404: errorResponse('Business not found'),
        },
      },
      patch: {
        tags: ['Business'],
        summary: 'Update business profile',
        security: businessAccess,
        parameters: [businessIdParam],
        requestBody: {
          required: true,
          ...json({ $ref: '#/components/schemas/UpdateBusinessRequest' }),
        },
        responses: {
          200: {
            description: 'Updated business',
            ...json({
              type: 'object',
              required: ['business'],
              properties: { business: { $ref: '#/components/schemas/Business' } },
            }),
          },
          400: errorResponse('Invalid business update'),
          401: errorResponse('Unauthorized'),
          404: errorResponse('Business not found'),
        },
      },
    },
    '/businesses/{businessId}/bundle': {
      get: {
        tags: ['Business'],
        summary: 'Sync bundle',
        description:
          'Single payload for mobile sync: products, customers, orders, memories, conversations, payments, inventoryEvents (events capped at 40).',
        security: businessAccess,
        parameters: [businessIdParam],
        responses: {
          200: {
            description: 'Full business snapshot',
            ...json({ $ref: '#/components/schemas/BusinessBundle' }),
          },
          401: errorResponse('Unauthorized'),
          403: errorResponse('Not a member of this business'),
        },
      },
    },
    '/businesses/{businessId}/dashboard': {
      get: {
        tags: ['Business'],
        summary: 'Dashboard metrics',
        security: businessAccess,
        parameters: [businessIdParam],
        responses: {
          200: {
            description: "Today's sales and low stock",
            ...json({ $ref: '#/components/schemas/DashboardMetrics' }),
          },
          401: errorResponse('Unauthorized'),
        },
      },
    },
    '/businesses/{businessId}/products': {
      get: {
        tags: ['Catalog'],
        summary: 'List products',
        security: businessAccess,
        parameters: [businessIdParam],
        responses: {
          200: {
            description: 'Products',
            ...json({
              type: 'object',
              required: ['products'],
              properties: {
                products: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Product' },
                },
              },
            }),
          },
          401: errorResponse('Unauthorized'),
        },
      },
      post: {
        tags: ['Catalog'],
        summary: 'Add product',
        security: businessAccess,
        parameters: [businessIdParam],
        requestBody: {
          required: true,
          ...json({ $ref: '#/components/schemas/AddProductRequest' }),
        },
        responses: {
          201: {
            description: 'Created product',
            ...json({
              type: 'object',
              required: ['product'],
              properties: { product: { $ref: '#/components/schemas/Product' } },
            }),
          },
          400: errorResponse('Invalid product'),
          401: errorResponse('Unauthorized'),
        },
      },
    },
    '/businesses/{businessId}/products/{productId}': {
      patch: {
        tags: ['Catalog'],
        summary: 'Update available stock (restock)',
        security: businessAccess,
        parameters: [
          businessIdParam,
          { name: 'productId', in: 'path', required: true, schema: uuid },
        ],
        requestBody: {
          required: true,
          ...json({
            type: 'object',
            required: ['available'],
            properties: {
              available: { type: 'integer', minimum: 0 },
            },
          }),
        },
        responses: {
          200: {
            description: 'Updated product',
            ...json({
              type: 'object',
              required: ['product'],
              properties: { product: { $ref: '#/components/schemas/Product' } },
            }),
          },
          400: errorResponse('Invalid stock update'),
          404: errorResponse('Product not found'),
        },
      },
    },
    '/businesses/{businessId}/customers': {
      get: {
        tags: ['Catalog'],
        summary: 'List customers',
        security: businessAccess,
        parameters: [businessIdParam],
        responses: {
          200: {
            description: 'Customers',
            ...json({
              type: 'object',
              required: ['customers'],
              properties: {
                customers: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Customer' },
                },
              },
            }),
          },
          401: errorResponse('Unauthorized'),
        },
      },
    },
    '/businesses/{businessId}/orders': {
      get: {
        tags: ['Orders'],
        summary: 'List orders',
        security: businessAccess,
        parameters: [businessIdParam],
        responses: {
          200: {
            description: 'Orders',
            ...json({
              type: 'object',
              required: ['orders'],
              properties: {
                orders: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Order' },
                },
              },
            }),
          },
          401: errorResponse('Unauthorized'),
        },
      },
    },
    '/businesses/{businessId}/orders/{orderId}/payments': {
      post: {
        tags: ['Orders'],
        summary: 'Record a payment',
        security: businessAccess,
        parameters: [
          businessIdParam,
          { name: 'orderId', in: 'path', required: true, schema: uuid },
        ],
        requestBody: {
          required: true,
          ...json({
            type: 'object',
            required: ['amount'],
            properties: {
              amount: { type: 'number', minimum: 0, exclusiveMinimum: true },
              method: paymentMethod,
            },
            example: { amount: 50000, method: 'cash' },
          }),
        },
        responses: {
          200: {
            description: 'Payment recorded',
            ...json({
              type: 'object',
              required: ['ok', 'order', 'payment'],
              properties: {
                ok: { type: 'boolean' },
                order: { $ref: '#/components/schemas/Order' },
                payment: { $ref: '#/components/schemas/Payment' },
              },
            }),
          },
          400: errorResponse('Invalid payment'),
          404: errorResponse('Order not found'),
        },
      },
    },
    '/businesses/{businessId}/orders/{orderId}/cancel': {
      post: {
        tags: ['Orders'],
        summary: 'Cancel order',
        description: 'Releases reserved stock or restocks confirmed sales.',
        security: businessAccess,
        parameters: [
          businessIdParam,
          { name: 'orderId', in: 'path', required: true, schema: uuid },
        ],
        responses: {
          200: {
            description: 'Cancelled',
            ...json({
              type: 'object',
              required: ['ok', 'order'],
              properties: {
                ok: { type: 'boolean' },
                order: { $ref: '#/components/schemas/Order' },
              },
            }),
          },
          404: errorResponse('Order not found'),
          409: errorResponse('Already cancelled'),
        },
      },
    },
    '/businesses/{businessId}/memories': {
      get: {
        tags: ['Memory'],
        summary: 'List memories',
        security: businessAccess,
        parameters: [businessIdParam],
        responses: {
          200: {
            description: 'Memories',
            ...json({
              type: 'object',
              required: ['memories'],
              properties: {
                memories: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/MemoryNote' },
                },
              },
            }),
          },
          401: errorResponse('Unauthorized'),
        },
      },
    },
    '/businesses/{businessId}/conversations': {
      get: {
        tags: ['Memory'],
        summary: 'Approved chat corpus for Bob',
        security: businessAccess,
        parameters: [businessIdParam],
        responses: {
          200: {
            description: 'Recent conversations (max 40)',
            ...json({
              type: 'object',
              required: ['conversations'],
              properties: {
                conversations: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Conversation' },
                },
              },
            }),
          },
          401: errorResponse('Unauthorized'),
        },
      },
    },
    '/businesses/{businessId}/chat': {
      post: {
        tags: ['AI'],
        summary: 'Ask Bob',
        description:
          'Grounded Gemini answer from approved records when the key is set; rule-based fallback otherwise. If `speak` is true, `voice` matches POST /tts.',
        security: businessAccess,
        parameters: [businessIdParam],
        requestBody: {
          required: true,
          ...json({
            type: 'object',
            required: ['question'],
            properties: {
              question: { type: 'string', minLength: 1, example: 'Who still owes me?' },
              language,
              speak: { type: 'boolean', default: false },
            },
          }),
        },
        responses: {
          200: {
            description: 'Answer',
            ...json({ $ref: '#/components/schemas/ChatResponse' }),
          },
          400: errorResponse('Invalid chat payload'),
          401: errorResponse('Unauthorized'),
        },
      },
    },
    '/tts': {
      post: {
        tags: ['AI'],
        summary: 'Text to speech (YarnGPT)',
        description:
          'English, Yoruba, Hausa, Igbo return MP3 when `YARNGPT_API_KEY` is set. Pidgin (`pcm`) is text-only (`supported: false`). Missing key also returns `supported: false` rather than 503.',
        security: businessAccess,
        requestBody: {
          required: true,
          ...json(
            { $ref: '#/components/schemas/TtsRequest' },
            {
              businessId: DEMO,
              text: 'Welcome to FreBob.',
              language: 'en',
              voice: 'Idera',
            },
          ),
        },
        responses: {
          200: {
            description: 'TTS result',
            ...json({ $ref: '#/components/schemas/TtsResult' }),
          },
          400: errorResponse('Invalid TTS payload'),
          401: errorResponse('Unauthorized'),
        },
      },
    },
    '/stt': {
      post: {
        tags: ['AI'],
        summary: 'Speech to text (Gemini voice notes)',
        description:
          'Transcribes a short voice note, detects en|pcm|yo|ha|ig, and returns an English translation. Empty / unusable audio → 422.',
        security: businessAccess,
        requestBody: {
          required: true,
          ...json({ $ref: '#/components/schemas/SttRequest' }),
        },
        responses: {
          200: {
            description: 'Transcript',
            ...json({ $ref: '#/components/schemas/SttResult' }),
          },
          400: errorResponse('Invalid STT payload'),
          401: errorResponse('Unauthorized'),
          422: errorResponse('Unusable audio or Gemini not configured'),
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Supabase Auth access token',
      },
      demoMode: {
        type: 'apiKey',
        in: 'header',
        name: 'X-Demo-Mode',
        description: 'Set to `1` for Explore Demo / memory mode',
      },
    },
    schemas: {
      Error: ErrorSchema,
      Health: {
        type: 'object',
        required: [
          'ok',
          'service',
          'store',
          'supabaseConfigured',
          'geminiConfigured',
          'yarnGptConfigured',
          'demoBusinessId',
          'time',
        ],
        properties: {
          ok: { type: 'boolean' },
          service: { type: 'string' },
          store: { type: 'string', enum: ['memory', 'supabase'] },
          supabaseConfigured: { type: 'boolean' },
          geminiConfigured: { type: 'boolean' },
          geminiModel: { type: 'string' },
          yarnGptConfigured: { type: 'boolean' },
          demoBusinessId: uuid,
          time: isoDate,
        },
      },
      AppUser: {
        type: 'object',
        required: ['id', 'authUserId', 'name', 'email', 'preferredLanguage'],
        properties: {
          id: uuid,
          authUserId: uuid,
          name: { type: 'string' },
          email: { type: 'string' },
          preferredLanguage: language,
          phone: { type: 'string' },
        },
      },
      Business: {
        type: 'object',
        required: ['id', 'name', 'category', 'location', 'currency', 'preferredLanguage'],
        properties: {
          id: uuid,
          name: { type: 'string' },
          category: { type: 'string' },
          location: { type: 'string' },
          currency: { type: 'string', example: 'NGN' },
          preferredLanguage: language,
          phone: { type: 'string' },
          ownerUserId: uuid,
        },
      },
      AuthSession: {
        type: 'object',
        required: ['user', 'businesses'],
        properties: {
          user: { $ref: '#/components/schemas/AppUser' },
          businesses: {
            type: 'array',
            items: { $ref: '#/components/schemas/Business' },
          },
        },
      },
      BootstrapRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1 },
          preferredLanguage: language,
        },
      },
      StarterProduct: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 2 },
          unitPrice: { type: 'number', minimum: 0 },
          available: { type: 'integer', minimum: 0 },
          variant: { type: 'string' },
        },
      },
      CreateBusinessRequest: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 2, example: 'Amaka Provisions' },
          category: { type: 'string', example: 'Retail' },
          location: { type: 'string', example: 'Lagos' },
          phone: { type: 'string' },
          currency: { type: 'string', minLength: 3, example: 'NGN' },
          preferredLanguage: language,
          whatsappAccessEnabled: { type: 'boolean' },
          starterProducts: {
            type: 'array',
            items: { $ref: '#/components/schemas/StarterProduct' },
          },
          inventoryNotes: { type: 'string' },
        },
      },
      CreateBusinessResponse: {
        type: 'object',
        required: ['user', 'business'],
        properties: {
          user: { $ref: '#/components/schemas/AppUser' },
          business: { $ref: '#/components/schemas/Business' },
        },
      },
      UpdateBusinessRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 2 },
          category: { type: 'string' },
          location: { type: 'string' },
          phone: { type: 'string', nullable: true },
          currency: { type: 'string', minLength: 3 },
          preferredLanguage: language,
        },
      },
      ExtractedFields: {
        type: 'object',
        required: [
          'eventType',
          'customerName',
          'productName',
          'quantity',
          'unitPrice',
          'total',
          'amountPaid',
          'balance',
          'paymentStatus',
          'orderStatus',
          'paymentMethod',
        ],
        properties: {
          eventType: { type: 'string' },
          customerName: { type: 'string' },
          productName: { type: 'string' },
          variant: { type: 'string' },
          quantity: { type: 'integer', minimum: 1 },
          unitPrice: { type: 'number', minimum: 0 },
          total: { type: 'number', minimum: 0 },
          amountPaid: { type: 'number', minimum: 0 },
          balance: { type: 'number', minimum: 0 },
          paymentStatus,
          orderStatus,
          paymentMethod,
          uncertainFields: { type: 'array', items: { type: 'string' } },
        },
      },
      ExtractRequest: {
        type: 'object',
        required: ['businessId', 'source'],
        properties: {
          businessId: { ...uuid, example: DEMO },
          source: captureSource,
          text: { type: 'string', description: 'Required when source is voice' },
          sampleId: { type: 'string', example: 'sample_flagship' },
          imageBase64: { type: 'string', description: 'Raw base64 or data URL' },
          mimeType: { type: 'string', example: 'image/jpeg' },
        },
      },
      ExtractResponse: {
        type: 'object',
        required: ['extractionId', 'status', 'source', 'sourceText', 'fields'],
        properties: {
          extractionId: uuid,
          status: { type: 'string', enum: ['unconfirmed'] },
          source: captureSource,
          sourceText: { type: 'string' },
          fields: { $ref: '#/components/schemas/ExtractedFields' },
        },
      },
      ApproveRequest: {
        type: 'object',
        required: ['businessId', 'extractionId', 'fields'],
        properties: {
          businessId: uuid,
          extractionId: uuid,
          fields: { $ref: '#/components/schemas/ExtractedFields' },
          sourceText: { type: 'string' },
          sourceLabel: { type: 'string' },
        },
      },
      ApproveResponse: {
        type: 'object',
        required: ['ok', 'orderId', 'order'],
        properties: {
          ok: { type: 'boolean' },
          orderId: uuid,
          order: { $ref: '#/components/schemas/Order' },
        },
      },
      RejectRequest: {
        type: 'object',
        required: ['businessId', 'extractionId'],
        properties: {
          businessId: uuid,
          extractionId: uuid,
          reason: { type: 'string' },
        },
      },
      Product: {
        type: 'object',
        required: [
          'id',
          'businessId',
          'name',
          'unitPrice',
          'available',
          'reserved',
          'lowStockThreshold',
        ],
        properties: {
          id: uuid,
          businessId: uuid,
          name: { type: 'string' },
          variant: { type: 'string' },
          unitPrice: { type: 'number' },
          available: { type: 'integer' },
          reserved: { type: 'integer' },
          lowStockThreshold: { type: 'integer' },
        },
      },
      AddProductRequest: {
        type: 'object',
        required: ['name', 'unitPrice', 'available'],
        properties: {
          name: { type: 'string', minLength: 2 },
          variant: { type: 'string' },
          unitPrice: { type: 'number', minimum: 0 },
          available: { type: 'integer', minimum: 0 },
          lowStockThreshold: { type: 'integer', minimum: 1, default: 5 },
        },
      },
      Customer: {
        type: 'object',
        required: ['id', 'businessId', 'name', 'balanceOwed'],
        properties: {
          id: uuid,
          businessId: uuid,
          name: { type: 'string' },
          phone: { type: 'string' },
          balanceOwed: { type: 'number' },
        },
      },
      OrderItem: {
        type: 'object',
        required: ['id', 'orderId', 'productName', 'quantity', 'unitPrice', 'lineTotal'],
        properties: {
          id: uuid,
          orderId: uuid,
          productId: uuid,
          productName: { type: 'string' },
          variant: { type: 'string' },
          quantity: { type: 'integer' },
          unitPrice: { type: 'number' },
          lineTotal: { type: 'number' },
        },
      },
      Order: {
        type: 'object',
        required: [
          'id',
          'businessId',
          'customerId',
          'customerName',
          'items',
          'total',
          'amountPaid',
          'balance',
          'paymentStatus',
          'orderStatus',
          'source',
          'createdAt',
        ],
        properties: {
          id: uuid,
          businessId: uuid,
          customerId: uuid,
          customerName: { type: 'string' },
          items: { type: 'array', items: { $ref: '#/components/schemas/OrderItem' } },
          total: { type: 'number' },
          amountPaid: { type: 'number' },
          balance: { type: 'number' },
          paymentStatus,
          orderStatus,
          source: captureSource,
          notes: { type: 'string' },
          createdAt: isoDate,
        },
      },
      Payment: {
        type: 'object',
        required: ['id', 'businessId', 'orderId', 'amount', 'method', 'createdAt'],
        properties: {
          id: uuid,
          businessId: uuid,
          orderId: uuid,
          amount: { type: 'number' },
          method: paymentMethod,
          createdAt: isoDate,
        },
      },
      InventoryEvent: {
        type: 'object',
        required: ['id', 'businessId', 'productName', 'eventType', 'quantity', 'createdAt'],
        properties: {
          id: uuid,
          businessId: uuid,
          productId: uuid,
          productName: { type: 'string' },
          eventType: { type: 'string', enum: ['reserve', 'release', 'sale', 'restock'] },
          quantity: { type: 'number' },
          orderId: uuid,
          createdAt: isoDate,
        },
      },
      MemoryNote: {
        type: 'object',
        required: ['id', 'businessId', 'kind', 'content', 'trustLevel', 'createdAt'],
        properties: {
          id: uuid,
          businessId: uuid,
          kind: { type: 'string' },
          content: { type: 'string' },
          trustLevel: {
            type: 'string',
            enum: ['confirmed', 'unconfirmed', 'reference', 'rejected'],
          },
          orderId: uuid,
          title: { type: 'string' },
          createdAt: isoDate,
        },
      },
      Conversation: {
        type: 'object',
        required: ['id', 'businessId', 'sourceLabel', 'sourceText', 'createdAt'],
        properties: {
          id: uuid,
          businessId: uuid,
          sourceLabel: { type: 'string' },
          sourceText: { type: 'string' },
          createdAt: isoDate,
        },
      },
      BusinessBundle: {
        type: 'object',
        required: [
          'products',
          'customers',
          'orders',
          'memories',
          'conversations',
          'payments',
          'inventoryEvents',
        ],
        properties: {
          products: { type: 'array', items: { $ref: '#/components/schemas/Product' } },
          customers: { type: 'array', items: { $ref: '#/components/schemas/Customer' } },
          orders: { type: 'array', items: { $ref: '#/components/schemas/Order' } },
          memories: { type: 'array', items: { $ref: '#/components/schemas/MemoryNote' } },
          conversations: {
            type: 'array',
            items: { $ref: '#/components/schemas/Conversation' },
          },
          payments: { type: 'array', items: { $ref: '#/components/schemas/Payment' } },
          inventoryEvents: {
            type: 'array',
            items: { $ref: '#/components/schemas/InventoryEvent' },
          },
        },
      },
      DashboardMetrics: {
        type: 'object',
        required: ['salesToday', 'moneyInToday', 'balancesOwed', 'ordersToday', 'lowStock'],
        properties: {
          salesToday: { type: 'number' },
          moneyInToday: { type: 'number' },
          balancesOwed: { type: 'number' },
          ordersToday: { type: 'integer' },
          lowStock: {
            type: 'array',
            items: {
              type: 'object',
              required: ['id', 'name', 'available'],
              properties: {
                id: uuid,
                name: { type: 'string' },
                available: { type: 'integer' },
              },
            },
          },
        },
      },
      ChatResponse: {
        type: 'object',
        required: ['text', 'evidence', 'intent'],
        properties: {
          text: { type: 'string' },
          evidence: { type: 'string' },
          intent: { type: 'string' },
          voice: { $ref: '#/components/schemas/TtsResult', nullable: true },
        },
      },
      TtsRequest: {
        type: 'object',
        required: ['businessId', 'text'],
        properties: {
          businessId: uuid,
          text: { type: 'string', minLength: 1, maxLength: 2000 },
          language: { ...language, default: 'en' },
          voice: { type: 'string', example: 'Idera' },
        },
      },
      TtsResult: {
        oneOf: [
          {
            type: 'object',
            required: ['supported', 'mimeType', 'audioBase64', 'voice'],
            properties: {
              supported: { type: 'boolean', enum: [true] },
              mimeType: { type: 'string', enum: ['audio/mpeg'] },
              audioBase64: { type: 'string' },
              voice: { type: 'string' },
            },
          },
          {
            type: 'object',
            required: ['supported', 'reason', 'audioBase64'],
            properties: {
              supported: { type: 'boolean', enum: [false] },
              reason: { type: 'string' },
              audioBase64: { type: 'string', nullable: true },
            },
          },
        ],
      },
      SttRequest: {
        type: 'object',
        required: ['businessId', 'audioBase64'],
        properties: {
          businessId: uuid,
          audioBase64: { type: 'string', minLength: 80 },
          mimeType: { type: 'string', example: 'audio/mp4' },
          language,
        },
      },
      SttResult: {
        type: 'object',
        required: ['originalText', 'englishText', 'language'],
        properties: {
          originalText: { type: 'string' },
          englishText: { type: 'string' },
          language,
        },
      },
    },
  },
};
