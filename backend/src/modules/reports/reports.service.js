'use strict';

function dateRange(from, to) {
  const now = new Date();
  const start = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1);
  const end   = to   ? new Date(to)   : now;
  return { gte: start, lte: end };
}

async function salesSummary(prisma, query) {
  const range = dateRange(query.from, query.to);
  const sales = await prisma.sale.findMany({
    where: { status: 'completed', createdAt: range },
    select: { total: true, discount: true, paymentMethod: true, createdAt: true },
  });

  const totalVendas    = sales.length;
  const totalReceita   = sales.reduce((s, v) => s + v.total, 0);
  const totalDesconto  = sales.reduce((s, v) => s + (v.discount || 0), 0);
  const porFormaPgto   = sales.reduce((acc, v) => { acc[v.paymentMethod] = (acc[v.paymentMethod] || 0) + v.total; return acc; }, {});

  return { totalVendas, totalReceita: +totalReceita.toFixed(2), totalDesconto: +totalDesconto.toFixed(2), porFormaPgto };
}

async function topProducts(prisma, query) {
  const range = dateRange(query.from, query.to);
  const items = await prisma.saleItem.findMany({
    where: { sale: { status: 'completed', createdAt: range } },
    include: { product: { select: { name: true, sku: true, unit: true } } },
  });

  const agg = {};
  for (const item of items) {
    const key = item.productId;
    if (!agg[key]) agg[key] = { product: item.product, totalQty: 0, totalReceita: 0 };
    agg[key].totalQty     += item.quantity;
    agg[key].totalReceita += item.subtotal;
  }

  return Object.values(agg)
    .sort((a, b) => b.totalQty - a.totalQty)
    .slice(0, 10)
    .map(r => ({ ...r, totalReceita: +r.totalReceita.toFixed(2) }));
}

async function lowStockReport(prisma) {
  const products = await prisma.product.findMany({ where: { active: true }, select: { id: true, name: true, sku: true, unit: true, currentStock: true, minStock: true, category: { select: { name: true } } } });
  return products.filter(p => p.currentStock <= p.minStock).sort((a, b) => a.currentStock - b.currentStock);
}

async function customersRanking(prisma, query) {
  const range = dateRange(query.from, query.to);
  const sales = await prisma.sale.findMany({
    where: { status: 'completed', customerId: { not: null }, createdAt: range },
    select: { customerId: true, total: true },
  });

  const agg = {};
  for (const s of sales) {
    const k = s.customerId;
    if (!agg[k]) agg[k] = { customerId: k, totalCompras: 0, totalGasto: 0 };
    agg[k].totalCompras++;
    agg[k].totalGasto += s.total;
  }

  const ranked = Object.values(agg).sort((a, b) => b.totalGasto - a.totalGasto).slice(0, 10);

  // Enriquecer com nome do cliente
  const ids = ranked.map(r => r.customerId);
  const customers = await prisma.customer.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
  const custMap = Object.fromEntries(customers.map(c => [c.id, c.name]));

  return ranked.map(r => ({ ...r, customerName: custMap[r.customerId] || 'Desconhecido', totalGasto: +r.totalGasto.toFixed(2) }));
}

module.exports = { salesSummary, topProducts, lowStockReport, customersRanking };
