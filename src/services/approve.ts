import type { ApproveRequest, ExtractedFields } from '../schemas.js';
import { recomputeMoney } from './extraction.js';
import type { InventoryEvent, MemoryNote, Order, OrderItem, Payment, Product } from '../types.js';
import {
  findOrCreateCustomer,
  findProductMatch,
  getExtraction,
  persistApprovedOrder,
  updateExtractionStatus,
} from '../repo/index.js';

export type ApproveResult =
  | { ok: true; orderId: string; order: Order }
  | { ok: false; status: number; reason: string };

export async function approveExtraction(input: ApproveRequest): Promise<ApproveResult> {
  const fields = recomputeMoney(input.fields);
  const existing = await getExtraction(input.businessId, input.extractionId);
  if (!existing) {
    return { ok: false, status: 404, reason: 'Extraction not found' };
  }
  if (existing.status === 'confirmed') {
    return { ok: false, status: 409, reason: 'Extraction already approved' };
  }
  if (existing.status === 'rejected') {
    return { ok: false, status: 409, reason: 'Extraction was rejected' };
  }

  const product = await findProductMatch(
    input.businessId,
    fields.productName,
    fields.variant,
  );
  if (product && product.available < fields.quantity) {
    return { ok: false, status: 409, reason: 'Not enough available stock' };
  }

  const customer = await findOrCreateCustomer(input.businessId, fields.customerName);
  const now = new Date().toISOString();
  const orderId = crypto.randomUUID();
  const itemId = crypto.randomUUID();

  const items: OrderItem[] = [
    {
      id: itemId,
      orderId,
      productId: product?.id,
      productName: fields.productName,
      variant: fields.variant,
      quantity: fields.quantity,
      unitPrice: fields.unitPrice,
      lineTotal: fields.total,
    },
  ];

  const order: Order = {
    id: orderId,
    businessId: input.businessId,
    customerId: customer.id,
    customerName: customer.name,
    items,
    total: fields.total,
    amountPaid: fields.amountPaid,
    balance: fields.balance,
    paymentStatus: fields.paymentStatus,
    orderStatus: fields.orderStatus,
    source: existing.source,
    createdAt: now,
  };

  let productUpdate: Product | undefined;
  let inventoryEvent: InventoryEvent | undefined;
  if (product) {
    productUpdate = { ...product };
    if (fields.orderStatus === 'reserved') {
      productUpdate.available -= fields.quantity;
      productUpdate.reserved += fields.quantity;
      inventoryEvent = makeInv(input.businessId, product, 'reserve', fields, orderId, now);
    } else if (fields.orderStatus === 'confirmed' || fields.orderStatus === 'fulfilled') {
      productUpdate.available -= fields.quantity;
      inventoryEvent = makeInv(input.businessId, product, 'sale', fields, orderId, now);
    }
  }

  let payment: Payment | undefined;
  if (fields.amountPaid > 0) {
    payment = {
      id: crypto.randomUUID(),
      businessId: input.businessId,
      orderId,
      amount: fields.amountPaid,
      method: fields.paymentMethod,
      createdAt: now,
    };
  }

  const memory: MemoryNote = {
    id: crypto.randomUUID(),
    businessId: input.businessId,
    kind: 'approved_order',
    title: `${fields.productName} · ${customer.name}`,
    content: `Approved ${fields.orderStatus}: ${fields.quantity}× ${fields.productName}, total ₦${fields.total.toLocaleString('en-NG')}, paid ₦${fields.amountPaid.toLocaleString('en-NG')}, balance ₦${fields.balance.toLocaleString('en-NG')}.`,
    trustLevel: 'confirmed',
    orderId,
    createdAt: now,
  };

  await persistApprovedOrder({
    order,
    payment,
    inventoryEvent,
    memory,
    audit: {
      id: crypto.randomUUID(),
      businessId: input.businessId,
      action: 'extraction.approved',
      meta: { extractionId: input.extractionId, orderId },
      createdAt: now,
    },
    productUpdate,
    customerBalanceDelta: fields.balance,
    customerId: customer.id,
  });

  await updateExtractionStatus(input.extractionId, 'confirmed', fields);

  return { ok: true, orderId, order };
}

function makeInv(
  businessId: string,
  product: Product,
  eventType: InventoryEvent['eventType'],
  fields: ExtractedFields,
  orderId: string,
  now: string,
): InventoryEvent {
  return {
    id: crypto.randomUUID(),
    businessId,
    productId: product.id,
    productName: product.name,
    eventType,
    quantity: fields.quantity,
    orderId,
    createdAt: now,
  };
}
