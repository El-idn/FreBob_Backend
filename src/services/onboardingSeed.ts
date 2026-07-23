import type {
  AuditLog,
  InventoryEvent,
  MemoryNote,
  Order,
  Payment,
  Product,
} from '../types.js';
import {
  addProduct,
  findOrCreateCustomer,
  listMemories,
  listProducts,
  persistApprovedOrder,
  saveConversation,
  storeMode,
} from '../repo/index.js';
import { getMemoryDb } from '../repo/memoryDb.js';
import { getSupabase } from '../supabase.js';

const SEED_KIND = 'whatsapp_onboarding';

/**
 * Seeds sample products/customers/orders/conversations framed as WhatsApp-derived
 * data after the owner grants Bob WhatsApp access. Idempotent per business.
 */
export async function seedWhatsAppSampleForBusiness(businessId: string): Promise<void> {
  const memories = await listMemories(businessId);
  if (memories.some((m) => m.kind === SEED_KIND)) return;

  const existingProducts = await listProducts(businessId);
  if (existingProducts.length >= 4) {
    await insertSeedMarker(businessId);
    return;
  }

  const now = new Date().toISOString();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const a15 = await addProduct({
    businessId,
    name: 'Samsung A15',
    variant: '128GB',
    unitPrice: 185_000,
    available: 12,
    reserved: 0,
    lowStockThreshold: 4,
  });
  const a05 = await addProduct({
    businessId,
    name: 'Samsung A05',
    variant: '64GB',
    unitPrice: 115_000,
    available: 8,
    reserved: 0,
    lowStockThreshold: 3,
  });
  await addProduct({
    businessId,
    name: 'Galaxy Buds FE',
    unitPrice: 75_000,
    available: 3,
    reserved: 0,
    lowStockThreshold: 4,
  });
  await addProduct({
    businessId,
    name: '25W Fast Charger',
    unitPrice: 12_000,
    available: 25,
    reserved: 0,
    lowStockThreshold: 5,
  });

  const ada = await findOrCreateCustomer(businessId, 'Ada Okoro', '0803 111 2233');
  const tunde = await findOrCreateCustomer(businessId, 'Tunde Bello', '0812 444 5566');
  await findOrCreateCustomer(businessId, 'Amina Yusuf', '0901 777 8899');

  const tundeOrderId = crypto.randomUUID();
  const tundeTotal = 115_000;
  const tundePaid = 70_000;
  const tundeBalance = tundeTotal - tundePaid;
  const tundeProduct: Product = {
    ...a05,
    available: a05.available - 1,
    reserved: a05.reserved + 1,
  };
  await persistApprovedOrder({
    order: {
      id: tundeOrderId,
      businessId,
      customerId: tunde.id,
      customerName: tunde.name,
      items: [
        {
          id: crypto.randomUUID(),
          orderId: tundeOrderId,
          productId: a05.id,
          productName: a05.name,
          variant: a05.variant,
          quantity: 1,
          unitPrice: a05.unitPrice,
          lineTotal: tundeTotal,
        },
      ],
      total: tundeTotal,
      amountPaid: tundePaid,
      balance: tundeBalance,
      paymentStatus: 'partially_paid',
      orderStatus: 'reserved',
      source: 'whatsapp',
      notes: 'Balance tomorrow — from WhatsApp',
      createdAt: yesterday,
    } satisfies Order,
    payment: {
      id: crypto.randomUUID(),
      businessId,
      orderId: tundeOrderId,
      amount: tundePaid,
      method: 'transfer',
      createdAt: yesterday,
    } satisfies Payment,
    inventoryEvent: {
      id: crypto.randomUUID(),
      businessId,
      productId: a05.id,
      productName: a05.name,
      eventType: 'reserve',
      quantity: 1,
      orderId: tundeOrderId,
      createdAt: yesterday,
    } satisfies InventoryEvent,
    productUpdate: tundeProduct,
    customerId: tunde.id,
    customerBalanceDelta: tundeBalance,
    memory: {
      id: crypto.randomUUID(),
      businessId,
      kind: 'order',
      title: 'WhatsApp order — Tunde',
      content:
        'Tunde Bello ordered Samsung A05 (64GB). Paid ₦70,000, balance ₦45,000 due tomorrow.',
      trustLevel: 'confirmed',
      orderId: tundeOrderId,
      createdAt: yesterday,
    } satisfies MemoryNote,
    audit: {
      id: crypto.randomUUID(),
      businessId,
      action: 'whatsapp_onboarding_seed',
      meta: { orderId: tundeOrderId, customer: 'Tunde Bello' },
      createdAt: yesterday,
    } satisfies AuditLog,
  });

  const adaOrderId = crypto.randomUUID();
  const adaQty = 2;
  const adaTotal = a15.unitPrice * adaQty;
  const adaPaid = 200_000;
  const adaBalance = adaTotal - adaPaid;
  const adaProduct: Product = {
    ...a15,
    available: a15.available - adaQty,
    reserved: a15.reserved + adaQty,
  };
  await persistApprovedOrder({
    order: {
      id: adaOrderId,
      businessId,
      customerId: ada.id,
      customerName: ada.name,
      items: [
        {
          id: crypto.randomUUID(),
          orderId: adaOrderId,
          productId: a15.id,
          productName: a15.name,
          variant: a15.variant,
          quantity: adaQty,
          unitPrice: a15.unitPrice,
          lineTotal: adaTotal,
        },
      ],
      total: adaTotal,
      amountPaid: adaPaid,
      balance: adaBalance,
      paymentStatus: 'partially_paid',
      orderStatus: 'reserved',
      source: 'whatsapp',
      notes: 'Partial payment — from WhatsApp',
      createdAt: now,
    } satisfies Order,
    payment: {
      id: crypto.randomUUID(),
      businessId,
      orderId: adaOrderId,
      amount: adaPaid,
      method: 'transfer',
      createdAt: now,
    } satisfies Payment,
    inventoryEvent: {
      id: crypto.randomUUID(),
      businessId,
      productId: a15.id,
      productName: a15.name,
      eventType: 'reserve',
      quantity: adaQty,
      orderId: adaOrderId,
      createdAt: now,
    } satisfies InventoryEvent,
    productUpdate: adaProduct,
    customerId: ada.id,
    customerBalanceDelta: adaBalance,
    memory: {
      id: crypto.randomUUID(),
      businessId,
      kind: 'order',
      title: 'WhatsApp order — Ada',
      content:
        'Ada Okoro ordered 2× Samsung A15 (128GB) for ₦370,000. Paid ₦200,000, balance ₦170,000.',
      trustLevel: 'confirmed',
      orderId: adaOrderId,
      createdAt: now,
    } satisfies MemoryNote,
    audit: {
      id: crypto.randomUUID(),
      businessId,
      action: 'whatsapp_onboarding_seed',
      meta: { orderId: adaOrderId, customer: 'Ada Okoro' },
      createdAt: now,
    } satisfies AuditLog,
  });

  await saveConversation({
    id: crypto.randomUUID(),
    businessId,
    sourceLabel: 'WhatsApp · Ada Okoro',
    sourceText: [
      'Customer: Abeg I need 2 Samsung A15 128GB. How much?',
      'Seller: ₦185,000 each. 2 is ₦370,000.',
      'Customer: I go transfer 200k now, balance later.',
      'Seller: Okay, I reserve am for you.',
    ].join('\n'),
    createdAt: now,
  });

  await saveConversation({
    id: crypto.randomUUID(),
    businessId,
    sourceLabel: 'WhatsApp · Tunde Bello',
    sourceText: [
      'Customer: Bro you get A05 64GB?',
      'Seller: Yes, ₦115,000.',
      'Customer: I send 70k, balance tomorrow.',
      'Seller: Reserved. No wahala.',
    ].join('\n'),
    createdAt: yesterday,
  });

  await insertSeedMarker(businessId);

  if (storeMode() === 'memory') {
    getMemoryDb().memories.unshift(
      {
        id: crypto.randomUUID(),
        businessId,
        kind: 'policy',
        title: 'Preferred suppliers',
        content: 'Phone accessories usually restocked from Computer Village on Wednesdays.',
        trustLevel: 'confirmed',
        createdAt: now,
      },
      {
        id: crypto.randomUUID(),
        businessId,
        kind: 'policy',
        title: 'Customer credit rule',
        content: 'Regulars may take goods on balance if prior payment history is clean.',
        trustLevel: 'confirmed',
        createdAt: now,
      },
    );
    return;
  }

  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.from('business_memories').insert([
    {
      id: crypto.randomUUID(),
      business_id: businessId,
      kind: 'policy',
      content:
        'Preferred suppliers: Phone accessories usually restocked from Computer Village on Wednesdays.',
      trust_level: 'confirmed',
      created_at: now,
    },
    {
      id: crypto.randomUUID(),
      business_id: businessId,
      kind: 'policy',
      content:
        'Customer credit rule: Regulars may take goods on balance if prior payment history is clean.',
      trust_level: 'confirmed',
      created_at: now,
    },
  ]);
}

async function insertSeedMarker(businessId: string): Promise<void> {
  const now = new Date().toISOString();
  const note: MemoryNote = {
    id: crypto.randomUUID(),
    businessId,
    kind: SEED_KIND,
    title: 'From WhatsApp access',
    content:
      'Bob imported sample conversations from your WhatsApp business chats so you can explore FreBob with real-looking orders and customers. Replace these with your live approvals anytime.',
    trustLevel: 'confirmed',
    createdAt: now,
  };

  if (storeMode() === 'memory') {
    getMemoryDb().memories.unshift(note);
    return;
  }

  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.from('business_memories').insert({
    id: note.id,
    business_id: businessId,
    kind: note.kind,
    content: `${note.title}: ${note.content}`,
    trust_level: note.trustLevel,
    created_at: note.createdAt,
  });
}
