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

export function createSeedSnapshot() {
  const now = new Date().toISOString();
  return {
    user: {
      id: DEMO_USER_ID,
      name: 'Chinedu Okafor',
      email: 'chinedu@frebob.demo',
      preferredLanguage: 'en',
    },
    business: {
      id: DEMO_BUSINESS_ID,
      name: 'Chinedu Gadgets',
      category: 'Electronics retail',
      location: 'Alaba, Lagos',
      currency: 'NGN',
      preferredLanguage: 'en',
      phone: '+234 801 000 0000',
      ownerUserId: DEMO_USER_ID,
    },
    member: {
      businessId: DEMO_BUSINESS_ID,
      userId: DEMO_USER_ID,
      role: 'owner',
    },
    products: [
      {
        id: DEMO_PRODUCT_IDS.a15,
        businessId: DEMO_BUSINESS_ID,
        name: 'Samsung A15',
        variant: '128GB',
        unitPrice: 185000,
        available: 12,
        reserved: 0,
        lowStockThreshold: 4,
      },
      {
        id: DEMO_PRODUCT_IDS.a05,
        businessId: DEMO_BUSINESS_ID,
        name: 'Samsung A05',
        variant: '64GB',
        unitPrice: 115000,
        available: 8,
        reserved: 1,
        lowStockThreshold: 3,
      },
      {
        id: DEMO_PRODUCT_IDS.buds,
        businessId: DEMO_BUSINESS_ID,
        name: 'Galaxy Buds FE',
        unitPrice: 75000,
        available: 3,
        reserved: 0,
        lowStockThreshold: 4,
      },
      {
        id: DEMO_PRODUCT_IDS.charger,
        businessId: DEMO_BUSINESS_ID,
        name: '25W Fast Charger',
        unitPrice: 12000,
        available: 25,
        reserved: 0,
        lowStockThreshold: 5,
      },
    ],
    customers: [
      {
        id: DEMO_CUSTOMER_IDS.ada,
        businessId: DEMO_BUSINESS_ID,
        name: 'Ada Okoro',
        phone: '0803 111 2233',
        balanceOwed: 0,
      },
      {
        id: DEMO_CUSTOMER_IDS.tunde,
        businessId: DEMO_BUSINESS_ID,
        name: 'Tunde Bello',
        phone: '0812 444 5566',
        balanceOwed: 45000,
      },
      {
        id: DEMO_CUSTOMER_IDS.amina,
        businessId: DEMO_BUSINESS_ID,
        name: 'Amina Yusuf',
        phone: '0901 777 8899',
        balanceOwed: 0,
      },
    ],
    orders: [
      {
        id: DEMO_ORDER_ID,
        businessId: DEMO_BUSINESS_ID,
        customerId: DEMO_CUSTOMER_IDS.tunde,
        customerName: 'Tunde Bello',
        items: [
          {
            id: '00000000-0000-4000-8000-000000000042',
            orderId: DEMO_ORDER_ID,
            productId: DEMO_PRODUCT_IDS.a05,
            productName: 'Samsung A05',
            variant: '64GB',
            quantity: 1,
            unitPrice: 115000,
            lineTotal: 115000,
          },
        ],
        total: 115000,
        amountPaid: 70000,
        balance: 45000,
        paymentStatus: 'partially_paid' as const,
        orderStatus: 'reserved' as const,
        source: 'whatsapp' as const,
        notes: 'Balance tomorrow',
        createdAt: now,
      },
    ],
    payments: [
      {
        id: '00000000-0000-4000-8000-000000000043',
        businessId: DEMO_BUSINESS_ID,
        orderId: DEMO_ORDER_ID,
        amount: 70000,
        method: 'transfer' as const,
        createdAt: now,
      },
    ],
    inventoryEvents: [
      {
        id: '00000000-0000-4000-8000-000000000044',
        businessId: DEMO_BUSINESS_ID,
        productId: DEMO_PRODUCT_IDS.a05,
        productName: 'Samsung A05',
        eventType: 'reserve' as const,
        quantity: 1,
        orderId: DEMO_ORDER_ID,
        createdAt: now,
      },
    ],
    memories: [
      {
        id: '00000000-0000-4000-8000-000000000051',
        businessId: DEMO_BUSINESS_ID,
        kind: 'policy',
        title: 'Preferred suppliers',
        content: 'Phone accessories usually restocked from Computer Village on Wednesdays.',
        trustLevel: 'confirmed' as const,
        createdAt: now,
      },
      {
        id: '00000000-0000-4000-8000-000000000052',
        businessId: DEMO_BUSINESS_ID,
        kind: 'policy',
        title: 'Customer credit rule',
        content: 'Regulars may take goods on balance if prior payment history is clean.',
        trustLevel: 'confirmed' as const,
        createdAt: now,
      },
    ],
    extractions: [] as never[],
    auditLogs: [] as never[],
  };
}
