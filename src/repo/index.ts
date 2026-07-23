import { getSupabase } from '../supabase.js';
import type {
  AuditLog,
  Business,
  ConversationRecord,
  Customer,
  ExtractionRecord,
  InventoryEvent,
  MemoryNote,
  Order,
  OrderItem,
  Payment,
  Product,
} from '../types.js';
import { getMemoryDb, isDemoBusiness, resetMemoryDb } from './memoryDb.js';
import { DEMO_BUSINESS_ID } from '../data/seed.js';

export type StoreMode = 'memory' | 'supabase';

export function storeMode(): StoreMode {
  return getSupabase() ? 'supabase' : 'memory';
}

export function resetDemoStore(): void {
  resetMemoryDb();
}

export async function getBusiness(businessId: string): Promise<Business | null> {
  if (storeMode() === 'memory') {
    return getMemoryDb().businesses.find((b) => b.id === businessId) ?? null;
  }
  const supabase = getSupabase()!;
  const { data } = await supabase.from('businesses').select('*').eq('id', businessId).maybeSingle();
  if (!data) return null;
  return mapBusiness(data);
}

export async function updateBusiness(
  businessId: string,
  patch: {
    name?: string;
    category?: string;
    location?: string;
    phone?: string | null;
    currency?: string;
    preferredLanguage?: string;
  },
): Promise<Business | null> {
  if (storeMode() === 'memory') {
    const row = getMemoryDb().businesses.find((b) => b.id === businessId);
    if (!row) return null;
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.category !== undefined) row.category = patch.category;
    if (patch.location !== undefined) row.location = patch.location;
    if (patch.phone !== undefined) row.phone = patch.phone ?? undefined;
    if (patch.currency !== undefined) row.currency = patch.currency;
    if (patch.preferredLanguage !== undefined) {
      row.preferredLanguage = patch.preferredLanguage;
    }
    return { ...row };
  }

  const payload: Record<string, unknown> = {};
  if (patch.name !== undefined) payload.name = patch.name;
  if (patch.category !== undefined) payload.category = patch.category;
  if (patch.location !== undefined) payload.location = patch.location;
  if (patch.phone !== undefined) payload.phone = patch.phone;
  if (patch.currency !== undefined) payload.currency = patch.currency;
  if (patch.preferredLanguage !== undefined) {
    payload.preferred_language = patch.preferredLanguage;
  }
  if (!Object.keys(payload).length) {
    return getBusiness(businessId);
  }

  const { data, error } = await getSupabase()!
    .from('businesses')
    .update(payload)
    .eq('id', businessId)
    .select('*')
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapBusiness(data) : null;
}

export async function listProducts(businessId: string): Promise<Product[]> {
  if (storeMode() === 'memory') {
    return getMemoryDb().products.filter((p) => p.businessId === businessId);
  }
  const { data } = await getSupabase()!
    .from('products')
    .select('*')
    .eq('business_id', businessId)
    .order('name');
  return (data ?? []).map(mapProduct);
}

export async function addProduct(
  input: Omit<Product, 'id'> & { id?: string },
): Promise<Product> {
  const product: Product = {
    id: input.id ?? crypto.randomUUID(),
    businessId: input.businessId,
    name: input.name,
    variant: input.variant,
    unitPrice: input.unitPrice,
    available: input.available,
    reserved: input.reserved ?? 0,
    lowStockThreshold: input.lowStockThreshold ?? 5,
  };
  if (storeMode() === 'memory') {
    getMemoryDb().products.unshift(product);
    return product;
  }
  const { error } = await getSupabase()!.from('products').insert({
    id: product.id,
    business_id: product.businessId,
    name: product.name,
    variant: product.variant ?? null,
    unit_price: product.unitPrice,
    available: product.available,
    reserved: product.reserved,
    low_stock_threshold: product.lowStockThreshold,
  });
  if (error) throw new Error(error.message);
  return product;
}

export async function listCustomers(businessId: string): Promise<Customer[]> {
  if (storeMode() === 'memory') {
    return getMemoryDb().customers.filter((c) => c.businessId === businessId);
  }
  const { data } = await getSupabase()!
    .from('customers')
    .select('*')
    .eq('business_id', businessId)
    .order('name');
  return (data ?? []).map(mapCustomer);
}

export async function listOrders(businessId: string): Promise<Order[]> {
  if (storeMode() === 'memory') {
    return getMemoryDb()
      .orders.filter((o) => o.businessId === businessId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  const { data, error } = await getSupabase()!
    .from('orders')
    .select('*, order_items(*)')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapOrderRow);
}

export async function getOrder(businessId: string, orderId: string): Promise<Order | null> {
  const orders = await listOrders(businessId);
  return orders.find((o) => o.id === orderId) ?? null;
}

export async function listMemories(businessId: string): Promise<MemoryNote[]> {
  if (storeMode() === 'memory') {
    return getMemoryDb()
      .memories.filter((m) => m.businessId === businessId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  const { data } = await getSupabase()!
    .from('business_memories')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });
  return (data ?? []).map(mapMemory);
}

export async function saveConversation(record: ConversationRecord): Promise<void> {
  if (storeMode() === 'memory') {
    getMemoryDb().conversations.unshift(record);
    return;
  }
  const { error } = await getSupabase()!.from('conversations').insert({
    id: record.id,
    business_id: record.businessId,
    source_label: record.sourceLabel,
    source_text: record.sourceText,
    created_at: record.createdAt,
  });
  if (error) throw new Error(error.message);
}

export async function listConversations(
  businessId: string,
  limit = 8,
): Promise<ConversationRecord[]> {
  if (storeMode() === 'memory') {
    return getMemoryDb()
      .conversations.filter((c) => c.businessId === businessId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }
  const { data, error } = await getSupabase()!
    .from('conversations')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id as string,
    businessId: row.business_id as string,
    sourceLabel: (row.source_label as string) || 'Approved conversation',
    sourceText: row.source_text as string,
    createdAt: row.created_at as string,
  }));
}

export async function saveExtraction(record: ExtractionRecord): Promise<void> {
  if (storeMode() === 'memory') {
    getMemoryDb().extractions.unshift(record);
    return;
  }
  const { error } = await getSupabase()!.from('ai_extractions').insert({
    id: record.id,
    business_id: record.businessId,
    source: record.source,
    raw_json: record.fields,
    status: record.status,
  });
  if (error) throw new Error(error.message);
}

export async function getExtraction(
  businessId: string,
  extractionId: string,
): Promise<ExtractionRecord | null> {
  if (storeMode() === 'memory') {
    return (
      getMemoryDb().extractions.find(
        (e) => e.id === extractionId && e.businessId === businessId,
      ) ?? null
    );
  }
  const { data } = await getSupabase()!
    .from('ai_extractions')
    .select('*')
    .eq('id', extractionId)
    .eq('business_id', businessId)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    businessId: data.business_id,
    source: data.source,
    sourceText: '',
    fields: (data.corrected_json ?? data.raw_json) as ExtractionRecord['fields'],
    status: data.status,
    createdAt: data.created_at,
    reviewedAt: data.reviewed_at ?? undefined,
  };
}

export async function updateExtractionStatus(
  extractionId: string,
  status: ExtractionRecord['status'],
  correctedFields?: ExtractionRecord['fields'],
  businessId?: string,
): Promise<boolean> {
  if (storeMode() === 'memory') {
    const row = getMemoryDb().extractions.find(
      (e) =>
        e.id === extractionId &&
        (!businessId || e.businessId === businessId),
    );
    if (!row) return false;
    row.status = status;
    row.reviewedAt = new Date().toISOString();
    if (correctedFields) row.fields = correctedFields;
    return true;
  }
  let query = getSupabase()!
    .from('ai_extractions')
    .update({
      status,
      corrected_json: correctedFields ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', extractionId);
  if (businessId) query = query.eq('business_id', businessId);
  const { data, error } = await query.select('id');
  if (error) throw new Error(error.message);
  return Boolean(data?.length);
}

export async function findProductMatch(
  businessId: string,
  productName: string,
  variant?: string,
): Promise<Product | null> {
  const products = await listProducts(businessId);
  const lower = productName.toLowerCase();
  return (
    products.find((p) => {
      const nameMatch =
        p.name.toLowerCase() === lower ||
        lower.includes(p.name.toLowerCase()) ||
        p.name.toLowerCase().includes(lower);
      const variantMatch = !variant || !p.variant || p.variant === variant;
      return nameMatch && variantMatch;
    }) ?? null
  );
}

export async function findOrCreateCustomer(
  businessId: string,
  name: string,
  phone?: string,
): Promise<Customer> {
  const customers = await listCustomers(businessId);
  const existing = customers.find((c) => c.name.toLowerCase() === name.toLowerCase());
  if (existing) return existing;

  const customer: Customer = {
    id: crypto.randomUUID(),
    businessId,
    name: name || 'Walk-in customer',
    phone,
    balanceOwed: 0,
  };

  if (storeMode() === 'memory') {
    getMemoryDb().customers.push(customer);
    return customer;
  }
  const { error } = await getSupabase()!.from('customers').insert({
    id: customer.id,
    business_id: businessId,
    name: customer.name,
    phone: phone ?? null,
    balance_owed: 0,
  });
  if (error) throw new Error(error.message);
  return customer;
}

export async function persistApprovedOrder(input: {
  order: Order;
  payment?: Payment;
  inventoryEvent?: InventoryEvent;
  memory: MemoryNote;
  audit: AuditLog;
  productUpdate?: Product;
  customerBalanceDelta: number;
  customerId: string;
}): Promise<void> {
  const {
    order,
    payment,
    inventoryEvent,
    memory,
    audit,
    productUpdate,
    customerBalanceDelta,
    customerId,
  } = input;

  if (storeMode() === 'memory') {
    const db = getMemoryDb();
    db.orders.unshift(order);
    if (payment) db.payments.unshift(payment);
    if (inventoryEvent) db.inventoryEvents.unshift(inventoryEvent);
    db.memories.unshift(memory);
    db.auditLogs.unshift(audit);
    if (productUpdate) {
      db.products = db.products.map((p) => (p.id === productUpdate.id ? productUpdate : p));
    }
    db.customers = db.customers.map((c) =>
      c.id === customerId
        ? { ...c, balanceOwed: c.balanceOwed + customerBalanceDelta }
        : c,
    );
    return;
  }

  const supabase = getSupabase()!;
  const { error: orderErr } = await supabase.from('orders').insert({
    id: order.id,
    business_id: order.businessId,
    customer_id: order.customerId,
    customer_name: order.customerName,
    total: order.total,
    amount_paid: order.amountPaid,
    balance: order.balance,
    payment_status: order.paymentStatus,
    order_status: order.orderStatus,
    source: order.source,
    notes: order.notes ?? null,
    created_at: order.createdAt,
  });
  if (orderErr) throw new Error(orderErr.message);

  const { error: itemsErr } = await supabase.from('order_items').insert(
    order.items.map((i) => ({
      id: i.id,
      order_id: order.id,
      product_id: i.productId ?? null,
      product_name: i.productName,
      variant: i.variant ?? null,
      quantity: i.quantity,
      unit_price: i.unitPrice,
      line_total: i.lineTotal,
    })),
  );
  if (itemsErr) throw new Error(itemsErr.message);

  if (payment) {
    const { error } = await supabase.from('payments').insert({
      id: payment.id,
      business_id: payment.businessId,
      order_id: payment.orderId,
      amount: payment.amount,
      method: payment.method,
      created_at: payment.createdAt,
    });
    if (error) throw new Error(error.message);
  }

  if (inventoryEvent) {
    const { error } = await supabase.from('inventory_events').insert({
      id: inventoryEvent.id,
      business_id: inventoryEvent.businessId,
      product_id: inventoryEvent.productId ?? null,
      product_name: inventoryEvent.productName,
      event_type: inventoryEvent.eventType,
      quantity: inventoryEvent.quantity,
      order_id: inventoryEvent.orderId ?? null,
      created_at: inventoryEvent.createdAt,
    });
    if (error) throw new Error(error.message);
  }

  if (productUpdate) {
    const { error } = await supabase
      .from('products')
      .update({
        available: productUpdate.available,
        reserved: productUpdate.reserved,
      })
      .eq('id', productUpdate.id);
    if (error) throw new Error(error.message);
  }

  const customer = (await listCustomers(order.businessId)).find((c) => c.id === customerId);
  if (customer) {
    const { error } = await supabase
      .from('customers')
      .update({ balance_owed: customer.balanceOwed + customerBalanceDelta })
      .eq('id', customerId);
    if (error) throw new Error(error.message);
  }

  const { error: memErr } = await supabase.from('business_memories').insert({
    id: memory.id,
    business_id: memory.businessId,
    kind: memory.kind,
    content: memory.title ? `${memory.title}: ${memory.content}` : memory.content,
    trust_level: memory.trustLevel,
    order_id: memory.orderId ?? null,
    created_at: memory.createdAt,
  });
  if (memErr) throw new Error(memErr.message);

  const { error: auditErr } = await supabase.from('audit_logs').insert({
    id: audit.id,
    business_id: audit.businessId,
    action: audit.action,
    meta: audit.meta ?? null,
    created_at: audit.createdAt,
  });
  if (auditErr) throw new Error(auditErr.message);
}

export async function updateOrderPayment(input: {
  businessId: string;
  order: Order;
  payment: Payment;
  customerId: string;
  balanceDelta: number;
  memory: MemoryNote;
}): Promise<void> {
  if (storeMode() === 'memory') {
    const db = getMemoryDb();
    db.orders = db.orders.map((o) => (o.id === input.order.id ? input.order : o));
    db.payments.unshift(input.payment);
    db.customers = db.customers.map((c) =>
      c.id === input.customerId
        ? { ...c, balanceOwed: Math.max(0, c.balanceOwed + input.balanceDelta) }
        : c,
    );
    db.memories.unshift(input.memory);
    return;
  }
  const supabase = getSupabase()!;
  await supabase
    .from('orders')
    .update({
      amount_paid: input.order.amountPaid,
      balance: input.order.balance,
      payment_status: input.order.paymentStatus,
    })
    .eq('id', input.order.id);
  await supabase.from('payments').insert({
    id: input.payment.id,
    business_id: input.payment.businessId,
    order_id: input.payment.orderId,
    amount: input.payment.amount,
    method: input.payment.method,
  });
  const customers = await listCustomers(input.businessId);
  const customer = customers.find((c) => c.id === input.customerId);
  if (customer) {
    await supabase
      .from('customers')
      .update({ balance_owed: Math.max(0, customer.balanceOwed + input.balanceDelta) })
      .eq('id', input.customerId);
  }
  await supabase.from('business_memories').insert({
    id: input.memory.id,
    business_id: input.memory.businessId,
    kind: input.memory.kind,
    content: input.memory.content,
    trust_level: input.memory.trustLevel,
    order_id: input.memory.orderId ?? null,
  });
}

export async function cancelOrderInStore(input: {
  order: Order;
  customerId: string;
  releasedBalance: number;
  memory: MemoryNote;
  productUpdates?: Product[];
  inventoryEvents?: InventoryEvent[];
}): Promise<void> {
  if (storeMode() === 'memory') {
    const db = getMemoryDb();
    db.orders = db.orders.map((o) => (o.id === input.order.id ? input.order : o));
    db.customers = db.customers.map((c) =>
      c.id === input.customerId
        ? { ...c, balanceOwed: Math.max(0, c.balanceOwed - input.releasedBalance) }
        : c,
    );
    if (input.productUpdates?.length) {
      for (const p of input.productUpdates) {
        db.products = db.products.map((row) => (row.id === p.id ? p : row));
      }
    }
    if (input.inventoryEvents?.length) {
      db.inventoryEvents.unshift(...input.inventoryEvents);
    }
    db.memories.unshift(input.memory);
    return;
  }
  const supabase = getSupabase()!;
  await supabase
    .from('orders')
    .update({ order_status: 'cancelled' })
    .eq('id', input.order.id);
  const customers = await listCustomers(input.order.businessId);
  const customer = customers.find((c) => c.id === input.customerId);
  if (customer) {
    await supabase
      .from('customers')
      .update({
        balance_owed: Math.max(0, customer.balanceOwed - input.releasedBalance),
      })
      .eq('id', input.customerId);
  }
  if (input.productUpdates?.length) {
    for (const p of input.productUpdates) {
      await supabase
        .from('products')
        .update({ available: p.available, reserved: p.reserved })
        .eq('id', p.id);
    }
  }
  if (input.inventoryEvents?.length) {
    await supabase.from('inventory_events').insert(
      input.inventoryEvents.map((e) => ({
        id: e.id,
        business_id: e.businessId,
        product_id: e.productId ?? null,
        product_name: e.productName,
        event_type: e.eventType,
        quantity: e.quantity,
        order_id: e.orderId ?? null,
        created_at: e.createdAt,
      })),
    );
  }
  await supabase.from('business_memories').insert({
    id: input.memory.id,
    business_id: input.memory.businessId,
    kind: input.memory.kind,
    content: input.memory.content,
    trust_level: input.memory.trustLevel,
    order_id: input.memory.orderId ?? null,
  });
}

export async function userBelongsToBusiness(
  authUserId: string,
  businessId: string,
): Promise<boolean> {
  if (storeMode() === 'memory') {
    return isDemoBusiness(businessId);
  }
  const supabase = getSupabase()!;
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('auth_user_id', authUserId)
    .maybeSingle();
  if (!user) return false;
  const { data: member } = await supabase
    .from('business_members')
    .select('id')
    .eq('user_id', user.id)
    .eq('business_id', businessId)
    .maybeSingle();
  return Boolean(member);
}

export type AppUser = {
  id: string;
  authUserId: string;
  name: string;
  email: string;
  preferredLanguage: string;
  phone?: string;
};

export async function bootstrapAppUser(input: {
  authUserId: string;
  email: string;
  name: string;
  preferredLanguage?: string;
}): Promise<AppUser> {
  if (storeMode() === 'memory') {
    throw new Error('User bootstrap requires Supabase');
  }
  const supabase = getSupabase()!;
  const { data: existing } = await supabase
    .from('users')
    .select('*')
    .eq('auth_user_id', input.authUserId)
    .maybeSingle();

  if (existing) {
    const patch: Record<string, unknown> = {};
    if (input.name && input.name !== existing.name) patch.name = input.name;
    if (input.email && input.email !== existing.email) patch.email = input.email;
    if (
      input.preferredLanguage &&
      input.preferredLanguage !== existing.preferred_language
    ) {
      patch.preferred_language = input.preferredLanguage;
    }
    if (Object.keys(patch).length) {
      const { data: updated, error } = await supabase
        .from('users')
        .update(patch)
        .eq('id', existing.id)
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return mapAppUser(updated);
    }
    return mapAppUser(existing);
  }

  const row = {
    auth_user_id: input.authUserId,
    name: input.name || input.email.split('@')[0] || 'FreBob user',
    email: input.email || null,
    preferred_language: input.preferredLanguage ?? 'en',
  };
  const { data, error } = await supabase.from('users').insert(row).select('*').single();
  if (error) throw new Error(error.message);
  return mapAppUser(data);
}

export async function getAppUserByAuthId(authUserId: string): Promise<AppUser | null> {
  if (storeMode() === 'memory') return null;
  const { data } = await getSupabase()!
    .from('users')
    .select('*')
    .eq('auth_user_id', authUserId)
    .maybeSingle();
  return data ? mapAppUser(data) : null;
}

export async function listBusinessesForAuthUser(authUserId: string): Promise<Business[]> {
  if (storeMode() === 'memory') return [];
  const user = await getAppUserByAuthId(authUserId);
  if (!user) return [];
  const supabase = getSupabase()!;
  const { data: members, error } = await supabase
    .from('business_members')
    .select('business_id')
    .eq('user_id', user.id);
  if (error) throw new Error(error.message);
  const ids = (members ?? []).map((m) => String(m.business_id));
  if (!ids.length) return [];
  const { data: businesses, error: bizErr } = await supabase
    .from('businesses')
    .select('*')
    .in('id', ids)
    .order('created_at', { ascending: true });
  if (bizErr) throw new Error(bizErr.message);
  return (businesses ?? []).map(mapBusiness);
}

export async function createBusinessForAuthUser(input: {
  authUserId: string;
  name: string;
  category?: string;
  location?: string;
  phone?: string;
  currency?: string;
  preferredLanguage?: string;
  starterProducts?: Array<{
    name: string;
    unitPrice: number;
    available: number;
    variant?: string;
  }>;
}): Promise<{ user: AppUser; business: Business }> {
  if (storeMode() === 'memory') {
    throw new Error('Creating a business requires Supabase');
  }

  let user = await getAppUserByAuthId(input.authUserId);
  if (!user) {
    user = await bootstrapAppUser({
      authUserId: input.authUserId,
      email: '',
      name: 'FreBob user',
      preferredLanguage: input.preferredLanguage,
    });
  }

  const supabase = getSupabase()!;
  const businessId = crypto.randomUUID();
  const { data: bizRow, error: bizErr } = await supabase
    .from('businesses')
    .insert({
      id: businessId,
      name: input.name,
      category: input.category ?? null,
      location: input.location ?? null,
      phone: input.phone ?? null,
      currency: input.currency ?? 'NGN',
      preferred_language: input.preferredLanguage ?? user.preferredLanguage,
      owner_user_id: user.id,
    })
    .select('*')
    .single();
  if (bizErr) throw new Error(bizErr.message);

  const { error: memErr } = await supabase.from('business_members').insert({
    business_id: businessId,
    user_id: user.id,
    role: 'owner',
  });
  if (memErr) throw new Error(memErr.message);

  const business = mapBusiness(bizRow);

  for (const p of input.starterProducts ?? []) {
    await addProduct({
      businessId,
      name: p.name,
      variant: p.variant,
      unitPrice: p.unitPrice,
      available: p.available,
      reserved: 0,
      lowStockThreshold: 5,
    });
  }

  return { user, business };
}

export { DEMO_BUSINESS_ID, isDemoBusiness };

function mapAppUser(row: Record<string, unknown>): AppUser {
  return {
    id: String(row.id),
    authUserId: String(row.auth_user_id),
    name: String(row.name),
    email: String(row.email ?? ''),
    preferredLanguage: String(row.preferred_language ?? 'en'),
    phone: row.phone ? String(row.phone) : undefined,
  };
}

function mapBusiness(row: Record<string, unknown>): Business {
  return {
    id: String(row.id),
    name: String(row.name),
    category: String(row.category ?? ''),
    location: String(row.location ?? ''),
    currency: String(row.currency ?? 'NGN'),
    preferredLanguage: String(row.preferred_language ?? 'en'),
    phone: row.phone ? String(row.phone) : undefined,
    ownerUserId: row.owner_user_id ? String(row.owner_user_id) : undefined,
  };
}

function mapProduct(row: Record<string, unknown>): Product {
  return {
    id: String(row.id),
    businessId: String(row.business_id),
    name: String(row.name),
    variant: row.variant ? String(row.variant) : undefined,
    unitPrice: Number(row.unit_price),
    available: Number(row.available),
    reserved: Number(row.reserved),
    lowStockThreshold: Number(row.low_stock_threshold),
  };
}

function mapCustomer(row: Record<string, unknown>): Customer {
  return {
    id: String(row.id),
    businessId: String(row.business_id),
    name: String(row.name),
    phone: row.phone ? String(row.phone) : undefined,
    balanceOwed: Number(row.balance_owed),
  };
}

function mapOrderRow(row: Record<string, unknown>): Order {
  const itemsRaw = (row.order_items as Record<string, unknown>[] | undefined) ?? [];
  const items: OrderItem[] = itemsRaw.map((i) => ({
    id: String(i.id),
    orderId: String(i.order_id),
    productId: i.product_id ? String(i.product_id) : undefined,
    productName: String(i.product_name),
    variant: i.variant ? String(i.variant) : undefined,
    quantity: Number(i.quantity),
    unitPrice: Number(i.unit_price),
    lineTotal: Number(i.line_total),
  }));
  return {
    id: String(row.id),
    businessId: String(row.business_id),
    customerId: String(row.customer_id ?? ''),
    customerName: String(row.customer_name),
    items,
    total: Number(row.total),
    amountPaid: Number(row.amount_paid),
    balance: Number(row.balance),
    paymentStatus: row.payment_status as Order['paymentStatus'],
    orderStatus: row.order_status as Order['orderStatus'],
    source: row.source as Order['source'],
    notes: row.notes ? String(row.notes) : undefined,
    createdAt: String(row.created_at),
  };
}

function mapMemory(row: Record<string, unknown>): MemoryNote {
  return {
    id: String(row.id),
    businessId: String(row.business_id),
    kind: String(row.kind),
    content: String(row.content),
    trustLevel: row.trust_level as MemoryNote['trustLevel'],
    orderId: row.order_id ? String(row.order_id) : undefined,
    createdAt: String(row.created_at),
  };
}
