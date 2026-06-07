'use strict';

const svc = require('./reports.service');

const summary = async (req, res, next) => {
  try {
    const d = await svc.salesSummary(req.prisma, req.query);
    res.json({
      totalSales:     d.totalVendas,
      totalRevenue:   d.totalReceita,
      averageTicket:  d.totalVendas > 0 ? +(d.totalReceita / d.totalVendas).toFixed(2) : 0,
      totalItemsSold: d.totalItemsSold || 0,
      totalDiscount:  d.totalDesconto,
      byPaymentMethod: d.porFormaPgto,
    });
  } catch(e) { next(e); }
};

const top = async (req, res, next) => {
  try {
    const rows = await svc.topProducts(req.prisma, req.query);
    res.json({ products: rows.map(r => ({ name: r.product.name, sku: r.product.sku, totalQuantity: r.totalQty, totalRevenue: r.totalReceita })) });
  } catch(e) { next(e); }
};

const lowStock = async (req, res, next) => {
  try { res.json({ products: await svc.lowStockReport(req.prisma) }); }
  catch(e) { next(e); }
};

const ranking = async (req, res, next) => {
  try {
    const rows = await svc.customersRanking(req.prisma, req.query);
    res.json({ customers: rows.map(r => ({ name: r.customerName, totalSpent: r.totalGasto, totalPurchases: r.totalCompras })) });
  } catch(e) { next(e); }
};

module.exports = { summary, top, lowStock, ranking };
