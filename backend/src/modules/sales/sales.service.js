'use strict';

const { createError } = require('../../middlewares/validate');
const { sanitizeString } = require('../../utils/sanitize');

const VALID_PAYMENTS = ['cash', 'card', 'pix', 'credit', 'debit'];
const MAX_DISCOUNT   = 0.5; // 50%

async function listSales(prisma, { page = 1, limit = 20, from, to, status } = {}) {
  const take = Math.min(parseInt(limit, 10) || 20, 100);
  const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;
  const where = {
    ...(status ? { status } : {}),
    ...(from || to ? { createdAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {}),
  };
  const [total, items] = await Promise.all([
    prisma.sale.count({ where }),
    prisma.sale.findMany({
      where, skip, take,
      select: { id: true, total: true, discount: true, paymentMethod: true, status: true, userId: true, customerId: true, createdAt: true, _count: { select: { items: true } } },
      orderBy: { createdAt: 'desc' },
    }),
  ]);
  return { total, page: Math.max(parseInt(page, 10) || 1, 1), limit: take, items };
}

async function createSale(prisma, body, userId) {
  const items         = body.items;
  const paymentMethod = (body.paymentMethod || 'cash').toLowerCase();
  const discount      = parseFloat(body.discount || 0);
  const customerId    = body.customerId ? parseInt(body.customerId, 10) : null;
  const notes         = sanitizeString(body.notes || '');

  if (!Array.isArray(items) || items.length === 0) throw createError('Itens da venda são obrigatórios.', 400);
  if (!VALID_PAYMENTS.includes(paymentMethod)) throw createError('Forma de pagamento inválida.', 400);
  if (isNaN(discount) || discount < 0 || discount > MAX_DISCOUNT) throw createError(`Desconto máximo é ${MAX_DISCOUNT * 100}%.`, 400);

  // Valida e carrega produtos — tudo em uma query
  const productIds = items.map(i => parseInt(i.productId, 10));
  const products   = await prisma.product.findMany({ where: { id: { in: productIds }, active: true } });
  const prodMap    = Object.fromEntries(products.map(p => [p.id, p]));

  let subtotalBruto = 0;
  const lineItems = [];

  for (const item of items) {
    const pid  = parseInt(item.productId, 10);
    const qty  = parseInt(item.quantity, 10);
    const prod = prodMap[pid];

    if (!prod) throw createError(`Produto ID ${pid} não encontrado ou inativo.`, 400);
    if (isNaN(qty) || qty <= 0) throw createError(`Quantidade inválida para ${prod.name}.`, 400);
    if (prod.currentStock < qty) throw createError(`Estoque insuficiente para "${prod.name}". Disponível: ${prod.currentStock}.`, 422);

    const unitPrice = prod.salePrice;
    const subtotal  = parseFloat((unitPrice * qty).toFixed(2));
    subtotalBruto  += subtotal;
    lineItems.push({ productId: pid, quantity: qty, unitPrice, subtotal });
  }

  const total = parseFloat((subtotalBruto * (1 - discount)).toFixed(2));

  // Tudo em uma transação: cria venda + itens + baixa estoque
  const sale = await prisma.$transaction(async (tx) => {
    const created = await tx.sale.create({
      data: {
        customerId, total, discount, paymentMethod, notes: notes || null, userId,
        items: { create: lineItems },
      },
      include: { items: { include: { product: { select: { name: true, sku: true, unit: true } } } } },
    });

    // Baixa de estoque para cada item
    for (const li of lineItems) {
      await tx.product.update({ where: { id: li.productId }, data: { currentStock: { decrement: li.quantity } } });
      await tx.stockMovement.create({ data: { productId: li.productId, type: 'OUT', quantity: li.quantity, reason: `Venda #${created.id}`, userId } });
    }

    return created;
  });

  return sale;
}

async function getSaleById(prisma, id) {
  const sale = await prisma.sale.findUnique({
    where: { id: parseInt(id, 10) },
    include: { items: { include: { product: { select: { name: true, sku: true, unit: true } } } } },
  });
  if (!sale) throw createError('Venda não encontrada.', 404);
  return sale;
}

async function cancelSale(prisma, id, userId) {
  const sale = await prisma.sale.findUnique({ where: { id: parseInt(id, 10) }, include: { items: true } });
  if (!sale) throw createError('Venda não encontrada.', 404);
  if (sale.status === 'cancelled') throw createError('Venda já está cancelada.', 400);

  await prisma.$transaction(async (tx) => {
    await tx.sale.update({ where: { id: sale.id }, data: { status: 'cancelled' } });
    for (const item of sale.items) {
      await tx.product.update({ where: { id: item.productId }, data: { currentStock: { increment: item.quantity } } });
      await tx.stockMovement.create({ data: { productId: item.productId, type: 'IN', quantity: item.quantity, reason: `Cancelamento Venda #${sale.id}`, userId } });
    }
  });

  return { id: sale.id, status: 'cancelled' };
}

module.exports = { listSales, createSale, getSaleById, cancelSale };
