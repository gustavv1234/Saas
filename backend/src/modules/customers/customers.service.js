'use strict';

const { createError } = require('../../middlewares/validate');
const { sanitizeString, sanitizeDocument, sanitizePhone } = require('../../utils/sanitize');
const { validateCPF, validateCNPJ, validatePhone, validateEmail, onlyDigits } = require('../../utils/validators');

// Campos retornados na listagem (sem campos sensíveis desnecessários)
const LIST_SELECT = { id: true, name: true, customerType: true, document: true, phone: true, email: true, active: true, createdAt: true };

function parseAndValidate(body) {
  const name         = sanitizeString(body.name);
  const customerType = (body.customerType || '').trim().toUpperCase();
  const document     = sanitizeDocument(body.document);
  const phone        = sanitizePhone(body.phone);
  const email        = sanitizeString(body.email || '');
  const address      = sanitizeString(body.address || '');
  const notes        = sanitizeString(body.notes || '');

  if (!name || name.length < 3 || name.length > 120) throw createError('Nome inválido (3–120 chars).', 400);
  if (customerType !== 'PF' && customerType !== 'PJ') throw createError('Tipo de cliente inválido.', 400);
  if (!document) throw createError('Documento obrigatório.', 400);
  if (customerType === 'PF' && !validateCPF(document))   throw createError('CPF inválido.', 400);
  if (customerType === 'PJ' && !validateCNPJ(document))  throw createError('CNPJ inválido.', 400);
  if (!phone || !validatePhone(phone))  throw createError('Telefone inválido.', 400);
  if (email && !validateEmail(email))   throw createError('E-mail inválido.', 400);
  if (address.length > 180) throw createError('Endereço muito longo.', 400);
  if (notes.length   > 500) throw createError('Observações muito longas.', 400);

  return { name, customerType, document, phone, email: email || null, address: address || null, notes: notes || null };
}

async function listCustomers(prisma, { page = 1, limit = 20, search = '', active } = {}) {
  const take = Math.min(parseInt(limit, 10) || 20, 100);
  const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;
  const where = {
    ...(active !== undefined ? { active: active === 'true' || active === true } : {}),
    ...(search ? { name: { contains: search } } : {}),
  };
  const [total, items] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({ where, select: LIST_SELECT, orderBy: { name: 'asc' }, skip, take }),
  ]);
  return { total, page: Math.max(parseInt(page, 10) || 1, 1), limit: take, items };
}

async function createCustomer(prisma, body) {
  const data = parseAndValidate(body);
  const exists = await prisma.customer.findUnique({ where: { document: data.document } });
  if (exists) throw createError('CPF/CNPJ já cadastrado.', 409);
  return prisma.customer.create({ data, select: LIST_SELECT });
}

async function getCustomerById(prisma, id) {
  const customer = await prisma.customer.findUnique({ where: { id: parseInt(id, 10) } });
  if (!customer) throw createError('Cliente não encontrado.', 404);
  return customer;
}

async function updateCustomer(prisma, id, body) {
  const existing = await prisma.customer.findUnique({ where: { id: parseInt(id, 10) } });
  if (!existing) throw createError('Cliente não encontrado.', 404);
  const data = parseAndValidate(body);
  if (data.document !== existing.document) {
    const dup = await prisma.customer.findUnique({ where: { document: data.document } });
    if (dup) throw createError('CPF/CNPJ já cadastrado.', 409);
  }
  return prisma.customer.update({ where: { id: parseInt(id, 10) }, data, select: LIST_SELECT });
}

async function deleteCustomer(prisma, id) {
  const existing = await prisma.customer.findUnique({ where: { id: parseInt(id, 10) } });
  if (!existing) throw createError('Cliente não encontrado.', 404);
  return prisma.customer.update({ where: { id: parseInt(id, 10) }, data: { active: false }, select: LIST_SELECT });
}

module.exports = { listCustomers, createCustomer, getCustomerById, updateCustomer, deleteCustomer };
