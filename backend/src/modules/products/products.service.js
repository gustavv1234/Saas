'use strict';

const { createError } = require('../../middlewares/validate');
const { sanitizeString } = require('../../utils/sanitize');

const LIST_SELECT = { id: true, name: true, sku: true, category: { select: { id: true, name: true } }, unit: true, costPrice: true, salePrice: true, minStock: true, currentStock: true, active: true };

function parseProduct(body) {
  const name      = sanitizeString(body.name);
  const sku       = sanitizeString(body.sku);
  const unit      = sanitizeString(body.unit || 'un');
  const costPrice = parseFloat(body.costPrice);
  const salePrice = parseFloat(body.salePrice);
  const minStock  = parseInt(body.minStock,  10);
  const categoryId = body.categoryId ? parseInt(body.categoryId, 10) : null;

  if (!name || name.length < 2 || name.length > 120) throw createError('Nome inválido (2–120 chars).', 400);
  if (!sku  || sku.length   < 1 || sku.length   > 40)  throw createError('SKU inválido (1–40 chars).', 400);
  if (isNaN(costPrice) || costPrice < 0) throw createError('Preço de custo inválido.', 400);
  if (isNaN(salePrice) || salePrice < 0) throw createError('Preço de venda inválido.', 400);
  if (isNaN(minStock)  || minStock  < 0) throw createError('Estoque mínimo inválido.', 400);

  return { name, sku, unit, costPrice, salePrice, minStock, categoryId };
}

async function listProducts(prisma, { page = 1, limit = 20, search = '', categoryId, active } = {}) {
  const take = Math.min(parseInt(limit, 10) || 20, 100);
  const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;
  const where = {
    ...(active !== undefined ? { active: active === 'true' || active === true } : { active: true }),
    ...(search     ? { OR: [{ name: { contains: search } }, { sku: { contains: search } }] } : {}),
    ...(categoryId ? { categoryId: parseInt(categoryId, 10) } : {}),
  };
  const [total, items] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({ where, select: LIST_SELECT, orderBy: { name: 'asc' }, skip, take }),
  ]);
  return { total, page: Math.max(parseInt(page, 10) || 1, 1), limit: take, items };
}

async function getLowStock(prisma) {
  return prisma.product.findMany({
    where: { active: true, currentStock: { lte: prisma.product.fields?.minStock ?? 0 } },
    select: LIST_SELECT,
    orderBy: { currentStock: 'asc' },
  }).catch(() =>
    // Fallback: raw filter in JS (SQLite não suporta column-to-column em WHERE direto)
    prisma.product.findMany({ where: { active: true }, select: LIST_SELECT })
      .then(rows => rows.filter(r => r.currentStock <= r.minStock))
  );
}

async function createProduct(prisma, body) {
  const data = parseProduct(body);
  const exists = await prisma.product.findUnique({ where: { sku: data.sku } });
  if (exists) throw createError('SKU já cadastrado.', 409);
  return prisma.product.create({ data: { ...data, currentStock: 0 }, select: LIST_SELECT });
}

async function getProductById(prisma, id) {
  const p = await prisma.product.findUnique({ where: { id: parseInt(id, 10) }, include: { category: true } });
  if (!p) throw createError('Produto não encontrado.', 404);
  return p;
}

async function updateProduct(prisma, id, body) {
  const existing = await prisma.product.findUnique({ where: { id: parseInt(id, 10) } });
  if (!existing) throw createError('Produto não encontrado.', 404);
  const data = parseProduct(body);
  if (data.sku !== existing.sku) {
    const dup = await prisma.product.findUnique({ where: { sku: data.sku } });
    if (dup) throw createError('SKU já cadastrado.', 409);
  }
  return prisma.product.update({ where: { id: parseInt(id, 10) }, data, select: LIST_SELECT });
}

async function deleteProduct(prisma, id) {
  const existing = await prisma.product.findUnique({ where: { id: parseInt(id, 10) } });
  if (!existing) throw createError('Produto não encontrado.', 404);
  return prisma.product.update({ where: { id: parseInt(id, 10) }, data: { active: false }, select: LIST_SELECT });
}

module.exports = { listProducts, getLowStock, createProduct, getProductById, updateProduct, deleteProduct };
