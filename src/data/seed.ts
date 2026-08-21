/** Fixed demo UUIDs — keep in sync with docs/API_CONTRACT.md */

import {
  CATEGORY_SEED_FALLBACK,
  getCategorySeedCatalog,
  type CategorySeedCatalogEntry,
} from './categorySeedCatalog.js';

export const DEMO_BUSINESS_ID = '00000000-0000-4000-8000-000000000001';
export const DEMO_USER_ID = '00000000-0000-4000-8000-000000000010';

export const DEMO_PRODUCT_IDS = {
  a15: '00000000-0000-4000-8000-000000000021',
  a05: '00000000-0000-4000-8000-000000000022',
  buds: '00000000-0000-4000-8000-000000000023',
  charger: '00000000-0000-4000-8000-000000000024',
} as const;

export const DEMO_CUSTOMER_IDS = {
  ada: '00000000-0000-4000-8000-000000000031',
  tunde: '00000000-0000-4000-8000-000000000032',
  amina: '00000000-0000-4000-8000-000000000033',
} as const;

export const DEMO_ORDER_ID = '00000000-0000-4000-8000-000000000041';

const PRODUCT_IDS = [
  '00000000-0000-4000-8000-000000000021',
  '00000000-0000-4000-8000-000000000022',
  '00000000-0000-4000-8000-000000000023',
  '00000000-0000-4000-8000-000000000024',
] as const;

const CUSTOMER_IDS = [
  '00000000-0000-4000-8000-000000000031',
  '00000000-0000-4000-8000-000000000032',
  '00000000-0000-4000-8000-000000000033',
] as const;

/** Demo owner / storefront identity per category (not part of shared catalog). */
const DEMO_IDENTITIES: Record<
  string,
  { ownerName: string; ownerEmail: string; businessName: string; location: string }
> = {
  'Retail / Shop': {
    ownerName: 'Nkechi Eze',
    ownerEmail: 'nkechi@frebob.demo',
    businessName: 'Mama Nkechi Supermart',
    location: 'Surulere, Lagos',
  },
  'Fashion & Tailoring': {
    ownerName: 'Bola Adeyemi',
    ownerEmail: 'bola@frebob.demo',
    businessName: 'Stitches by Bola',
    location: 'Yaba, Lagos',
  },
  'Food & Restaurant': {
    ownerName: 'Ngozi Chukwu',
    ownerEmail: 'ngozi@frebob.demo',
    businessName: 'Mama Put by Ngozi',
    location: 'Ikeja, Lagos',
  },
  'Beauty & Salon': {
    ownerName: 'Chisom Eze',
    ownerEmail: 'chisom@frebob.demo',
    businessName: 'Glam Hub by Chisom',
    location: 'Lekki, Lagos',
  },
  Electronics: {
    ownerName: 'Chinedu Okafor',
    ownerEmail: 'chinedu@frebob.demo',
    businessName: 'Chinedu Gadgets',
    location: 'Alaba, Lagos',
  },
  'Provision Store': {
    ownerName: 'Musa Aliyu',
    ownerEmail: 'musa@frebob.demo',
    businessName: 'Alhaji Musa Stores',
    location: 'Kano, Kano State',
  },
  Pharmacy: {
    ownerName: 'Bright Eze',
    ownerEmail: 'bright@frebob.demo',
    businessName: 'Bright Health Pharmacy',
    location: 'Abuja, FCT',
  },
  Services: {
    ownerName: 'Emeka Chukwu',
    ownerEmail: 'emeka@frebob.demo',
    businessName: 'Emeka Tech Services',
    location: 'Victoria Island, Lagos',
  },
  Wholesale: {
    ownerName: 'Umar Abdullahi',
    ownerEmail: 'umar@frebob.demo',
    businessName: 'Hausa Traders Hub',
    location: 'Kano, Kano State',
  },
  Other: {
    ownerName: 'Temi Adebayo',
    ownerEmail: 'temi@frebob.demo',
    businessName: 'Temi Business',
    location: 'Lagos, Nigeria',
  },
};

function makeSnapshot(
  category: string,
  identity: {
    ownerName: string;
    ownerEmail: string;
    businessName: string;
    location: string;
  },
  catalog: CategorySeedCatalogEntry,
) {
  const now = new Date().toISOString();
  const BID = DEMO_BUSINESS_ID;
  const UID = DEMO_USER_ID;
  const OID = DEMO_ORDER_ID;
  const order = catalog.primaryOrder;

  const products = catalog.products.map((p, i) => ({
    id: PRODUCT_IDS[i]!,
    businessId: BID,
    name: p.name,
    variant: p.variant,
    unitPrice: p.unitPrice,
    available: p.available,
    reserved: p.reserved,
    lowStockThreshold: p.lowStockThreshold,
  }));

  const orderProd = products[order.productIdx]!;
  const total = orderProd.unitPrice * order.qty;
  const balance = Math.max(0, total - order.paid);

  // Apply primary order stock reservation onto the snapshot product row.
  orderProd.available = Math.max(0, orderProd.available - order.qty);
  orderProd.reserved += order.qty;

  const customers = catalog.customers.map((c, i) => ({
    id: CUSTOMER_IDS[i]!,
    businessId: BID,
    name: c.name,
    phone: c.phone,
    balanceOwed: i === order.customerIdx ? balance : 0,
  }));

  const orderCust = customers[order.customerIdx]!;

  return {
    user: {
      id: UID,
      name: identity.ownerName,
      email: identity.ownerEmail,
      preferredLanguage: 'en',
    },
    business: {
      id: BID,
      name: identity.businessName,
      category,
      location: identity.location,
      currency: 'NGN',
      preferredLanguage: 'en',
      phone: '+234 801 000 0000',
      ownerUserId: UID,
    },
    member: { businessId: BID, userId: UID, role: 'owner' },
    products,
    customers,
    orders: [
      {
        id: OID,
        businessId: BID,
        customerId: orderCust.id,
        customerName: orderCust.name,
        items: [
          {
            id: '00000000-0000-4000-8000-000000000042',
            orderId: OID,
            productId: orderProd.id,
            productName: orderProd.name,
            variant: orderProd.variant,
            quantity: order.qty,
            unitPrice: orderProd.unitPrice,
            lineTotal: total,
          },
        ],
        total,
        amountPaid: order.paid,
        balance,
        paymentStatus: (balance <= 0 ? 'paid' : order.paid > 0 ? 'partially_paid' : 'unpaid') as
          | 'paid'
          | 'partially_paid'
          | 'unpaid',
        orderStatus: 'reserved' as const,
        source: 'whatsapp' as const,
        notes: 'Balance tomorrow',
        createdAt: now,
      },
    ],
    payments:
      order.paid > 0
        ? [
            {
              id: '00000000-0000-4000-8000-000000000043',
              businessId: BID,
              orderId: OID,
              amount: order.paid,
              method: 'transfer' as const,
              createdAt: now,
            },
          ]
        : [],
    inventoryEvents: [
      {
        id: '00000000-0000-4000-8000-000000000044',
        businessId: BID,
        productId: orderProd.id,
        productName: orderProd.name,
        eventType: 'reserve' as const,
        quantity: order.qty,
        orderId: OID,
        createdAt: now,
      },
    ],
    memories: [
      {
        id: '00000000-0000-4000-8000-000000000051',
        businessId: BID,
        kind: 'policy',
        title: catalog.policies[0].title,
        content: catalog.policies[0].content,
        trustLevel: 'confirmed' as const,
        createdAt: now,
      },
      {
        id: '00000000-0000-4000-8000-000000000052',
        businessId: BID,
        kind: 'policy',
        title: catalog.policies[1].title,
        content: catalog.policies[1].content,
        trustLevel: 'confirmed' as const,
        createdAt: now,
      },
    ],
    extractions: [] as never[],
    auditLogs: [] as never[],
  };
}

function buildSnapshots() {
  const out: Record<string, ReturnType<typeof makeSnapshot>> = {};
  for (const category of Object.keys(DEMO_IDENTITIES)) {
    out[category] = makeSnapshot(
      category,
      DEMO_IDENTITIES[category]!,
      getCategorySeedCatalog(category),
    );
  }
  return out;
}

const SNAPSHOTS = buildSnapshots();

// ─── Public API ───────────────────────────────────────────────────────────────

export function createSeedSnapshotForCategory(category?: string) {
  return SNAPSHOTS[category ?? ''] ?? SNAPSHOTS[CATEGORY_SEED_FALLBACK]!;
}

/** Backward-compat — defaults to Electronics */
export function createSeedSnapshot() {
  return createSeedSnapshotForCategory('Electronics');
}

export function isDemoBusiness(id: string): boolean {
  return id === DEMO_BUSINESS_ID;
}
