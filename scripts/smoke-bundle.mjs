#!/usr/bin/env node
/**
 * Bundle-sync smoke: extract → approve → GET /bundle → payment → restock → GET /bundle
 */
const base = (process.argv[2] || 'http://localhost:4000/v1').replace(/\/$/, '');
const businessId = '00000000-0000-4000-8000-000000000001';
const headers = {
  'Content-Type': 'application/json',
  'X-Demo-Mode': '1',
};

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function req(method, path, body) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 500)}`);
  }
  return json;
}

function summarize(bundle) {
  return {
    products: bundle.products?.length ?? 0,
    customers: bundle.customers?.length ?? 0,
    orders: bundle.orders?.length ?? 0,
    memories: bundle.memories?.length ?? 0,
    conversations: bundle.conversations?.length ?? 0,
    payments: bundle.payments?.length ?? 0,
    inventoryEvents: bundle.inventoryEvents?.length ?? 0,
  };
}

async function main() {
  console.log('Bundle smoke against', base);
  const health = await req('GET', '/health');
  console.log('health', { store: health.store, ok: health.ok });

  await req('POST', '/demo/reset', {});

  const extracted = await req('POST', '/extract', {
    businessId,
    source: 'whatsapp',
    sampleId: 'sample_flagship',
  });
  console.log('extract', extracted.extractionId, extracted.fields?.productName);

  const approved = await req('POST', `/extractions/${extracted.extractionId}/approve`, {
    businessId,
    extractionId: extracted.extractionId,
    fields: extracted.fields,
  });
  console.log('approve', approved.orderId, 'order keys', Object.keys(approved.order ?? {}));

  const afterApprove = await req('GET', `/businesses/${businessId}/bundle`);
  for (const key of [
    'products',
    'customers',
    'orders',
    'memories',
    'conversations',
    'payments',
    'inventoryEvents',
  ]) {
    assert(Array.isArray(afterApprove[key]), `bundle missing array: ${key}`);
  }
  console.log('bundle after approve', summarize(afterApprove));

  const order = afterApprove.orders.find((o) => o.id === approved.orderId) ?? afterApprove.orders[0];
  assert(order, 'no order in bundle after approve');
  assert(order.total > 0, 'order total should be > 0');

  const event = afterApprove.inventoryEvents[0];
  assert(event, 'expected at least one inventory event after approve');
  assert(event.eventType, `inventory event missing eventType: ${JSON.stringify(event)}`);
  console.log('sample inventoryEvent', {
    eventType: event.eventType,
    productName: event.productName,
    quantity: event.quantity,
  });

  const payAmount = Math.max(1, Math.round((order.balance ?? order.total) / 2));
  const paid = await req('POST', `/businesses/${businessId}/orders/${order.id}/payments`, {
    amount: payAmount,
    method: 'cash',
  });
  console.log('payment', paid.payment?.id ?? paid.id, 'amount', payAmount);

  const product = afterApprove.products.find((p) => Number(p.available) >= 0) ?? afterApprove.products[0];
  assert(product, 'no product in bundle');
  const restocked = await req('PATCH', `/businesses/${businessId}/products/${product.id}`, {
    available: Number(product.available) + 5,
  });
  console.log('restock', product.name, 'available', restocked.available ?? restocked.product?.available);

  const afterWrites = await req('GET', `/businesses/${businessId}/bundle`);
  console.log('bundle after writes', summarize(afterWrites));

  const matchingPay = afterWrites.payments.find(
    (p) => p.orderId === order.id && Number(p.amount) === payAmount,
  );
  assert(matchingPay, `payment not in bundle.payments (n=${afterWrites.payments.length})`);
  assert(matchingPay.method === 'cash', `payment method ${matchingPay.method}`);

  const restockEvent = afterWrites.inventoryEvents.find(
    (e) => e.productId === product.id && e.eventType === 'restock',
  );
  assert(restockEvent, 'restock inventory event missing from bundle');

  const syncedOrder = afterWrites.orders.find((o) => o.id === order.id);
  assert(syncedOrder, 'paid order missing from bundle');
  assert(Number(syncedOrder.amountPaid) >= payAmount, 'order amountPaid not updated in bundle');

  console.log('BUNDLE SMOKE OK');
}

main().catch((err) => {
  console.error('BUNDLE SMOKE FAILED', err);
  process.exit(1);
});
