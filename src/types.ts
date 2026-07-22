import type { ExtractedFields } from './schemas.js';

export type PaymentMethod = ExtractedFields['paymentMethod'];
export type PaymentStatus = ExtractedFields['paymentStatus'];
export type OrderStatus = ExtractedFields['orderStatus'];
export type CaptureSource = 'whatsapp' | 'sms' | 'scanner' | 'manual';

export type Business = {
  id: string;
  name: string;
  category: string;
  location: string;
  currency: string;
  preferredLanguage: string;
  phone?: string;
  ownerUserId?: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  preferredLanguage: string;
};

export type Product = {
  id: string;
  businessId: string;
  name: string;
  variant?: string;
  unitPrice: number;
  available: number;
  reserved: number;
  lowStockThreshold: number;
};

export type Customer = {
  id: string;
  businessId: string;
  name: string;
  phone?: string;
  balanceOwed: number;
};

export type OrderItem = {
  id: string;
  orderId: string;
  productId?: string;
  productName: string;
  variant?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type Order = {
  id: string;
  businessId: string;
  customerId: string;
  customerName: string;
  items: OrderItem[];
  total: number;
  amountPaid: number;
  balance: number;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  source: CaptureSource;
  notes?: string;
  createdAt: string;
};

export type Payment = {
  id: string;
  businessId: string;
  orderId: string;
  amount: number;
  method: PaymentMethod;
  createdAt: string;
};

export type InventoryEvent = {
  id: string;
  businessId: string;
  productId?: string;
  productName: string;
  eventType: 'reserve' | 'release' | 'sale' | 'restock';
  quantity: number;
  orderId?: string;
  createdAt: string;
};

export type ExtractionRecord = {
  id: string;
  businessId: string;
  source: CaptureSource;
  sourceText: string;
  fields: ExtractedFields;
  status: 'unconfirmed' | 'confirmed' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
};

export type MemoryNote = {
  id: string;
  businessId: string;
  kind: string;
  content: string;
  trustLevel: 'confirmed' | 'unconfirmed' | 'reference' | 'rejected';
  orderId?: string;
  title?: string;
  createdAt: string;
};

export type AuditLog = {
  id: string;
  businessId: string;
  action: string;
  meta?: Record<string, unknown>;
  createdAt: string;
};

export type BusinessMember = {
  businessId: string;
  userId: string;
  role: string;
};
