'use strict';

const path      = require('path');
const fs        = require('fs');
const { execSync } = require('child_process');
const bcrypt    = require('bcryptjs');
const { getMasterClient, getTenantClient, evictTenantClient } = require('../../config/prisma');
const { createError } = require('../../middlewares/validate');
const { sanitizeString } = require('../../utils/sanitize');

const DATA_DIR    = path.resolve(__dirname, '..', '..', '..', 'data');
const SCHEMA_PATH = path.resolve(__dirname, '..', '..', '..', 'prisma', 'tenant', 'schema.prisma');

function slugify(str) {
  return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function listTenants() {
  const master = getMasterClient();
  return master.tenant.findMany({ orderBy: { name: 'asc' } });
}

async function createTenant(body) {
  const master = getMasterClient();
  const name   = sanitizeString(body.name);
  const plan   = sanitizeString(body.plan || 'basic');
  const adminPassword = body.adminPassword;

  if (!name || name.length < 2)  throw createError('Nome do tenant obrigatório.', 400);
  if (!adminPassword || adminPassword.length < 8) throw createError('Senha do admin deve ter ao menos 8 caracteres.', 400);

  const slug  = slugify(name);
  const exists = await master.tenant.findUnique({ where: { slug } });
  if (exists) throw createError('Tenant com este nome já existe.', 409);

  // Garante diretório de dados
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  const dbPath = path.join(DATA_DIR, `tenant_${slug}.db`);
  const dbUrl  = `file:${dbPath}`;

  // Aplica migrations no novo banco do tenant
  execSync(`npx prisma migrate deploy --schema="${SCHEMA_PATH}"`, {
    cwd:   path.resolve(__dirname, '..', '..', '..'),
    env:   { ...process.env, DATABASE_URL: dbUrl },
    stdio: 'pipe',
  });

  // Cria tenant no master
  const tenant = await master.tenant.create({ data: { name, slug, plan, dbPath } });

  // Cria usuário admin no banco do tenant
  const prisma = getTenantClient(slug);
  const hash   = await bcrypt.hash(adminPassword, 12);
  await prisma.user.create({ data: { username: 'admin', passwordHash: hash, name: 'Administrador', role: 'admin' } });

  return { ...tenant, adminCreated: true };
}

async function updateTenant(id, body) {
  const master = getMasterClient();
  const tenant = await master.tenant.findUnique({ where: { id: parseInt(id, 10) } });
  if (!tenant) throw createError('Tenant não encontrado.', 404);

  const data = {};
  if (body.name)  data.name  = sanitizeString(body.name);
  if (body.plan)  data.plan  = sanitizeString(body.plan);
  if (body.active !== undefined) {
    data.active = Boolean(body.active);
    if (!data.active) evictTenantClient(tenant.slug);
  }

  return master.tenant.update({ where: { id: tenant.id }, data });
}

async function getTenantById(id) {
  const master = getMasterClient();
  const tenant = await master.tenant.findUnique({ where: { id: parseInt(id, 10) } });
  if (!tenant) throw createError('Tenant não encontrado.', 404);
  return tenant;
}

module.exports = { listTenants, createTenant, updateTenant, getTenantById };
