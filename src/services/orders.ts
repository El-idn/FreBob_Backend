import type { Order, PaymentMethod, Product, InventoryEvent } from '../types.js';
import {
  cancelOrderInStore,
  getOrder,
  listProducts,
  updateOrderPayment,
} from '../repo/index.js';

export async function recordPayment(input: {
  businessId: string;
  orderId: string;
  amount: number;
  method?: PaymentMethod;
}) {
  const order = await getOrder(input.businessId, input.orderId);
  if (!order) return { ok: false as const, status: 404, reason: 'Order not found' };
  if (order.orderStatus === 'cancelled') {
    return { ok: false as const, status: 409, reason: 'Order is cancelled' };
  }
  if (input.amount <= 0) {
    return { ok: false as const, status: 400, reason: 'Enter a payment amount' };
  }

  const pay = Math.min(input.amount, order.balance || order.total - order.amountPaid);
  const amountPaid = order.amountPaid + pay;
  const balance = Math.max(0, order.total - amountPaid);
  const paymentStatus: Order['paymentStatus'] =
    balance <= 0 ? 'paid' : amountPaid > 0 ? 'partially_paid' : 'unpaid';
  const now = new Date().toISOString();
  const updated: Order = { ...order, amountPaid, balance, paymentStatus };
  const payment = {
    id: crypto.randomUUID(),
    businessId: input.businessId,
    orderId: order.id,
    amount: pay,
    method: input.method ?? 'cash',
    createdAt: now,
  };

  await updateOrderPayment({
    businessId: input.businessId,
    order: updated,
    payment,
    customerId: order.customerId,
    balanceDelta: -pay,
    memory: {
      id: crypto.randomUUID(),
      businessId: input.businessId,
      kind: 'payment',
      content: `Recorded ₦${pay.toLocaleString('en-NG')} (${payment.method}) on order ${order.id}.`,
      trustLevel: 'confirmed',
      orderId: order.id,
      createdAt: now,
    },
  });

  return { ok: true as const, order: updated, payment };
}

export async function cancelOrder(input: { businessId: string; orderId: string }) {
  const order = await getOrder(input.businessId, input.orderId);
  if (!order) return { ok: false as const, status: 404, reason: 'Order not found' };
  if (order.orderStatus === 'cancelled') {
    return { ok: false as const, status: 409, reason: 'Already cancelled' };
  }

  const now = new Date().toISOString();
  const previousStatus = order.orderStatus;
  const products = await listProducts(input.businessId);
  const productUpdates: Product[] = [];
  const inventoryEvents: InventoryEvent[] = [];

  if (previousStatus === 'reserved' || previousStatus === 'confirmed' || previousStatus === 'fulfilled') {
    for (const item of order.items) {
      const product = products.find(
        (p) =>
          (item.productId && p.id === item.productId) ||
          (p.name.toLowerCase() === item.productName.toLowerCase() &&
            (!item.variant || p.variant === item.variant)),
      );
      if (!product) continue;

      const next = { ...product };
      if (previousStatus === 'reserved') {
        next.available += item.quantity;
        next.reserved = Math.max(0, next.reserved - item.quantity);
        inventoryEvents.push({
          id: crypto.randomUUID(),
          businessId: input.businessId,
          productId: product.id,
          productName: product.name,
          eventType: 'release',
          quantity: item.quantity,
          orderId: order.id,
          createdAt: now,
        });
      } else {
        next.available += item.quantity;
        inventoryEvents.push({
          id: crypto.randomUUID(),
          businessId: input.businessId,
          productId: product.id,
          productName: product.name,
          eventType: 'restock',
          quantity: item.quantity,
          orderId: order.id,
          createdAt: now,
        });
      }
      productUpdates.push(next);
      // keep local list in sync for multi-item same product
      const idx = products.findIndex((p) => p.id === product.id);
      if (idx >= 0) products[idx] = next;
    }
  }

  const updated = { ...order, orderStatus: 'cancelled' as const };
  await cancelOrderInStore({
    order: updated,
    customerId: order.customerId,
    releasedBalance: order.balance,
    productUpdates,
    inventoryEvents,
    memory: {
      id: crypto.randomUUID(),
      businessId: input.businessId,
      kind: 'cancellation',
      content: `Order cancelled (${previousStatus}). Balance ₦${order.balance.toLocaleString('en-NG')} released; stock adjusted.`,
      trustLevel: 'confirmed',
      orderId: order.id,
      createdAt: now,
    },
  });
  return { ok: true as const, order: updated };
}
