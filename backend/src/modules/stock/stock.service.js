'use strict';

const { createError } = require('../../middlewares/validate');
const { sanitizeString } = require('../../utils/sanitize');

const VALID_TYPES = ['IN', 'OUT', 'ADJUST'];

async function getStockPosition(prisma, { page = 1, limit = 50, search = '' } = {}) {
  const take = Math.min(parseInt(limit, 10) || 50, 100);
  const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;
  const where = { active: true, ...(search ? { OR: [{ name: { contains: search } }, { sku: { contains: search } }] } : {}) };
  const [total, items] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where, skip, take,
      select: { id: true, name: true, sku: true, unit: true, currentStock: true, minStock: true, salePrice: true, category: { select: { name: true } } },
      orderBy: { name: 'asc' },
    }),
  ]);
  return { total, page: Math.max(parseInt(page, 10) || 1, 1), limit: take, items };
}

async function registerMovement(prisma, body, userId) {
  const productId = parseInt(body.productId, 10);
  const type      = (body.type || '').toUpperCase();
  const quantity  = parseInt(body.quantity, 10);
  const reason    = sanitizeString(body.reason || '');

  if (!productId || isNaN(productId)) throw createError('Produto obrigatório.', 400);
  if (!VALID_TYPES.includes(type))    throw createError('Tipo de movimentação inválido. Use IN, OUT ou ADJUST.', 400);
  if (isNaN(quantity) || quantity <= 0) throw createError('Quantidade deve ser um inteiro positivo.', 400);

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || !product.active) throw createError('Produto não encontrado.', 404);

  let newStock;
  if (type === 'IN')     newStock = product.currentStock + quantity;
  else if (type === 'OUT') {
    if (product.currentStock < quantity) {
      throw createError(`Estoque insuficiente. Disponível: ${product.currentStock} ${product.unit}.`, 422);
    }
    newStock = product.currentStock - quantity;
  } else {
    newStock = quantity; // ADJUST: sobrescreve o saldo
  }

  const [movement] = await prisma.$transaction([
    prisma.stockMovement.create({
      data: { productId, type, quantity, reason: reason || null, userId },
      include: { product: { select: { name: true, sku: true, unit: true } } },
    }),
    prisma.product.update({ where: { id: productId }, data: { currentStock: newStock } }),
  ]);

  return { ...movement, newStock };
}

async function listMovements(prisma, { page = 1, limit = 30, productId } = {}) {
  const take = Math.min(parseInt(limit, 10) || 30, 100);
  const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;
  const where = productId ? { productId: parseInt(productId, 10) } : {};
  const [total, items] = await Promise.all([
    prisma.stockMovement.count({ where }),
    prisma.stockMovement.findMany({
      where, skip, take,
      include: { product: { select: { name: true, sku: true, unit: true } } },
      orderBy: { createdAt: 'desc' },
    }),
  ]);
  return { total, page: Math.max(parseInt(page, 10) || 1, 1), limit: take, items };
}

module.exports = { getStockPosition, registerMovement, listMovements };
