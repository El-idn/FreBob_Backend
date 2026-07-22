import { listCustomers, listOrders, listProducts } from '../repo/index.js';

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const n = new Date();
  return (
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate()
  );
}

export async function dashboardMetrics(businessId: string) {
  const orders = await listOrders(businessId);
  const customers = await listCustomers(businessId);
  const products = await listProducts(businessId);
  const todays = orders.filter((o) => isToday(o.createdAt) && o.orderStatus !== 'cancelled');
  return {
    salesToday: todays.reduce((s, o) => s + o.total, 0),
    moneyInToday: todays.reduce((s, o) => s + o.amountPaid, 0),
    balancesOwed: customers.reduce((s, c) => s + c.balanceOwed, 0),
    ordersToday: todays.length,
    lowStock: products
      .filter((p) => p.available <= p.lowStockThreshold)
      .map((p) => ({ id: p.id, name: p.name, available: p.available })),
  };
}
