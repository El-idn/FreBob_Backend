import { createSeedSnapshotForCategory } from '../data/seed.js';
import type {
  AuditLog,
  Business,
  ConversationRecord,
  Customer,
  ExtractionRecord,
  InventoryEvent,
  MemoryNote,
  Order,
  Payment,
  Product,
  User,
} from '../types.js';

export type DbSnapshot = {
  users: User[];
  businesses: Business[];
  products: Product[];
  customers: Customer[];
  orders: Order[];
  payments: Payment[];
  inventoryEvents: InventoryEvent[];
  extractions: ExtractionRecord[];
  conversations: ConversationRecord[];
  memories: MemoryNote[];
  auditLogs: AuditLog[];
  memberships: { businessId: string; userId: string; role: string }[];
};

function cloneSeed(category?: string): DbSnapshot {
  const s = createSeedSnapshotForCategory(category);
  return {
    users: [{ ...s.user }],
    businesses: [{ ...s.business }],
    products: s.products.map((p) => ({ ...p })),
    customers: s.customers.map((c) => ({ ...c })),
    orders: s.orders.map((o) => ({
      ...o,
      items: o.items.map((i) => ({ ...i })),
    })),
    payments: s.payments.map((p) => ({ ...p })),
    inventoryEvents: s.inventoryEvents.map((e) => ({ ...e })),
    extractions: [],
    conversations: [],
    memories: s.memories.map((m) => ({ ...m })),
    auditLogs: [],
    memberships: [{ ...s.member }],
  };
}

let db: DbSnapshot = cloneSeed('Electronics');

export function resetMemoryDb(): DbSnapshot {
  db = cloneSeed('Electronics');
  return db;
}

export function resetMemoryDbForCategory(category?: string): DbSnapshot {
  db = cloneSeed(category);
  return db;
}

export function getMemoryDb(): DbSnapshot {
  return db;
}

export function isDemoBusiness(businessId: string): boolean {
  return businessId === createSeedSnapshotForCategory('Electronics').business.id;
}
