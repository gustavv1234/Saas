'use strict';

const { createError } = require('../../middlewares/validate');
const { sanitizeString } = require('../../utils/sanitize');

async function listCategories(prisma) {
  return prisma.category.findMany({ where: { active: true }, orderBy: { name: 'asc' }, select: { id: true, name: true, active: true } });
}

async function createCategory(prisma, body) {
  const name = sanitizeString(body.name);
  if (!name || name.length < 2 || name.length > 60) throw createError('Nome de categoria inválido (2–60 chars).', 400);
  const exists = await prisma.category.findUnique({ where: { name } });
  if (exists) throw createError('Categoria já cadastrada.', 409);
  return prisma.category.create({ data: { name }, select: { id: true, name: true, active: true } });
}

async function updateCategory(prisma, id, body) {
  const cat = await prisma.category.findUnique({ where: { id: parseInt(id, 10) } });
  if (!cat) throw createError('Categoria não encontrada.', 404);
  const name = sanitizeString(body.name);
  if (!name || name.length < 2 || name.length > 60) throw createError('Nome inválido.', 400);
  if (name !== cat.name) {
    const dup = await prisma.category.findUnique({ where: { name } });
    if (dup) throw createError('Categoria já cadastrada.', 409);
  }
  return prisma.category.update({ where: { id: parseInt(id, 10) }, data: { name }, select: { id: true, name: true, active: true } });
}

async function deleteCategory(prisma, id) {
  const cat = await prisma.category.findUnique({ where: { id: parseInt(id, 10) } });
  if (!cat) throw createError('Categoria não encontrada.', 404);
  const used = await prisma.product.count({ where: { categoryId: parseInt(id, 10), active: true } });
  if (used > 0) throw createError(`Categoria em uso por ${used} produto(s) ativo(s).`, 409);
  return prisma.category.update({ where: { id: parseInt(id, 10) }, data: { active: false }, select: { id: true, name: true, active: true } });
}

module.exports = { listCategories, createCategory, updateCategory, deleteCategory };
