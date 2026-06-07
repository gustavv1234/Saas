'use strict';

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const env    = require('../../config/env');
const { getMasterClient, getTenantClient } = require('../../config/prisma');
const { createError } = require('../../middlewares/validate');

const DUMMY_HASH        = '$2a$12$invalidhashusedtopreventtimingattacks00000000000000000';
const GENERIC_AUTH_ERROR = 'Credenciais inválidas.';

async function login({ username, password, tenantSlug }) {
  if (!tenantSlug) return _masterLogin(username, password);
  return _tenantLogin(username, password, tenantSlug);
}

async function _masterLogin(username, password) {
  const master = getMasterClient();
  const user   = await master.masterUser.findUnique({ where: { username } }).catch(() => null);

  const hash = user ? user.passwordHash : DUMMY_HASH;
  let ok = false;
  try { ok = await bcrypt.compare(password, hash); } catch (_e) {}

  if (!user || !ok) throw createError(GENERIC_AUTH_ERROR, 401);

  const token = jwt.sign(
    { id: user.id, username: user.username, role: 'master' },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
  return { token, user: { id: user.id, username: user.username, role: 'master' } };
}

async function _tenantLogin(username, password, tenantSlug) {
  const master = getMasterClient();
  const tenant = await master.tenant.findUnique({ where: { slug: tenantSlug } }).catch(() => null);
  if (!tenant || !tenant.active) throw createError(GENERIC_AUTH_ERROR, 401);

  const prisma = getTenantClient(tenantSlug);
  const user   = await prisma.user.findUnique({ where: { username } }).catch(() => null);

  const hash = user ? user.passwordHash : DUMMY_HASH;
  let ok = false;
  try { ok = await bcrypt.compare(password, hash); } catch (_e) {}

  if (!user || !ok || !user.active) throw createError(GENERIC_AUTH_ERROR, 401);

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, tenantId: tenant.id, tenantSlug: tenant.slug },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
  return { token, user: { id: user.id, username: user.username, role: user.role, tenantId: tenant.id, tenantSlug: tenant.slug } };
}

module.exports = { login };
