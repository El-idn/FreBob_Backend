import type {
  AuditLog,
  InventoryEvent,
  MemoryNote,
  Order,
  Payment,
  Product,
} from '../types.js';
import { getCategorySeedCatalog, type CategorySeedOrder } from '../data/categorySeedCatalog.js';
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

async function persistCatalogOrder(input: {
  businessId: string;
  products: Product[];
  customers: Array<{ id: string; name: string }>;
  orderDef: CategorySeedOrder;
  createdAt: string;
}): Promise<void> {
  const { businessId, products, customers, orderDef, createdAt } = input;
  const prod = products[orderDef.productIdx]!;
  const cust = customers[orderDef.customerIdx]!;
  const total = prod.unitPrice * orderDef.qty;
  const paid = orderDef.paid;
  const balance = total - paid;
  const orderId = crypto.randomUUID();

  await persistApprovedOrder({
    order: {
      id: orderId,
      businessId,
      customerId: cust.id,
      customerName: cust.name,
      items: [
        {
          id: crypto.randomUUID(),
          orderId,
          productId: prod.id,
          productName: prod.name,
          variant: prod.variant,
          quantity: orderDef.qty,
          unitPrice: prod.unitPrice,
          lineTotal: total,
        },
      ],
      total,
      amountPaid: paid,
      balance,
      paymentStatus: balance <= 0 ? 'paid' : paid > 0 ? 'partially_paid' : 'unpaid',
      orderStatus: 'reserved',
      source: 'whatsapp',
      notes: orderDef.note,
      createdAt,
    } satisfies Order,
    payment:
      paid > 0
        ? ({
            id: crypto.randomUUID(),
            businessId,
            orderId,
            amount: paid,
            method: 'transfer',
            createdAt,
          } satisfies Payment)
        : undefined,
    inventoryEvent: {
      id: crypto.randomUUID(),
      businessId,
      productId: prod.id,
      productName: prod.name,
      eventType: 'reserve',
      quantity: orderDef.qty,
      orderId,
      createdAt,
    } satisfies InventoryEvent,
    productUpdate: {
      ...prod,
      available: prod.available - orderDef.qty,
      reserved: prod.reserved + orderDef.qty,
    },
    customerId: cust.id,
    customerBalanceDelta: balance,
    memory: {
      id: crypto.randomUUID(),
      businessId,
      kind: 'order',
      title: `WhatsApp order — ${cust.name}`,
      content: `${cust.name} ordered ${orderDef.qty}× ${prod.name}${
        prod.variant ? ` (${prod.variant})` : ''
      } for ₦${total.toLocaleString()}. ${
        paid > 0
          ? `Paid ₦${paid.toLocaleString()}, balance ₦${balance.toLocaleString()}.`
          : `Balance ₦${balance.toLocaleString()} due.`
      }`,
      trustLevel: 'confirmed',
      orderId,
      createdAt,
    } satisfies MemoryNote,
    audit: {
      id: crypto.randomUUID(),
      businessId,
      action: 'whatsapp_onboarding_seed',
      meta: { orderId, customer: cust.name },
      createdAt,
    } satisfies AuditLog,
  });
}

/**
 * Seeds sample products/customers/orders/conversations framed as WhatsApp-derived
 * data after the owner grants Bob WhatsApp access. Idempotent per business.
 */
export async function seedWhatsAppSampleForBusiness(
  businessId: string,
  category?: string,
): Promise<void> {
  const memories = await listMemories(businessId);
  if (memories.some((m) => m.kind === SEED_KIND)) return;

  const existingProducts = await listProducts(businessId);
  if (existingProducts.length >= 4) {
    await insertSeedMarker(businessId);
    return;
  }

  const catalog = getCategorySeedCatalog(category);
  const now = new Date().toISOString();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const addedProducts: Product[] = [];
  for (const p of catalog.products) {
    addedProducts.push(await addProduct({ businessId, ...p }));
  }

  const addedCustomers = [];
  for (const c of catalog.customers) {
    addedCustomers.push(await findOrCreateCustomer(businessId, c.name, c.phone));
  }

  await persistCatalogOrder({
    businessId,
    products: addedProducts,
    customers: addedCustomers,
    orderDef: catalog.primaryOrder,
    createdAt: yesterday,
  });

  // Refresh product rows after first order mutated stock in store.
  const productsAfterFirst = await listProducts(businessId);
  const byName = new Map(productsAfterFirst.map((p) => [p.name, p]));
  const productsForSecond = catalog.products.map(
    (p) => byName.get(p.name) ?? addedProducts.find((ap) => ap.name === p.name)!,
  );

  await persistCatalogOrder({
    businessId,
    products: productsForSecond,
    customers: addedCustomers,
    orderDef: catalog.secondaryOrder,
    createdAt: now,
  });

  await saveConversation({
    id: crypto.randomUUID(),
    businessId,
    sourceLabel: catalog.conversations.label1,
    sourceText: catalog.conversations.lines1.join('\n'),
    createdAt: now,
  });
  await saveConversation({
    id: crypto.randomUUID(),
    businessId,
    sourceLabel: catalog.conversations.label2,
    sourceText: catalog.conversations.lines2.join('\n'),
    createdAt: yesterday,
  });

  await insertSeedMarker(businessId);

  const [policy1, policy2] = catalog.policies;

  if (storeMode() === 'memory') {
    getMemoryDb().memories.unshift(
      {
        id: crypto.randomUUID(),
        businessId,
        kind: 'policy',
        title: policy1.title,
        content: policy1.content,
        trustLevel: 'confirmed',
        createdAt: now,
      },
      {
        id: crypto.randomUUID(),
        businessId,
        kind: 'policy',
        title: policy2.title,
        content: policy2.content,
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
      content: `${policy1.title}: ${policy1.content}`,
      trust_level: 'confirmed',
      created_at: now,
    },
    {
      id: crypto.randomUUID(),
      business_id: businessId,
      kind: 'policy',
      content: `${policy2.title}: ${policy2.content}`,
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
