'use strict';

/**
 * Seed multi-tenant:
 * 1. Aplica migrations no master.db
 * 2. Cria MasterUser (admin master)
 * 3. Cria tenant "demo"
 * 4. Aplica migrations no tenant_demo.db
 * 5. Cria User admin no tenant demo
 */

require('dotenv').config();

const path      = require('path');
const fs        = require('fs');
const bcrypt    = require('bcryptjs');
const { execSync } = require('child_process');

const MASTER_SCHEMA = path.resolve(__dirname, 'master', 'schema.prisma');
const TENANT_SCHEMA = path.resolve(__dirname, 'tenant', 'schema.prisma');
const DATA_DIR      = path.resolve(__dirname, '..', 'data');

const MASTER_PASS = process.env.SEED_MASTER_PASSWORD;
const ADMIN_PASS  = process.env.SEED_ADMIN_PASSWORD;

if (!MASTER_PASS || MASTER_PASS.length < 8) throw new Error('SEED_MASTER_PASSWORD obrigatória (mín. 8 chars).');
if (!ADMIN_PASS  || ADMIN_PASS.length  < 8) throw new Error('SEED_ADMIN_PASSWORD obrigatória (mín. 8 chars).');

// Garante que o DB de cada schema usa caminho absoluto para o Prisma CLI resolver corretamente
const MASTER_DB_PATH = path.resolve(DATA_DIR, 'master.db');
const MASTER_DB_URL  = `file:${MASTER_DB_PATH}`;

// ── Helpers ───────────────────────────────────────────────────────────────────
function runMigration(schema, dbUrl) {
  console.log(`  → migrate deploy: ${path.basename(path.dirname(schema))}`);
  execSync(`npx prisma migrate deploy --schema="${schema}"`, {
    env:   { ...process.env, DATABASE_URL: dbUrl, MASTER_DATABASE_URL: MASTER_DB_URL },
    stdio: 'pipe',
    cwd:   path.resolve(__dirname, '..'),
  });
}

async function main() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  // 1. Master DB
  console.log('[seed] Configurando master.db...');
  runMigration(MASTER_SCHEMA, MASTER_DB_URL);

  const { PrismaClient: MasterClient } = require('../src/generated/master');
  const master = new MasterClient({ datasources: { db: { url: MASTER_DB_URL } } });

  const existingMaster = await master.masterUser.findUnique({ where: { username: 'master' } });
  if (!existingMaster) {
    const hash = await bcrypt.hash(MASTER_PASS, 12);
    await master.masterUser.create({ data: { username: 'master', passwordHash: hash, role: 'master' } });
    console.log('[seed] MasterUser "master" criado.');
  } else {
    console.log('[seed] MasterUser "master" já existe.');
  }

  // 2. Tenant "demo"
  const DEMO_SLUG = 'demo';
  const DEMO_DB   = path.join(DATA_DIR, `tenant_${DEMO_SLUG}.db`);
  const DEMO_URL  = `file:${DEMO_DB}`;

  let tenant = await master.tenant.findUnique({ where: { slug: DEMO_SLUG } });
  if (!tenant) {
    console.log('[seed] Criando tenant "demo"...');
    runMigration(TENANT_SCHEMA, DEMO_URL);
    tenant = await master.tenant.create({ data: { name: 'Demo', slug: DEMO_SLUG, plan: 'basic', dbPath: DEMO_DB } });
    console.log('[seed] Tenant "demo" criado.');
  } else {
    console.log('[seed] Tenant "demo" já existe.');
  }

  // 3. Admin do tenant demo
  const { PrismaClient: TenantClient } = require('../src/generated/tenant');
  const prisma = new TenantClient({ datasources: { db: { url: DEMO_URL } } });

  const existingAdmin = await prisma.user.findUnique({ where: { username: 'admin' } });
  if (!existingAdmin) {
    const hash = await bcrypt.hash(ADMIN_PASS, 12);
    await prisma.user.create({ data: { username: 'admin', passwordHash: hash, name: 'Administrador', role: 'admin' } });
    console.log('[seed] User "admin" criado no tenant demo.');
  } else {
    console.log('[seed] User "admin" já existe no tenant demo.');
  }

  await prisma.$disconnect();
  await master.$disconnect();
  console.log('[seed] Concluído.');
}

main().catch(err => { console.error('[seed] Erro:', err.message); process.exit(1); });
