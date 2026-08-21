/** Shared per-category seed templates for demo snapshot + WhatsApp onboarding. */

export const CATEGORY_SEED_FALLBACK = 'Electronics';

export type CategorySeedProduct = {
  name: string;
  variant?: string;
  unitPrice: number;
  available: number;
  /** Base reserved before seed orders are applied. */
  reserved: number;
  lowStockThreshold: number;
};

export type CategorySeedCustomer = {
  name: string;
  phone: string;
};

export type CategorySeedOrder = {
  productIdx: number;
  qty: number;
  paid: number;
  customerIdx: number;
  note: string;
};

export type CategorySeedCatalogEntry = {
  products: CategorySeedProduct[];
  customers: CategorySeedCustomer[];
  policies: [{ title: string; content: string }, { title: string; content: string }];
  primaryOrder: CategorySeedOrder;
  secondaryOrder: CategorySeedOrder;
  conversations: {
    label1: string;
    lines1: string[];
    label2: string;
    lines2: string[];
  };
};

export const CATEGORY_SEED_CATALOG: Record<string, CategorySeedCatalogEntry> = {
  "Retail / Shop": {
    products: [
      {
        name: "Indomie Noodles 70g",
        unitPrice: 250,
        available: 120,
        reserved: 0,
        lowStockThreshold: 20
      },
      {
        name: "Milo 400g Tin",
        unitPrice: 3800,
        available: 30,
        reserved: 1,
        lowStockThreshold: 5
      },
      {
        name: "Titus Sardines ×6",
        unitPrice: 3200,
        available: 48,
        reserved: 0,
        lowStockThreshold: 10
      },
      {
        name: "Ariel Detergent 1kg",
        unitPrice: 2200,
        available: 60,
        reserved: 0,
        lowStockThreshold: 15
      }
    ],
    customers: [
      {
        name: "Mama Tunde",
        phone: "0803 200 1100"
      },
      {
        name: "Bisi Adeyemi",
        phone: "0812 300 4455"
      },
      {
        name: "Alhaji Sule",
        phone: "0701 500 6677"
      }
    ],
    primaryOrder: {
      productIdx: 1,
      qty: 2,
      paid: 0,
      customerIdx: 1,
      note: "Buying on credit — from WhatsApp"
    },
    secondaryOrder: {
      productIdx: 0,
      qty: 10,
      paid: 1500,
      customerIdx: 0,
      note: "Partial payment — from WhatsApp"
    },
    conversations: {
      label1: "WhatsApp · Bisi Adeyemi",
      lines1: ["Customer: I need Milo 2 tins on credit", "Seller: Okay, ₦7,600. I reserve am for you."],
      label2: "WhatsApp · Mama Tunde",
      lines2: ["Customer: Give me Indomie 10 cartons", "Seller: ₦2,500 for 10. You paid ₦1,500 — balance ₦1,000."]
    },
    policies: [
      {
        title: "Wholesale supplier",
        content: "Goods restocked from Aspamda market every Monday and Thursday."
      },
      {
        title: "Credit rule",
        content: "Only give balance to customers who have cleared previous debts."
      }
    ]
  },
  "Fashion & Tailoring": {
    products: [
      {
        name: "Ankara Fabric (per yard)",
        unitPrice: 1800,
        available: 80,
        reserved: 0,
        lowStockThreshold: 10
      },
      {
        name: "Plain Cotton (3 yards)",
        unitPrice: 4500,
        available: 25,
        reserved: 2,
        lowStockThreshold: 5
      },
      {
        name: "French Lace (per yard)",
        unitPrice: 6500,
        available: 15,
        reserved: 0,
        lowStockThreshold: 3
      },
      {
        name: "Tailoring Thread Set",
        unitPrice: 1200,
        available: 40,
        reserved: 0,
        lowStockThreshold: 8
      }
    ],
    customers: [
      {
        name: "Funmi Adeola",
        phone: "0803 111 7788"
      },
      {
        name: "Ngozi Obi",
        phone: "0812 222 3344"
      },
      {
        name: "Halima Musa",
        phone: "0901 333 5566"
      }
    ],
    primaryOrder: {
      productIdx: 2,
      qty: 1,
      paid: 0,
      customerIdx: 1,
      note: "Lace order — from WhatsApp"
    },
    secondaryOrder: {
      productIdx: 0,
      qty: 6,
      paid: 5000,
      customerIdx: 0,
      note: "Partial deposit — from WhatsApp"
    },
    conversations: {
      label1: "WhatsApp · Ngozi Obi",
      lines1: ["Customer: I want French Lace 1 yard", "Seller: ₦6,500. Reserve done, pay when you pick up."],
      label2: "WhatsApp · Funmi Adeola",
      lines2: ["Customer: 6 yards of Ankara please", "Seller: ₦10,800. She paid ₦5,000 deposit."]
    },
    policies: [
      {
        title: "Fabric supplier",
        content: "Ankara and lace fabric sourced from Balogun market every Tuesday."
      },
      {
        title: "Deposit policy",
        content: "Customers must pay 50% deposit before sewing begins."
      }
    ]
  },
  "Food & Restaurant": {
    products: [
      {
        name: "Jollof Rice + Chicken",
        unitPrice: 2500,
        available: 50,
        reserved: 0,
        lowStockThreshold: 10
      },
      {
        name: "Egusi Soup + Eba",
        unitPrice: 2000,
        available: 40,
        reserved: 2,
        lowStockThreshold: 8
      },
      {
        name: "Pepper Soup (Goat)",
        unitPrice: 3500,
        available: 20,
        reserved: 0,
        lowStockThreshold: 5
      },
      {
        name: "Puff-Puff ×10",
        unitPrice: 500,
        available: 100,
        reserved: 0,
        lowStockThreshold: 20
      }
    ],
    customers: [
      {
        name: "Emeka Okafor",
        phone: "0803 444 2211"
      },
      {
        name: "Stella Nwachukwu",
        phone: "0812 555 3322"
      },
      {
        name: "Biodun Alabi",
        phone: "0701 666 4433"
      }
    ],
    primaryOrder: {
      productIdx: 0,
      qty: 2,
      paid: 2500,
      customerIdx: 1,
      note: "Lunch order — from WhatsApp"
    },
    secondaryOrder: {
      productIdx: 2,
      qty: 1,
      paid: 0,
      customerIdx: 0,
      note: "Pepper soup credit — from WhatsApp"
    },
    conversations: {
      label1: "WhatsApp · Stella Nwachukwu",
      lines1: ["Customer: 2 plates jollof rice please", "Seller: ₦5,000. She paid ₦2,500 — balance ₦2,500."],
      label2: "WhatsApp · Emeka Okafor",
      lines2: ["Customer: Pepper soup goat, add am for my balance", "Seller: Done. ₦3,500 added to your tab."]
    },
    policies: [
      {
        title: "Market days",
        content: "Fresh ingredients bought from Mile 12 market every Tuesday and Friday."
      },
      {
        title: "Credit rule",
        content: "Only office customers with standing orders can take food on credit."
      }
    ]
  },
  "Beauty & Salon": {
    products: [
      {
        name: "Relaxer Kit (Mild)",
        unitPrice: 4500,
        available: 20,
        reserved: 0,
        lowStockThreshold: 4
      },
      {
        name: "Human Hair Wig 14\"",
        unitPrice: 45_000,
        available: 8,
        reserved: 1,
        lowStockThreshold: 2
      },
      {
        name: "Gel Nail Set",
        unitPrice: 8000,
        available: 12,
        reserved: 0,
        lowStockThreshold: 3
      },
      {
        name: "Pedicure Session",
        unitPrice: 5000,
        available: 99,
        reserved: 0,
        lowStockThreshold: 5
      }
    ],
    customers: [
      {
        name: "Adaeze Nwosu",
        phone: "0803 777 1122"
      },
      {
        name: "Temi Lawson",
        phone: "0812 888 2233"
      },
      {
        name: "Fatima Abubakar",
        phone: "0901 999 3344"
      }
    ],
    primaryOrder: {
      productIdx: 1,
      qty: 1,
      paid: 0,
      customerIdx: 1,
      note: "Wig reservation — from WhatsApp"
    },
    secondaryOrder: {
      productIdx: 2,
      qty: 1,
      paid: 5000,
      customerIdx: 0,
      note: "Partial nail payment — from WhatsApp"
    },
    conversations: {
      label1: "WhatsApp · Temi Lawson",
      lines1: ["Customer: Reserve the 14 inch wig for me", "Seller: Done. ₦45,000 — full payment on pickup."],
      label2: "WhatsApp · Adaeze Nwosu",
      lines2: ["Customer: I want gel nail set", "Seller: ₦8,000. She paid ₦5,000 — balance ₦3,000."]
    },
    policies: [
      {
        title: "Product supplier",
        content: "Hair and beauty products restocked from Eleganza on the last Friday of each month."
      },
      {
        title: "Booking rule",
        content: "Wig installs and relaxers require 24-hour advance booking. Walk-ins for braids only."
      }
    ]
  },
  "Electronics": {
    products: [
      {
        name: "Samsung A15",
        variant: "128GB",
        unitPrice: 185_000,
        available: 12,
        reserved: 0,
        lowStockThreshold: 4
      },
      {
        name: "Samsung A05",
        variant: "64GB",
        unitPrice: 115_000,
        available: 8,
        reserved: 0,
        lowStockThreshold: 3
      },
      {
        name: "Galaxy Buds FE",
        unitPrice: 75_000,
        available: 3,
        reserved: 0,
        lowStockThreshold: 4
      },
      {
        name: "25W Fast Charger",
        unitPrice: 12_000,
        available: 25,
        reserved: 0,
        lowStockThreshold: 5
      }
    ],
    customers: [
      {
        name: "Ada Okoro",
        phone: "0803 111 2233"
      },
      {
        name: "Tunde Bello",
        phone: "0812 444 5566"
      },
      {
        name: "Amina Yusuf",
        phone: "0901 777 8899"
      }
    ],
    primaryOrder: {
      productIdx: 1,
      qty: 1,
      paid: 70_000,
      customerIdx: 1,
      note: "Balance tomorrow — from WhatsApp"
    },
    secondaryOrder: {
      productIdx: 0,
      qty: 2,
      paid: 200_000,
      customerIdx: 0,
      note: "Partial payment — from WhatsApp"
    },
    conversations: {
      label1: "WhatsApp · Ada Okoro",
      lines1: ["Customer: Abeg I need 2 Samsung A15 128GB. How much?", "Seller: ₦185,000 each. 2 is ₦370,000.", "Customer: I go transfer 200k now, balance later.", "Seller: Okay, I reserve am for you."],
      label2: "WhatsApp · Tunde Bello",
      lines2: ["Customer: Bro you get A05 64GB?", "Seller: Yes, ₦115,000.", "Customer: I send 70k, balance tomorrow.", "Seller: Reserved. No wahala."]
    },
    policies: [
      {
        title: "Preferred suppliers",
        content: "Phone accessories usually restocked from Computer Village on Wednesdays."
      },
      {
        title: "Customer credit rule",
        content: "Regulars may take goods on balance if prior payment history is clean."
      }
    ]
  },
  "Provision Store": {
    products: [
      {
        name: "Golden Morn 1kg",
        unitPrice: 3200,
        available: 50,
        reserved: 0,
        lowStockThreshold: 10
      },
      {
        name: "Semovita 1kg",
        unitPrice: 1500,
        available: 80,
        reserved: 2,
        lowStockThreshold: 15
      },
      {
        name: "Peak Milk 400g",
        unitPrice: 4800,
        available: 35,
        reserved: 0,
        lowStockThreshold: 8
      },
      {
        name: "Vegetable Oil 1L",
        unitPrice: 2200,
        available: 60,
        reserved: 0,
        lowStockThreshold: 12
      }
    ],
    customers: [
      {
        name: "Mama Emeka",
        phone: "0803 122 3344"
      },
      {
        name: "Chukwudi Obi",
        phone: "0812 233 4455"
      },
      {
        name: "Adamu Ibrahim",
        phone: "0701 344 5566"
      }
    ],
    primaryOrder: {
      productIdx: 2,
      qty: 1,
      paid: 0,
      customerIdx: 1,
      note: "Credit order — from WhatsApp"
    },
    secondaryOrder: {
      productIdx: 1,
      qty: 4,
      paid: 3000,
      customerIdx: 0,
      note: "Partial payment — from WhatsApp"
    },
    conversations: {
      label1: "WhatsApp · Chukwudi Obi",
      lines1: ["Customer: Peak Milk 400g, add to my credit", "Seller: Done. ₦4,800 added — please clear soon."],
      label2: "WhatsApp · Mama Emeka",
      lines2: ["Customer: 4 Semovita 1kg", "Seller: ₦6,000. She paid ₦3,000 — balance ₦3,000."]
    },
    policies: [
      {
        title: "Wholesale dealer",
        content: "Dry goods restocked from Dawanau market depot every Monday."
      },
      {
        title: "Credit rule",
        content: "Only regular customers with at least 3 clean transactions get credit."
      }
    ]
  },
  "Pharmacy": {
    products: [
      {
        name: "Paracetamol 500mg ×12",
        unitPrice: 350,
        available: 200,
        reserved: 0,
        lowStockThreshold: 30
      },
      {
        name: "Amoxicillin 250mg ×21",
        unitPrice: 1800,
        available: 80,
        reserved: 4,
        lowStockThreshold: 15
      },
      {
        name: "Cetirizine 10mg ×10",
        unitPrice: 650,
        available: 100,
        reserved: 0,
        lowStockThreshold: 20
      },
      {
        name: "Vitamin C 1000mg ×30",
        unitPrice: 2500,
        available: 60,
        reserved: 0,
        lowStockThreshold: 10
      }
    ],
    customers: [
      {
        name: "Dr. Amaka Nwoke",
        phone: "0803 500 1122"
      },
      {
        name: "Kunle Adeyemi",
        phone: "0812 600 2233"
      },
      {
        name: "Zainab Usman",
        phone: "0901 700 3344"
      }
    ],
    primaryOrder: {
      productIdx: 1,
      qty: 2,
      paid: 0,
      customerIdx: 1,
      note: "Clinic credit — from WhatsApp"
    },
    secondaryOrder: {
      productIdx: 3,
      qty: 2,
      paid: 2000,
      customerIdx: 0,
      note: "Partial payment — from WhatsApp"
    },
    conversations: {
      label1: "WhatsApp · Kunle Adeyemi",
      lines1: ["Customer: Give me Amoxicillin ×2 packs on credit", "Seller: ₦3,600 added to clinic account."],
      label2: "WhatsApp · Dr. Amaka Nwoke",
      lines2: ["Customer: 2 Vitamin C 1000mg packs", "Seller: ₦5,000. She paid ₦2,000 — balance ₦3,000."]
    },
    policies: [
      {
        title: "Drug distributor",
        content: "NAFDAC-approved drugs ordered from Emzor Pharma rep every Wednesday."
      },
      {
        title: "Credit policy",
        content: "Credit only for verified hospitals or clinics with a purchase order."
      }
    ]
  },
  "Services": {
    products: [
      {
        name: "Phone Screen Repair",
        unitPrice: 15_000,
        available: 99,
        reserved: 0,
        lowStockThreshold: 5
      },
      {
        name: "Laptop RAM Upgrade",
        unitPrice: 25_000,
        available: 99,
        reserved: 2,
        lowStockThreshold: 3
      },
      {
        name: "Data Recovery",
        unitPrice: 20_000,
        available: 99,
        reserved: 0,
        lowStockThreshold: 3
      },
      {
        name: "Software Install",
        unitPrice: 5000,
        available: 99,
        reserved: 0,
        lowStockThreshold: 5
      }
    ],
    customers: [
      {
        name: "Yemi Olatunde",
        phone: "0803 111 9900"
      },
      {
        name: "Obiora Nze",
        phone: "0812 222 8811"
      },
      {
        name: "Rukayat Bello",
        phone: "0901 333 7722"
      }
    ],
    primaryOrder: {
      productIdx: 1,
      qty: 1,
      paid: 0,
      customerIdx: 1,
      note: "RAM upgrade balance — from WhatsApp"
    },
    secondaryOrder: {
      productIdx: 0,
      qty: 1,
      paid: 8000,
      customerIdx: 0,
      note: "Partial screen repair — from WhatsApp"
    },
    conversations: {
      label1: "WhatsApp · Obiora Nze",
      lines1: ["Customer: How much for laptop RAM upgrade?", "Seller: ₦25,000. I can do it today — pay on pickup."],
      label2: "WhatsApp · Yemi Olatunde",
      lines2: ["Customer: My phone screen broke fix am", "Seller: ₦15,000. She paid ₦8,000 — balance ₦7,000."]
    },
    policies: [
      {
        title: "Parts supplier",
        content: "Phone screens and laptop parts ordered from Ikeja Computer Village on Fridays."
      },
      {
        title: "Payment policy",
        content: "Collect full payment for repairs above ₦20,000 before work begins."
      }
    ]
  },
  "Wholesale": {
    products: [
      {
        name: "Rice 50kg bag",
        unitPrice: 85_000,
        available: 40,
        reserved: 0,
        lowStockThreshold: 5
      },
      {
        name: "Garri (Yellow) 25kg",
        unitPrice: 18_000,
        available: 60,
        reserved: 3,
        lowStockThreshold: 8
      },
      {
        name: "Groundnut Oil 20L",
        unitPrice: 32_000,
        available: 25,
        reserved: 0,
        lowStockThreshold: 4
      },
      {
        name: "Sugar 50kg",
        unitPrice: 62_000,
        available: 20,
        reserved: 0,
        lowStockThreshold: 4
      }
    ],
    customers: [
      {
        name: "Iya Oge Market",
        phone: "0803 700 0011"
      },
      {
        name: "Alhaji Dantata",
        phone: "0812 800 1122"
      },
      {
        name: "Chibuike Traders",
        phone: "0701 900 2233"
      }
    ],
    primaryOrder: {
      productIdx: 0,
      qty: 1,
      paid: 0,
      customerIdx: 1,
      note: "Wholesale credit — from WhatsApp"
    },
    secondaryOrder: {
      productIdx: 1,
      qty: 3,
      paid: 25_000,
      customerIdx: 0,
      note: "Partial payment — from WhatsApp"
    },
    conversations: {
      label1: "WhatsApp · Alhaji Dantata",
      lines1: ["Customer: I need 1 bag of rice, pay later", "Seller: ₦85,000. Reserve done — clear by month end."],
      label2: "WhatsApp · Iya Oge Market",
      lines2: ["Customer: 3 bags Garri Yellow", "Seller: ₦54,000. She paid ₦25,000 — balance ₦29,000."]
    },
    policies: [
      {
        title: "Main supplier",
        content: "Grains and cooking oil purchased directly from Dangote distributors on the 1st of each month."
      },
      {
        title: "Bulk credit rule",
        content: "Credit only for market traders with a track record of 3+ clear invoices."
      }
    ]
  },
  "Other": {
    products: [
      {
        name: "Item A",
        unitPrice: 5000,
        available: 50,
        reserved: 0,
        lowStockThreshold: 8
      },
      {
        name: "Item B",
        unitPrice: 8000,
        available: 30,
        reserved: 1,
        lowStockThreshold: 5
      },
      {
        name: "Item C",
        unitPrice: 12_000,
        available: 20,
        reserved: 0,
        lowStockThreshold: 4
      },
      {
        name: "Item D",
        unitPrice: 3000,
        available: 80,
        reserved: 0,
        lowStockThreshold: 10
      }
    ],
    customers: [
      {
        name: "Temi Adebayo",
        phone: "0803 900 1234"
      },
      {
        name: "Segun Ogunnaike",
        phone: "0812 800 2345"
      },
      {
        name: "Amina Lawal",
        phone: "0901 700 3456"
      }
    ],
    primaryOrder: {
      productIdx: 1,
      qty: 1,
      paid: 0,
      customerIdx: 1,
      note: "Balance owed — from WhatsApp"
    },
    secondaryOrder: {
      productIdx: 0,
      qty: 2,
      paid: 5000,
      customerIdx: 0,
      note: "Partial payment — from WhatsApp"
    },
    conversations: {
      label1: "WhatsApp · Segun Ogunnaike",
      lines1: ["Customer: I want Item B, pay later", "Seller: ₦8,000. Noted — balance on collection."],
      label2: "WhatsApp · Temi Adebayo",
      lines2: ["Customer: 2 pcs of Item A", "Seller: ₦10,000. She paid ₦5,000 — balance ₦5,000."]
    },
    policies: [
      {
        title: "Preferred supplier",
        content: "Main supplier contacted at the start of each month for restocking."
      },
      {
        title: "Credit rule",
        content: "Only regular customers are given balance — new customers pay upfront."
      }
    ]
  },
};

export function getCategorySeedCatalog(category?: string): CategorySeedCatalogEntry {
  return CATEGORY_SEED_CATALOG[category ?? ''] ?? CATEGORY_SEED_CATALOG[CATEGORY_SEED_FALLBACK]!;
}
