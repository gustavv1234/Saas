'use strict';

const path = require('path');

// Dois clientes gerados de schemas separados (master e tenant)
const { PrismaClient: MasterPrismaClient } = require('../generated/master');
const { PrismaClient: TenantPrismaClient  } = require('../generated/tenant');

// Prisma SQLite resolve file: relativo ao diretório do cliente gerado, não ao cwd.
// Esta função garante que sempre usamos caminho absoluto.
function _resolveFileUrl(url) {
  if (!url) return url;
  if (url.startsWith('file:') && !url.startsWith('file:/')) {
    return 'file:' + path.resolve(url.slice(5));
  }
  return url;
}

// ── Master client — singleton ─────────────────────────────────────────────────
let _masterClient;
function getMasterClient() {
  if (!_masterClient) {
    const url = _resolveFileUrl(process.env.MASTER_DATABASE_URL);
    _masterClient = new MasterPrismaClient({ datasources: { db: { url } } });
  }
  return _masterClient;
}

// ── Tenant client — factory com cache por slug ────────────────────────────────
const _tenantClients = {};

function getTenantClient(slug) {
  if (!_tenantClients[slug]) {
    const dbPath = path.resolve(__dirname, '..', '..', 'data', `tenant_${slug}.db`);
    _tenantClients[slug] = new TenantPrismaClient({
      datasources: { db: { url: `file:${dbPath}` } },
    });
  }
  return _tenantClients[slug];
}

function evictTenantClient(slug) {
  if (_tenantClients[slug]) {
    _tenantClients[slug].$disconnect().catch(() => {});
    delete _tenantClients[slug];
  }
}

module.exports = { getMasterClient, getTenantClient, evictTenantClient };
