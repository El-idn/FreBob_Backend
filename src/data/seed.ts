/** Fixed demo UUIDs — keep in sync with docs/API_CONTRACT.md */

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

// ─── Types ────────────────────────────────────────────────────────────────────

type SeedProduct = {
  id: string;
  businessId: string;
  name: string;
  variant?: string;
  unitPrice: number;
  available: number;
  reserved: number;
  lowStockThreshold: number;
};

type SeedCustomer = {
  id: string;
  businessId: string;
  name: string;
  phone: string;
  balanceOwed: number;
};

// ─── Category snapshots ───────────────────────────────────────────────────────

function makeSnapshot(
  category: string,
  ownerName: string,
  ownerEmail: string,
  businessName: string,
  location: string,
  prods: Array<Omit<SeedProduct, 'businessId'>>,
  custs: Array<Omit<SeedCustomer, 'businessId'>>,
  orderProductIdx: number,
  orderQty: number,
  orderPaid: number,
  memories: [{ title: string; content: string }, { title: string; content: string }],
) {
  const now = new Date().toISOString();
  const BID = DEMO_BUSINESS_ID;
  const UID = DEMO_USER_ID;
  const OID = DEMO_ORDER_ID;

  const products = prods.map((p) => ({ ...p, businessId: BID }));
  const customers = custs.map((c) => ({ ...c, businessId: BID }));

  const orderProd = products[orderProductIdx]!;
  const orderCust = customers[1]!; // second customer always has the open balance
  const total = orderProd.unitPrice * orderQty;
  const balance = total - orderPaid;

  return {
    user: {
      id: UID,
      name: ownerName,
      email: ownerEmail,
      preferredLanguage: 'en',
    },
    business: {
      id: BID,
      name: businessName,
      category,
      location,
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
            quantity: orderQty,
            unitPrice: orderProd.unitPrice,
            lineTotal: total,
          },
        ],
        total,
        amountPaid: orderPaid,
        balance,
        paymentStatus: (balance <= 0 ? 'paid' : orderPaid > 0 ? 'partially_paid' : 'unpaid') as
          | 'paid'
          | 'partially_paid'
          | 'unpaid',
        orderStatus: 'reserved' as const,
        source: 'whatsapp' as const,
        notes: 'Balance tomorrow',
        createdAt: now,
      },
    ],
    payments: orderPaid > 0
      ? [
          {
            id: '00000000-0000-4000-8000-000000000043',
            businessId: BID,
            orderId: OID,
            amount: orderPaid,
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
        quantity: orderQty,
        orderId: OID,
        createdAt: now,
      },
    ],
    memories: [
      {
        id: '00000000-0000-4000-8000-000000000051',
        businessId: BID,
        kind: 'policy',
        title: memories[0].title,
        content: memories[0].content,
        trustLevel: 'confirmed' as const,
        createdAt: now,
      },
      {
        id: '00000000-0000-4000-8000-000000000052',
        businessId: BID,
        kind: 'policy',
        title: memories[1].title,
        content: memories[1].content,
        trustLevel: 'confirmed' as const,
        createdAt: now,
      },
    ],
    extractions: [] as never[],
    auditLogs: [] as never[],
  };
}

// ─── All 10 category datasets ─────────────────────────────────────────────────

const SNAPSHOTS: Record<string, ReturnType<typeof makeSnapshot>> = {
  'Retail / Shop': makeSnapshot(
    'Retail / Shop',
    'Nkechi Eze',
    'nkechi@frebob.demo',
    'Mama Nkechi Supermart',
    'Surulere, Lagos',
    [
      { id: '00000000-0000-4000-8000-000000000021', name: 'Indomie Noodles 70g', unitPrice: 250, available: 120, reserved: 0, lowStockThreshold: 20 },
      { id: '00000000-0000-4000-8000-000000000022', name: 'Milo 400g Tin', unitPrice: 3800, available: 30, reserved: 1, lowStockThreshold: 5 },
      { id: '00000000-0000-4000-8000-000000000023', name: 'Titus Sardines ×6', unitPrice: 3200, available: 48, reserved: 0, lowStockThreshold: 10 },
      { id: '00000000-0000-4000-8000-000000000024', name: 'Ariel Detergent 1kg', unitPrice: 2200, available: 60, reserved: 0, lowStockThreshold: 15 },
    ],
    [
      { id: '00000000-0000-4000-8000-000000000031', name: 'Mama Tunde', phone: '0803 200 1100', balanceOwed: 0 },
      { id: '00000000-0000-4000-8000-000000000032', name: 'Bisi Adeyemi', phone: '0812 300 4455', balanceOwed: 3200 },
      { id: '00000000-0000-4000-8000-000000000033', name: 'Alhaji Sule', phone: '0701 500 6677', balanceOwed: 0 },
    ],
    1, 1, 0,
    [
      { title: 'Wholesale supplier', content: 'Goods restocked from Aspamda market every Monday and Thursday.' },
      { title: 'Credit rule', content: 'Only give balance to customers who have cleared previous debts.' },
    ],
  ),

  'Fashion & Tailoring': makeSnapshot(
    'Fashion & Tailoring',
    'Bola Adeyemi',
    'bola@frebob.demo',
    'Stitches by Bola',
    'Yaba, Lagos',
    [
      { id: '00000000-0000-4000-8000-000000000021', name: 'Ankara Fabric (per yard)', unitPrice: 1800, available: 80, reserved: 0, lowStockThreshold: 10 },
      { id: '00000000-0000-4000-8000-000000000022', name: 'Plain Cotton (3 yards)', unitPrice: 4500, available: 25, reserved: 2, lowStockThreshold: 5 },
      { id: '00000000-0000-4000-8000-000000000023', name: 'French Lace (per yard)', unitPrice: 6500, available: 15, reserved: 0, lowStockThreshold: 3 },
      { id: '00000000-0000-4000-8000-000000000024', name: 'Tailoring Thread Set', unitPrice: 1200, available: 40, reserved: 0, lowStockThreshold: 8 },
    ],
    [
      { id: '00000000-0000-4000-8000-000000000031', name: 'Funmi Adeola', phone: '0803 111 7788', balanceOwed: 0 },
      { id: '00000000-0000-4000-8000-000000000032', name: 'Ngozi Obi', phone: '0812 222 3344', balanceOwed: 6500 },
      { id: '00000000-0000-4000-8000-000000000033', name: 'Halima Musa', phone: '0901 333 5566', balanceOwed: 0 },
    ],
    2, 1, 0,
    [
      { title: 'Fabric supplier', content: 'Ankara and lace fabric sourced from Balogun market every Tuesday.' },
      { title: 'Deposit policy', content: 'Customers must pay 50% deposit before sewing begins.' },
    ],
  ),

  'Food & Restaurant': makeSnapshot(
    'Food & Restaurant',
    'Ngozi Chukwu',
    'ngozi@frebob.demo',
    'Mama Put by Ngozi',
    'Ikeja, Lagos',
    [
      { id: '00000000-0000-4000-8000-000000000021', name: 'Jollof Rice + Chicken', unitPrice: 2500, available: 50, reserved: 0, lowStockThreshold: 10 },
      { id: '00000000-0000-4000-8000-000000000022', name: 'Egusi Soup + Eba', unitPrice: 2000, available: 40, reserved: 2, lowStockThreshold: 8 },
      { id: '00000000-0000-4000-8000-000000000023', name: 'Pepper Soup (Goat)', unitPrice: 3500, available: 20, reserved: 0, lowStockThreshold: 5 },
      { id: '00000000-0000-4000-8000-000000000024', name: 'Puff-Puff ×10', unitPrice: 500, available: 100, reserved: 0, lowStockThreshold: 20 },
    ],
    [
      { id: '00000000-0000-4000-8000-000000000031', name: 'Emeka Okafor', phone: '0803 444 2211', balanceOwed: 0 },
      { id: '00000000-0000-4000-8000-000000000032', name: 'Stella Nwachukwu', phone: '0812 555 3322', balanceOwed: 5000 },
      { id: '00000000-0000-4000-8000-000000000033', name: 'Biodun Alabi', phone: '0701 666 4433', balanceOwed: 0 },
    ],
    0, 2, 2500,
    [
      { title: 'Market days', content: 'Fresh ingredients bought from Mile 12 market every Tuesday and Friday.' },
      { title: 'Credit rule', content: 'Only office customers with standing orders can take food on credit.' },
    ],
  ),

  'Beauty & Salon': makeSnapshot(
    'Beauty & Salon',
    'Chisom Eze',
    'chisom@frebob.demo',
    'Glam Hub by Chisom',
    'Lekki, Lagos',
    [
      { id: '00000000-0000-4000-8000-000000000021', name: 'Relaxer Kit (Mild)', unitPrice: 4500, available: 20, reserved: 0, lowStockThreshold: 4 },
      { id: '00000000-0000-4000-8000-000000000022', name: 'Human Hair Wig 14"', unitPrice: 45000, available: 8, reserved: 1, lowStockThreshold: 2 },
      { id: '00000000-0000-4000-8000-000000000023', name: 'Gel Nail Set', unitPrice: 8000, available: 12, reserved: 0, lowStockThreshold: 3 },
      { id: '00000000-0000-4000-8000-000000000024', name: 'Pedicure Session', unitPrice: 5000, available: 99, reserved: 0, lowStockThreshold: 5 },
    ],
    [
      { id: '00000000-0000-4000-8000-000000000031', name: 'Adaeze Nwosu', phone: '0803 777 1122', balanceOwed: 0 },
      { id: '00000000-0000-4000-8000-000000000032', name: 'Temi Lawson', phone: '0812 888 2233', balanceOwed: 45000 },
      { id: '00000000-0000-4000-8000-000000000033', name: 'Fatima Abubakar', phone: '0901 999 3344', balanceOwed: 0 },
    ],
    1, 1, 0,
    [
      { title: 'Product supplier', content: 'Hair and beauty products restocked from Eleganza on the last Friday of each month.' },
      { title: 'Booking rule', content: 'Wig installs and relaxers require 24-hour advance booking. Walk-ins for braids only.' },
    ],
  ),

  Electronics: makeSnapshot(
    'Electronics',
    'Chinedu Okafor',
    'chinedu@frebob.demo',
    'Chinedu Gadgets',
    'Alaba, Lagos',
    [
      { id: DEMO_PRODUCT_IDS.a15, name: 'Samsung A15', variant: '128GB', unitPrice: 185000, available: 12, reserved: 0, lowStockThreshold: 4 },
      { id: DEMO_PRODUCT_IDS.a05, name: 'Samsung A05', variant: '64GB', unitPrice: 115000, available: 8, reserved: 1, lowStockThreshold: 3 },
      { id: DEMO_PRODUCT_IDS.buds, name: 'Galaxy Buds FE', unitPrice: 75000, available: 3, reserved: 0, lowStockThreshold: 4 },
      { id: DEMO_PRODUCT_IDS.charger, name: '25W Fast Charger', unitPrice: 12000, available: 25, reserved: 0, lowStockThreshold: 5 },
    ],
    [
      { id: DEMO_CUSTOMER_IDS.ada, name: 'Ada Okoro', phone: '0803 111 2233', balanceOwed: 0 },
      { id: DEMO_CUSTOMER_IDS.tunde, name: 'Tunde Bello', phone: '0812 444 5566', balanceOwed: 45000 },
      { id: DEMO_CUSTOMER_IDS.amina, name: 'Amina Yusuf', phone: '0901 777 8899', balanceOwed: 0 },
    ],
    1, 1, 70000,
    [
      { title: 'Preferred suppliers', content: 'Phone accessories usually restocked from Computer Village on Wednesdays.' },
      { title: 'Customer credit rule', content: 'Regulars may take goods on balance if prior payment history is clean.' },
    ],
  ),

  'Provision Store': makeSnapshot(
    'Provision Store',
    'Musa Aliyu',
    'musa@frebob.demo',
    'Alhaji Musa Stores',
    'Kano, Kano State',
    [
      { id: '00000000-0000-4000-8000-000000000021', name: 'Golden Morn 1kg', unitPrice: 3200, available: 50, reserved: 0, lowStockThreshold: 10 },
      { id: '00000000-0000-4000-8000-000000000022', name: 'Semovita 1kg', unitPrice: 1500, available: 80, reserved: 2, lowStockThreshold: 15 },
      { id: '00000000-0000-4000-8000-000000000023', name: 'Peak Milk 400g', unitPrice: 4800, available: 35, reserved: 0, lowStockThreshold: 8 },
      { id: '00000000-0000-4000-8000-000000000024', name: 'Vegetable Oil 1L', unitPrice: 2200, available: 60, reserved: 0, lowStockThreshold: 12 },
    ],
    [
      { id: '00000000-0000-4000-8000-000000000031', name: 'Mama Emeka', phone: '0803 122 3344', balanceOwed: 0 },
      { id: '00000000-0000-4000-8000-000000000032', name: 'Chukwudi Obi', phone: '0812 233 4455', balanceOwed: 6000 },
      { id: '00000000-0000-4000-8000-000000000033', name: 'Adamu Ibrahim', phone: '0701 344 5566', balanceOwed: 0 },
    ],
    2, 1, 0,
    [
      { title: 'Wholesale dealer', content: 'Dry goods restocked from Dawanau market depot every Monday.' },
      { title: 'Credit rule', content: 'Only regular customers with at least 3 clean transactions get credit.' },
    ],
  ),

  Pharmacy: makeSnapshot(
    'Pharmacy',
    'Bright Eze',
    'bright@frebob.demo',
    'Bright Health Pharmacy',
    'Abuja, FCT',
    [
      { id: '00000000-0000-4000-8000-000000000021', name: 'Paracetamol 500mg ×12', unitPrice: 350, available: 200, reserved: 0, lowStockThreshold: 30 },
      { id: '00000000-0000-4000-8000-000000000022', name: 'Amoxicillin 250mg ×21', unitPrice: 1800, available: 80, reserved: 4, lowStockThreshold: 15 },
      { id: '00000000-0000-4000-8000-000000000023', name: 'Cetirizine 10mg ×10', unitPrice: 650, available: 100, reserved: 0, lowStockThreshold: 20 },
      { id: '00000000-0000-4000-8000-000000000024', name: 'Vitamin C 1000mg ×30', unitPrice: 2500, available: 60, reserved: 0, lowStockThreshold: 10 },
    ],
    [
      { id: '00000000-0000-4000-8000-000000000031', name: 'Dr. Amaka Nwoke', phone: '0803 500 1122', balanceOwed: 0 },
      { id: '00000000-0000-4000-8000-000000000032', name: 'Kunle Adeyemi', phone: '0812 600 2233', balanceOwed: 3600 },
      { id: '00000000-0000-4000-8000-000000000033', name: 'Zainab Usman', phone: '0901 700 3344', balanceOwed: 0 },
    ],
    1, 2, 0,
    [
      { title: 'Drug distributor', content: 'NAFDAC-approved drugs ordered from Emzor Pharma rep every Wednesday.' },
      { title: 'Credit policy', content: 'Credit only for verified hospitals or clinics with a purchase order.' },
    ],
  ),

  Services: makeSnapshot(
    'Services',
    'Emeka Chukwu',
    'emeka@frebob.demo',
    'Emeka Tech Services',
    'Victoria Island, Lagos',
    [
      { id: '00000000-0000-4000-8000-000000000021', name: 'Phone Screen Repair', unitPrice: 15000, available: 99, reserved: 0, lowStockThreshold: 5 },
      { id: '00000000-0000-4000-8000-000000000022', name: 'Laptop RAM Upgrade', unitPrice: 25000, available: 99, reserved: 2, lowStockThreshold: 3 },
      { id: '00000000-0000-4000-8000-000000000023', name: 'Data Recovery', unitPrice: 20000, available: 99, reserved: 0, lowStockThreshold: 3 },
      { id: '00000000-0000-4000-8000-000000000024', name: 'Software Install', unitPrice: 5000, available: 99, reserved: 0, lowStockThreshold: 5 },
    ],
    [
      { id: '00000000-0000-4000-8000-000000000031', name: 'Yemi Olatunde', phone: '0803 111 9900', balanceOwed: 0 },
      { id: '00000000-0000-4000-8000-000000000032', name: 'Obiora Nze', phone: '0812 222 8811', balanceOwed: 25000 },
      { id: '00000000-0000-4000-8000-000000000033', name: 'Rukayat Bello', phone: '0901 333 7722', balanceOwed: 0 },
    ],
    1, 1, 0,
    [
      { title: 'Parts supplier', content: 'Phone screens and laptop parts ordered from Ikeja Computer Village on Fridays.' },
      { title: 'Payment policy', content: 'Collect full payment for repairs above ₦20,000 before work begins.' },
    ],
  ),

  Wholesale: makeSnapshot(
    'Wholesale',
    'Umar Abdullahi',
    'umar@frebob.demo',
    'Hausa Traders Hub',
    'Kano, Kano State',
    [
      { id: '00000000-0000-4000-8000-000000000021', name: 'Rice 50kg bag', unitPrice: 85000, available: 40, reserved: 0, lowStockThreshold: 5 },
      { id: '00000000-0000-4000-8000-000000000022', name: 'Garri (Yellow) 25kg', unitPrice: 18000, available: 60, reserved: 3, lowStockThreshold: 8 },
      { id: '00000000-0000-4000-8000-000000000023', name: 'Groundnut Oil 20L', unitPrice: 32000, available: 25, reserved: 0, lowStockThreshold: 4 },
      { id: '00000000-0000-4000-8000-000000000024', name: 'Sugar 50kg', unitPrice: 62000, available: 20, reserved: 0, lowStockThreshold: 4 },
    ],
    [
      { id: '00000000-0000-4000-8000-000000000031', name: 'Iya Oge Market', phone: '0803 700 0011', balanceOwed: 0 },
      { id: '00000000-0000-4000-8000-000000000032', name: 'Alhaji Dantata', phone: '0812 800 1122', balanceOwed: 85000 },
      { id: '00000000-0000-4000-8000-000000000033', name: 'Chibuike Traders', phone: '0701 900 2233', balanceOwed: 0 },
    ],
    0, 1, 0,
    [
      { title: 'Main supplier', content: 'Grains and cooking oil purchased directly from Dangote distributors on the 1st of each month.' },
      { title: 'Bulk credit rule', content: 'Credit only for market traders with a track record of 3+ clear invoices.' },
    ],
  ),

  Other: makeSnapshot(
    'Other',
    'Temi Adebayo',
    'temi@frebob.demo',
    'Temi Business',
    'Lagos, Nigeria',
    [
      { id: '00000000-0000-4000-8000-000000000021', name: 'Item A', unitPrice: 5000, available: 50, reserved: 0, lowStockThreshold: 8 },
      { id: '00000000-0000-4000-8000-000000000022', name: 'Item B', unitPrice: 8000, available: 30, reserved: 1, lowStockThreshold: 5 },
      { id: '00000000-0000-4000-8000-000000000023', name: 'Item C', unitPrice: 12000, available: 20, reserved: 0, lowStockThreshold: 4 },
      { id: '00000000-0000-4000-8000-000000000024', name: 'Item D', unitPrice: 3000, available: 80, reserved: 0, lowStockThreshold: 10 },
    ],
    [
      { id: '00000000-0000-4000-8000-000000000031', name: 'Temi Adebayo', phone: '0803 900 1234', balanceOwed: 0 },
      { id: '00000000-0000-4000-8000-000000000032', name: 'Segun Ogunnaike', phone: '0812 800 2345', balanceOwed: 8000 },
      { id: '00000000-0000-4000-8000-000000000033', name: 'Amina Lawal', phone: '0901 700 3456', balanceOwed: 0 },
    ],
    1, 1, 0,
    [
      { title: 'Preferred supplier', content: 'Main supplier contacted at the start of each month for restocking.' },
      { title: 'Credit rule', content: 'Only regular customers are given balance — new customers pay upfront.' },
    ],
  ),
};

// ─── Public API ───────────────────────────────────────────────────────────────

export function createSeedSnapshotForCategory(category?: string) {
  return SNAPSHOTS[category ?? ''] ?? SNAPSHOTS['Electronics']!;
}

/** Backward-compat — defaults to Electronics */
export function createSeedSnapshot() {
  return createSeedSnapshotForCategory('Electronics');
}

export function isDemoBusiness(id: string): boolean {
  return id === DEMO_BUSINESS_ID;
}
