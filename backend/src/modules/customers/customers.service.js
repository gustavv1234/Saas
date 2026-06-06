'use strict';

const prisma = require('../../config/prisma');
const { validateCPF, validateCNPJ, validatePhone, validateEmail } = require('../../utils/validators');
const { sanitizeString, sanitizeDocument, sanitizePhone } = require('../../utils/sanitize');
const { createError } = require('../../middlewares/validate');

/**
 * Valida e normaliza os dados de entrada de um cliente.
 * Lança erro 400 com lista de mensagens se qualquer campo for inválido.
 * Retorna os dados limpos prontos para persistência.
 */
function parseAndValidate(data) {
  const errors = [];

  const name = sanitizeString(data.name || '');
  if (!name)               errors.push('Nome é obrigatório.');
  else if (name.length < 3)   errors.push('Nome deve ter no mínimo 3 caracteres.');
  else if (name.length > 120) errors.push('Nome deve ter no máximo 120 caracteres.');

  const customerType = data.customerType;
  if (customerType !== 'PF' && customerType !== 'PJ')
    errors.push('Tipo de cliente inválido. Use "PF" ou "PJ".');

  const document = sanitizeDocument(data.document);
  if (!document) {
    errors.push('Documento é obrigatório.');
  } else if (customerType === 'PF' && !validateCPF(document)) {
    errors.push('CPF inválido.');
  } else if (customerType === 'PJ' && !validateCNPJ(document)) {
    errors.push('CNPJ inválido.');
  }

  const phone = sanitizePhone(data.phone);
  if (!phone)                   errors.push('Telefone é obrigatório.');
  else if (!validatePhone(phone)) errors.push('Telefone inválido. Informe DDD + número (fixo ou celular).');

  const email = data.email ? sanitizeString(data.email) : null;
  if (email) {
    if (email.length > 120)    errors.push('E-mail deve ter no máximo 120 caracteres.');
    else if (!validateEmail(email)) errors.push('E-mail inválido.');
  }

  const address = data.address ? sanitizeString(data.address) : null;
  if (address && address.length > 180) errors.push('Endereço deve ter no máximo 180 caracteres.');

  const notes = data.notes ? sanitizeString(data.notes) : null;
  if (notes && notes.length > 500) errors.push('Observações devem ter no máximo 500 caracteres.');

  if (errors.length > 0) {
    const err = new Error(errors.join(' '));
    err.statusCode = 400;
    err.validationErrors = errors;
    throw err;
  }

  return {
    name,
    customerType,
    document,
    phone,
    email:   email   || null,
    address: address || null,
    notes:   notes   || null,
  };
}

// ---------------------------------------------------------------------------
// Seletores de campos retornados — nunca expor document/phone completo em listas
// ---------------------------------------------------------------------------
const SELECT_LIST = {
  id: true, name: true, customerType: true,
  phone: true, email: true, active: true, createdAt: true,
};

const SELECT_DETAIL = {
  id: true, name: true, customerType: true, document: true,
  phone: true, email: true, address: true, notes: true,
  active: true, createdAt: true, updatedAt: true,
};

const SELECT_CREATED = {
  id: true, name: true, customerType: true, active: true, createdAt: true,
};

const SELECT_UPDATED = {
  id: true, name: true, customerType: true, active: true, updatedAt: true,
};

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

async function createCustomer(data) {
  const validated = parseAndValidate(data);

  const duplicate = await prisma.customer.findUnique({
    where: { document: validated.document },
  });
  if (duplicate) {
    throw createError('Já existe um cliente cadastrado com este CPF/CNPJ.', 409);
  }

  const customer = await prisma.customer.create({
    data: { ...validated, active: true },
    select: SELECT_CREATED,
  });

  return customer;
}

async function listCustomers({ page, limit, search, active } = {}) {
  const take = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

  const where = {};

  if (search) {
    where.name = { contains: sanitizeString(String(search)) };
  }

  if (active !== undefined && active !== '') {
    where.active = active === 'true' || active === true;
  }

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      select: SELECT_LIST,
    }),
    prisma.customer.count({ where }),
  ]);

  return {
    data: customers,
    pagination: {
      page:       Math.max(parseInt(page, 10) || 1, 1),
      limit:      take,
      total,
      totalPages: Math.ceil(total / take) || 1,
    },
  };
}

async function getCustomerById(id) {
  const customerId = parseInt(id, 10);
  if (!customerId || customerId < 1) throw createError('ID inválido.', 400);

  const customer = await prisma.customer.findUnique({
    where:  { id: customerId },
    select: SELECT_DETAIL,
  });

  if (!customer) throw createError('Cliente não encontrado.', 404);
  return customer;
}

async function updateCustomer(id, data) {
  const customerId = parseInt(id, 10);
  if (!customerId || customerId < 1) throw createError('ID inválido.', 400);

  const existing = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!existing) throw createError('Cliente não encontrado.', 404);

  const validated = parseAndValidate(data);

  // Se o documento mudou, verificar unicidade
  if (validated.document !== existing.document) {
    const conflict = await prisma.customer.findUnique({
      where: { document: validated.document },
    });
    if (conflict) throw createError('Já existe um cliente cadastrado com este CPF/CNPJ.', 409);
  }

  const customer = await prisma.customer.update({
    where:  { id: customerId },
    data:   validated,
    select: SELECT_UPDATED,
  });

  return customer;
}

async function deleteCustomer(id) {
  const customerId = parseInt(id, 10);
  if (!customerId || customerId < 1) throw createError('ID inválido.', 400);

  const existing = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!existing) throw createError('Cliente não encontrado.', 404);
  if (!existing.active) throw createError('Cliente já está inativo.', 409);

  // Soft delete — nunca deletar fisicamente para preservar histórico
  await prisma.customer.update({
    where: { id: customerId },
    data:  { active: false },
  });
}

module.exports = { createCustomer, listCustomers, getCustomerById, updateCustomer, deleteCustomer };
