'use strict';

const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { getTenantClient } = require('../config/prisma');
const { createError } = require('./validate');

// Middleware de autenticação — verifica JWT e injeta req.user + req.prisma
function authMiddleware(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return next(createError('Não autenticado.', 401));
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.user = {
      id:          payload.id,
      username:    payload.username,
      role:        payload.role,
      tenantId:    payload.tenantId   ?? null,
      tenantSlug:  payload.tenantSlug ?? null,
    };

    // Injeta cliente Prisma do tenant para rotas de negócio
    if (payload.tenantSlug) {
      req.prisma = getTenantClient(payload.tenantSlug);
    }

    next();
  } catch (_err) {
    next(createError('Token inválido ou expirado.', 401));
  }
}

// Middleware extra — restringe rota apenas a usuários master
function masterOnly(req, res, next) {
  if (!req.user || req.user.role !== 'master') {
    return next(createError('Acesso restrito a administradores master.', 403));
  }
  next();
}

module.exports = authMiddleware;
module.exports.masterOnly = masterOnly;
