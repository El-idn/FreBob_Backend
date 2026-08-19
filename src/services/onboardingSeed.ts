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

// ─── Per-category seed definitions ───────────────────────────────────────────

type CategorySeedDef = {
  products: Array<{
    name: string;
    variant?: string;
    unitPrice: number;
    available: number;
    reserved: number;
    lowStockThreshold: number;
  }>;
  customers: Array<{ name: string; phone: string }>;
  /** which product index is used for order 1 (balance order) */
  order1ProductIdx: number;
  order1Qty: number;
  order1Paid: number;
  order1CustomerIdx: number;
  order1Note: string;
  /** which product index is used for order 2 (partial-pay order) */
  order2ProductIdx: number;
  order2Qty: number;
  order2Paid: number;
  order2CustomerIdx: number;
  order2Note: string;
  conv1Label: string;
  conv1Lines: string[];
  conv2Label: string;
  conv2Lines: string[];
  memory1Title: string;
  memory1Content: string;
  memory2Title: string;
  memory2Content: string;
};

const SEEDS: Record<string, CategorySeedDef> = {
  'Retail / Shop': {
    products: [
      { name: 'Indomie Noodles 70g', unitPrice: 250, available: 120, reserved: 0, lowStockThreshold: 20 },
      { name: 'Milo 400g Tin', unitPrice: 3800, available: 30, reserved: 1, lowStockThreshold: 5 },
      { name: 'Titus Sardines ×6', unitPrice: 3200, available: 48, reserved: 0, lowStockThreshold: 10 },
      { name: 'Ariel Detergent 1kg', unitPrice: 2200, available: 60, reserved: 0, lowStockThreshold: 15 },
    ],
    customers: [
      { name: 'Mama Tunde', phone: '0803 200 1100' },
      { name: 'Bisi Adeyemi', phone: '0812 300 4455' },
      { name: 'Alhaji Sule', phone: '0701 500 6677' },
    ],
    order1ProductIdx: 1, order1Qty: 2, order1Paid: 0, order1CustomerIdx: 1, order1Note: 'Buying on credit — from WhatsApp',
    order2ProductIdx: 0, order2Qty: 10, order2Paid: 1500, order2CustomerIdx: 0, order2Note: 'Partial payment — from WhatsApp',
    conv1Label: 'WhatsApp · Bisi Adeyemi',
    conv1Lines: ['Customer: I need Milo 2 tins on credit', 'Seller: Okay, ₦7,600. I reserve am for you.'],
    conv2Label: 'WhatsApp · Mama Tunde',
    conv2Lines: ['Customer: Give me Indomie 10 cartons', 'Seller: ₦2,500 for 10. You paid ₦1,500 — balance ₦1,000.'],
    memory1Title: 'Wholesale supplier',
    memory1Content: 'Goods restocked from Aspamda market every Monday and Thursday.',
    memory2Title: 'Credit rule',
    memory2Content: 'Only give balance to customers who have cleared previous debts.',
  },
  'Fashion & Tailoring': {
    products: [
      { name: 'Ankara Fabric (per yard)', unitPrice: 1800, available: 80, reserved: 0, lowStockThreshold: 10 },
      { name: 'Plain Cotton (3 yards)', unitPrice: 4500, available: 25, reserved: 2, lowStockThreshold: 5 },
      { name: 'French Lace (per yard)', unitPrice: 6500, available: 15, reserved: 0, lowStockThreshold: 3 },
      { name: 'Tailoring Thread Set', unitPrice: 1200, available: 40, reserved: 0, lowStockThreshold: 8 },
    ],
    customers: [
      { name: 'Funmi Adeola', phone: '0803 111 7788' },
      { name: 'Ngozi Obi', phone: '0812 222 3344' },
      { name: 'Halima Musa', phone: '0901 333 5566' },
    ],
    order1ProductIdx: 2, order1Qty: 1, order1Paid: 0, order1CustomerIdx: 1, order1Note: 'Lace order — from WhatsApp',
    order2ProductIdx: 0, order2Qty: 6, order2Paid: 5000, order2CustomerIdx: 0, order2Note: 'Partial deposit — from WhatsApp',
    conv1Label: 'WhatsApp · Ngozi Obi',
    conv1Lines: ['Customer: I want French Lace 1 yard', 'Seller: ₦6,500. Reserve done, pay when you pick up.'],
    conv2Label: 'WhatsApp · Funmi Adeola',
    conv2Lines: ['Customer: 6 yards of Ankara please', 'Seller: ₦10,800. She paid ₦5,000 deposit.'],
    memory1Title: 'Fabric supplier',
    memory1Content: 'Ankara and lace fabric sourced from Balogun market every Tuesday.',
    memory2Title: 'Deposit policy',
    memory2Content: 'Customers must pay 50% deposit before sewing begins.',
  },
  'Food & Restaurant': {
    products: [
      { name: 'Jollof Rice + Chicken', unitPrice: 2500, available: 50, reserved: 0, lowStockThreshold: 10 },
      { name: 'Egusi Soup + Eba', unitPrice: 2000, available: 40, reserved: 2, lowStockThreshold: 8 },
      { name: 'Pepper Soup (Goat)', unitPrice: 3500, available: 20, reserved: 0, lowStockThreshold: 5 },
      { name: 'Puff-Puff ×10', unitPrice: 500, available: 100, reserved: 0, lowStockThreshold: 20 },
    ],
    customers: [
      { name: 'Emeka Okafor', phone: '0803 444 2211' },
      { name: 'Stella Nwachukwu', phone: '0812 555 3322' },
      { name: 'Biodun Alabi', phone: '0701 666 4433' },
    ],
    order1ProductIdx: 0, order1Qty: 2, order1Paid: 2500, order1CustomerIdx: 1, order1Note: 'Lunch order — from WhatsApp',
    order2ProductIdx: 2, order2Qty: 1, order2Paid: 0, order2CustomerIdx: 0, order2Note: 'Pepper soup credit — from WhatsApp',
    conv1Label: 'WhatsApp · Stella Nwachukwu',
    conv1Lines: ['Customer: 2 plates jollof rice please', 'Seller: ₦5,000. She paid ₦2,500 — balance ₦2,500.'],
    conv2Label: 'WhatsApp · Emeka Okafor',
    conv2Lines: ['Customer: Pepper soup goat, add am for my balance', 'Seller: Done. ₦3,500 added to your tab.'],
    memory1Title: 'Market days',
    memory1Content: 'Fresh ingredients bought from Mile 12 market every Tuesday and Friday.',
    memory2Title: 'Credit rule',
    memory2Content: 'Only office customers with standing orders can take food on credit.',
  },
  'Beauty & Salon': {
    products: [
      { name: 'Relaxer Kit (Mild)', unitPrice: 4500, available: 20, reserved: 0, lowStockThreshold: 4 },
      { name: 'Human Hair Wig 14"', unitPrice: 45000, available: 8, reserved: 1, lowStockThreshold: 2 },
      { name: 'Gel Nail Set', unitPrice: 8000, available: 12, reserved: 0, lowStockThreshold: 3 },
      { name: 'Pedicure Session', unitPrice: 5000, available: 99, reserved: 0, lowStockThreshold: 5 },
    ],
    customers: [
      { name: 'Adaeze Nwosu', phone: '0803 777 1122' },
      { name: 'Temi Lawson', phone: '0812 888 2233' },
      { name: 'Fatima Abubakar', phone: '0901 999 3344' },
    ],
    order1ProductIdx: 1, order1Qty: 1, order1Paid: 0, order1CustomerIdx: 1, order1Note: 'Wig reservation — from WhatsApp',
    order2ProductIdx: 2, order2Qty: 1, order2Paid: 5000, order2CustomerIdx: 0, order2Note: 'Partial nail payment — from WhatsApp',
    conv1Label: 'WhatsApp · Temi Lawson',
    conv1Lines: ['Customer: Reserve the 14 inch wig for me', 'Seller: Done. ₦45,000 — full payment on pickup.'],
    conv2Label: 'WhatsApp · Adaeze Nwosu',
    conv2Lines: ['Customer: I want gel nail set', 'Seller: ₦8,000. She paid ₦5,000 — balance ₦3,000.'],
    memory1Title: 'Product supplier',
    memory1Content: 'Hair and beauty products restocked from Eleganza on the last Friday of each month.',
    memory2Title: 'Booking rule',
    memory2Content: 'Wig installs and relaxers require 24-hour advance booking. Walk-ins for braids only.',
  },
  Electronics: {
    products: [
      { name: 'Samsung A15', variant: '128GB', unitPrice: 185_000, available: 12, reserved: 0, lowStockThreshold: 4 },
      { name: 'Samsung A05', variant: '64GB', unitPrice: 115_000, available: 8, reserved: 0, lowStockThreshold: 3 },
      { name: 'Galaxy Buds FE', unitPrice: 75_000, available: 3, reserved: 0, lowStockThreshold: 4 },
      { name: '25W Fast Charger', unitPrice: 12_000, available: 25, reserved: 0, lowStockThreshold: 5 },
    ],
    customers: [
      { name: 'Ada Okoro', phone: '0803 111 2233' },
      { name: 'Tunde Bello', phone: '0812 444 5566' },
      { name: 'Amina Yusuf', phone: '0901 777 8899' },
    ],
    order1ProductIdx: 1, order1Qty: 1, order1Paid: 70_000, order1CustomerIdx: 1, order1Note: 'Balance tomorrow — from WhatsApp',
    order2ProductIdx: 0, order2Qty: 2, order2Paid: 200_000, order2CustomerIdx: 0, order2Note: 'Partial payment — from WhatsApp',
    conv1Label: 'WhatsApp · Ada Okoro',
    conv1Lines: [
      'Customer: Abeg I need 2 Samsung A15 128GB. How much?',
      'Seller: ₦185,000 each. 2 is ₦370,000.',
      'Customer: I go transfer 200k now, balance later.',
      'Seller: Okay, I reserve am for you.',
    ],
    conv2Label: 'WhatsApp · Tunde Bello',
    conv2Lines: [
      'Customer: Bro you get A05 64GB?',
      'Seller: Yes, ₦115,000.',
      'Customer: I send 70k, balance tomorrow.',
      'Seller: Reserved. No wahala.',
    ],
    memory1Title: 'Preferred suppliers',
    memory1Content: 'Phone accessories usually restocked from Computer Village on Wednesdays.',
    memory2Title: 'Customer credit rule',
    memory2Content: 'Regulars may take goods on balance if prior payment history is clean.',
  },
  'Provision Store': {
    products: [
      { name: 'Golden Morn 1kg', unitPrice: 3200, available: 50, reserved: 0, lowStockThreshold: 10 },
      { name: 'Semovita 1kg', unitPrice: 1500, available: 80, reserved: 2, lowStockThreshold: 15 },
      { name: 'Peak Milk 400g', unitPrice: 4800, available: 35, reserved: 0, lowStockThreshold: 8 },
      { name: 'Vegetable Oil 1L', unitPrice: 2200, available: 60, reserved: 0, lowStockThreshold: 12 },
    ],
    customers: [
      { name: 'Mama Emeka', phone: '0803 122 3344' },
      { name: 'Chukwudi Obi', phone: '0812 233 4455' },
      { name: 'Adamu Ibrahim', phone: '0701 344 5566' },
    ],
    order1ProductIdx: 2, order1Qty: 1, order1Paid: 0, order1CustomerIdx: 1, order1Note: 'Credit order — from WhatsApp',
    order2ProductIdx: 1, order2Qty: 4, order2Paid: 3000, order2CustomerIdx: 0, order2Note: 'Partial payment — from WhatsApp',
    conv1Label: 'WhatsApp · Chukwudi Obi',
    conv1Lines: ['Customer: Peak Milk 400g, add to my credit', 'Seller: Done. ₦4,800 added — please clear soon.'],
    conv2Label: 'WhatsApp · Mama Emeka',
    conv2Lines: ['Customer: 4 Semovita 1kg', 'Seller: ₦6,000. She paid ₦3,000 — balance ₦3,000.'],
    memory1Title: 'Wholesale dealer',
    memory1Content: 'Dry goods restocked from Dawanau market depot every Monday.',
    memory2Title: 'Credit rule',
    memory2Content: 'Only regular customers with at least 3 clean transactions get credit.',
  },
  Pharmacy: {
    products: [
      { name: 'Paracetamol 500mg ×12', unitPrice: 350, available: 200, reserved: 0, lowStockThreshold: 30 },
      { name: 'Amoxicillin 250mg ×21', unitPrice: 1800, available: 80, reserved: 4, lowStockThreshold: 15 },
      { name: 'Cetirizine 10mg ×10', unitPrice: 650, available: 100, reserved: 0, lowStockThreshold: 20 },
      { name: 'Vitamin C 1000mg ×30', unitPrice: 2500, available: 60, reserved: 0, lowStockThreshold: 10 },
    ],
    customers: [
      { name: 'Dr. Amaka Nwoke', phone: '0803 500 1122' },
      { name: 'Kunle Adeyemi', phone: '0812 600 2233' },
      { name: 'Zainab Usman', phone: '0901 700 3344' },
    ],
    order1ProductIdx: 1, order1Qty: 2, order1Paid: 0, order1CustomerIdx: 1, order1Note: 'Clinic credit — from WhatsApp',
    order2ProductIdx: 3, order2Qty: 2, order2Paid: 2000, order2CustomerIdx: 0, order2Note: 'Partial payment — from WhatsApp',
    conv1Label: 'WhatsApp · Kunle Adeyemi',
    conv1Lines: ['Customer: Give me Amoxicillin ×2 packs on credit', 'Seller: ₦3,600 added to clinic account.'],
    conv2Label: 'WhatsApp · Dr. Amaka Nwoke',
    conv2Lines: ['Customer: 2 Vitamin C 1000mg packs', 'Seller: ₦5,000. She paid ₦2,000 — balance ₦3,000.'],
    memory1Title: 'Drug distributor',
    memory1Content: 'NAFDAC-approved drugs ordered from Emzor Pharma rep every Wednesday.',
    memory2Title: 'Credit policy',
    memory2Content: 'Credit only for verified hospitals or clinics with a purchase order.',
  },
  Services: {
    products: [
      { name: 'Phone Screen Repair', unitPrice: 15000, available: 99, reserved: 0, lowStockThreshold: 5 },
      { name: 'Laptop RAM Upgrade', unitPrice: 25000, available: 99, reserved: 2, lowStockThreshold: 3 },
      { name: 'Data Recovery', unitPrice: 20000, available: 99, reserved: 0, lowStockThreshold: 3 },
      { name: 'Software Install', unitPrice: 5000, available: 99, reserved: 0, lowStockThreshold: 5 },
    ],
    customers: [
      { name: 'Yemi Olatunde', phone: '0803 111 9900' },
      { name: 'Obiora Nze', phone: '0812 222 8811' },
      { name: 'Rukayat Bello', phone: '0901 333 7722' },
    ],
    order1ProductIdx: 1, order1Qty: 1, order1Paid: 0, order1CustomerIdx: 1, order1Note: 'RAM upgrade balance — from WhatsApp',
    order2ProductIdx: 0, order2Qty: 1, order2Paid: 8000, order2CustomerIdx: 0, order2Note: 'Partial screen repair — from WhatsApp',
    conv1Label: 'WhatsApp · Obiora Nze',
    conv1Lines: ['Customer: How much for laptop RAM upgrade?', 'Seller: ₦25,000. I can do it today — pay on pickup.'],
    conv2Label: 'WhatsApp · Yemi Olatunde',
    conv2Lines: ['Customer: My phone screen broke fix am', 'Seller: ₦15,000. She paid ₦8,000 — balance ₦7,000.'],
    memory1Title: 'Parts supplier',
    memory1Content: 'Phone screens and laptop parts ordered from Ikeja Computer Village on Fridays.',
    memory2Title: 'Payment policy',
    memory2Content: 'Collect full payment for repairs above ₦20,000 before work begins.',
  },
  Wholesale: {
    products: [
      { name: 'Rice 50kg bag', unitPrice: 85000, available: 40, reserved: 0, lowStockThreshold: 5 },
      { name: 'Garri (Yellow) 25kg', unitPrice: 18000, available: 60, reserved: 3, lowStockThreshold: 8 },
      { name: 'Groundnut Oil 20L', unitPrice: 32000, available: 25, reserved: 0, lowStockThreshold: 4 },
      { name: 'Sugar 50kg', unitPrice: 62000, available: 20, reserved: 0, lowStockThreshold: 4 },
    ],
    customers: [
      { name: 'Iya Oge Market', phone: '0803 700 0011' },
      { name: 'Alhaji Dantata', phone: '0812 800 1122' },
      { name: 'Chibuike Traders', phone: '0701 900 2233' },
    ],
    order1ProductIdx: 0, order1Qty: 1, order1Paid: 0, order1CustomerIdx: 1, order1Note: 'Wholesale credit — from WhatsApp',
    order2ProductIdx: 1, order2Qty: 3, order2Paid: 25000, order2CustomerIdx: 0, order2Note: 'Partial payment — from WhatsApp',
    conv1Label: 'WhatsApp · Alhaji Dantata',
    conv1Lines: ['Customer: I need 1 bag of rice, pay later', 'Seller: ₦85,000. Reserve done — clear by month end.'],
    conv2Label: 'WhatsApp · Iya Oge Market',
    conv2Lines: ['Customer: 3 bags Garri Yellow', 'Seller: ₦54,000. She paid ₦25,000 — balance ₦29,000.'],
    memory1Title: 'Main supplier',
    memory1Content: 'Grains and cooking oil purchased directly from Dangote distributors on the 1st of each month.',
    memory2Title: 'Bulk credit rule',
    memory2Content: 'Credit only for market traders with a track record of 3+ clear invoices.',
  },
  Other: {
    products: [
      { name: 'Item A', unitPrice: 5000, available: 50, reserved: 0, lowStockThreshold: 8 },
      { name: 'Item B', unitPrice: 8000, available: 30, reserved: 1, lowStockThreshold: 5 },
      { name: 'Item C', unitPrice: 12000, available: 20, reserved: 0, lowStockThreshold: 4 },
      { name: 'Item D', unitPrice: 3000, available: 80, reserved: 0, lowStockThreshold: 10 },
    ],
    customers: [
      { name: 'Temi Adebayo', phone: '0803 900 1234' },
      { name: 'Segun Ogunnaike', phone: '0812 800 2345' },
      { name: 'Amina Lawal', phone: '0901 700 3456' },
    ],
    order1ProductIdx: 1, order1Qty: 1, order1Paid: 0, order1CustomerIdx: 1, order1Note: 'Balance owed — from WhatsApp',
    order2ProductIdx: 0, order2Qty: 2, order2Paid: 5000, order2CustomerIdx: 0, order2Note: 'Partial payment — from WhatsApp',
    conv1Label: 'WhatsApp · Segun Ogunnaike',
    conv1Lines: ['Customer: I want Item B, pay later', 'Seller: ₦8,000. Noted — balance on collection.'],
    conv2Label: 'WhatsApp · Temi Adebayo',
    conv2Lines: ['Customer: 2 pcs of Item A', 'Seller: ₦10,000. She paid ₦5,000 — balance ₦5,000.'],
    memory1Title: 'Preferred supplier',
    memory1Content: 'Main supplier contacted at the start of each month for restocking.',
    memory2Title: 'Credit rule',
    memory2Content: 'Only regular customers are given balance — new customers pay upfront.',
  },
};

function getSeedDef(category?: string): CategorySeedDef {
  return SEEDS[category ?? ''] ?? SEEDS['Electronics']!;
}

// ─── Main export ──────────────────────────────────────────────────────────────

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

  const def = getSeedDef(category);
  const now = new Date().toISOString();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // ── Add products ──
  const addedProducts: Product[] = [];
  for (const p of def.products) {
    const prod = await addProduct({ businessId, ...p });
    addedProducts.push(prod);
  }

  // ── Add customers ──
  const addedCustomers = [];
  for (const c of def.customers) {
    addedCustomers.push(await findOrCreateCustomer(businessId, c.name, c.phone));
  }

  // ── Order 1 ──
  const o1Prod = addedProducts[def.order1ProductIdx]!;
  const o1Cust = addedCustomers[def.order1CustomerIdx]!;
  const o1Total = o1Prod.unitPrice * def.order1Qty;
  const o1Paid = def.order1Paid;
  const o1Balance = o1Total - o1Paid;
  const o1Id = crypto.randomUUID();
  await persistApprovedOrder({
    order: {
      id: o1Id,
      businessId,
      customerId: o1Cust.id,
      customerName: o1Cust.name,
      items: [{
        id: crypto.randomUUID(),
        orderId: o1Id,
        productId: o1Prod.id,
        productName: o1Prod.name,
        variant: o1Prod.variant,
        quantity: def.order1Qty,
        unitPrice: o1Prod.unitPrice,
        lineTotal: o1Total,
      }],
      total: o1Total,
      amountPaid: o1Paid,
      balance: o1Balance,
      paymentStatus: o1Balance <= 0 ? 'paid' : o1Paid > 0 ? 'partially_paid' : 'unpaid',
      orderStatus: 'reserved',
      source: 'whatsapp',
      notes: def.order1Note,
      createdAt: yesterday,
    } satisfies Order,
    payment: o1Paid > 0
      ? { id: crypto.randomUUID(), businessId, orderId: o1Id, amount: o1Paid, method: 'transfer', createdAt: yesterday } satisfies Payment
      : undefined,
    inventoryEvent: {
      id: crypto.randomUUID(),
      businessId,
      productId: o1Prod.id,
      productName: o1Prod.name,
      eventType: 'reserve',
      quantity: def.order1Qty,
      orderId: o1Id,
      createdAt: yesterday,
    } satisfies InventoryEvent,
    productUpdate: { ...o1Prod, available: o1Prod.available - def.order1Qty, reserved: o1Prod.reserved + def.order1Qty },
    customerId: o1Cust.id,
    customerBalanceDelta: o1Balance,
    memory: {
      id: crypto.randomUUID(),
      businessId,
      kind: 'order',
      title: `WhatsApp order — ${o1Cust.name}`,
      content: `${o1Cust.name} ordered ${o1Prod.name}${o1Prod.variant ? ` (${o1Prod.variant})` : ''}. ${o1Paid > 0 ? `Paid ₦${o1Paid.toLocaleString()}, balance ₦${o1Balance.toLocaleString()}.` : `Balance ₦${o1Balance.toLocaleString()} due.`}`,
      trustLevel: 'confirmed',
      orderId: o1Id,
      createdAt: yesterday,
    } satisfies MemoryNote,
    audit: {
      id: crypto.randomUUID(),
      businessId,
      action: 'whatsapp_onboarding_seed',
      meta: { orderId: o1Id, customer: o1Cust.name },
      createdAt: yesterday,
    } satisfies AuditLog,
  });

  // ── Order 2 ──
  const o2Prod = addedProducts[def.order2ProductIdx]!;
  const o2Cust = addedCustomers[def.order2CustomerIdx]!;
  const o2Total = o2Prod.unitPrice * def.order2Qty;
  const o2Paid = def.order2Paid;
  const o2Balance = o2Total - o2Paid;
  const o2Id = crypto.randomUUID();
  await persistApprovedOrder({
    order: {
      id: o2Id,
      businessId,
      customerId: o2Cust.id,
      customerName: o2Cust.name,
      items: [{
        id: crypto.randomUUID(),
        orderId: o2Id,
        productId: o2Prod.id,
        productName: o2Prod.name,
        variant: o2Prod.variant,
        quantity: def.order2Qty,
        unitPrice: o2Prod.unitPrice,
        lineTotal: o2Total,
      }],
      total: o2Total,
      amountPaid: o2Paid,
      balance: o2Balance,
      paymentStatus: o2Balance <= 0 ? 'paid' : o2Paid > 0 ? 'partially_paid' : 'unpaid',
      orderStatus: 'reserved',
      source: 'whatsapp',
      notes: def.order2Note,
      createdAt: now,
    } satisfies Order,
    payment: o2Paid > 0
      ? { id: crypto.randomUUID(), businessId, orderId: o2Id, amount: o2Paid, method: 'transfer', createdAt: now } satisfies Payment
      : undefined,
    inventoryEvent: {
      id: crypto.randomUUID(),
      businessId,
      productId: o2Prod.id,
      productName: o2Prod.name,
      eventType: 'reserve',
      quantity: def.order2Qty,
      orderId: o2Id,
      createdAt: now,
    } satisfies InventoryEvent,
    productUpdate: { ...o2Prod, available: o2Prod.available - def.order2Qty, reserved: o2Prod.reserved + def.order2Qty },
    customerId: o2Cust.id,
    customerBalanceDelta: o2Balance,
    memory: {
      id: crypto.randomUUID(),
      businessId,
      kind: 'order',
      title: `WhatsApp order — ${o2Cust.name}`,
      content: `${o2Cust.name} ordered ${def.order2Qty}× ${o2Prod.name}${o2Prod.variant ? ` (${o2Prod.variant})` : ''} for ₦${o2Total.toLocaleString()}. ${o2Paid > 0 ? `Paid ₦${o2Paid.toLocaleString()}, balance ₦${o2Balance.toLocaleString()}.` : `Balance ₦${o2Balance.toLocaleString()} due.`}`,
      trustLevel: 'confirmed',
      orderId: o2Id,
      createdAt: now,
    } satisfies MemoryNote,
    audit: {
      id: crypto.randomUUID(),
      businessId,
      action: 'whatsapp_onboarding_seed',
      meta: { orderId: o2Id, customer: o2Cust.name },
      createdAt: now,
    } satisfies AuditLog,
  });

  // ── Conversations ──
  await saveConversation({
    id: crypto.randomUUID(),
    businessId,
    sourceLabel: def.conv1Label,
    sourceText: def.conv1Lines.join('\n'),
    createdAt: now,
  });
  await saveConversation({
    id: crypto.randomUUID(),
    businessId,
    sourceLabel: def.conv2Label,
    sourceText: def.conv2Lines.join('\n'),
    createdAt: yesterday,
  });

  await insertSeedMarker(businessId);

  // ── Policy memories ──
  if (storeMode() === 'memory') {
    getMemoryDb().memories.unshift(
      {
        id: crypto.randomUUID(),
        businessId,
        kind: 'policy',
        title: def.memory1Title,
        content: def.memory1Content,
        trustLevel: 'confirmed',
        createdAt: now,
      },
      {
        id: crypto.randomUUID(),
        businessId,
        kind: 'policy',
        title: def.memory2Title,
        content: def.memory2Content,
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
      content: `${def.memory1Title}: ${def.memory1Content}`,
      trust_level: 'confirmed',
      created_at: now,
    },
    {
      id: crypto.randomUUID(),
      business_id: businessId,
      kind: 'policy',
      content: `${def.memory2Title}: ${def.memory2Content}`,
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
