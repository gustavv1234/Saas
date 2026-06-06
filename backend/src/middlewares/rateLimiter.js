'use strict';

const rateLimit = require('express-rate-limit');
const env = require('../config/env');

/**
 * Rate limiter para rotas de autenticação.
 * Bloqueia IPs que excedam o limite configurado em .env.
 * Padrão: 10 tentativas por 15 minutos.
 */
const loginRateLimiter = rateLimit({
  windowMs:             env.rateLimitWindowMs,
  max:                  env.rateLimitMax,
  standardHeaders:      true,   // Retorna headers RateLimit-* padrão
  legacyHeaders:        false,
  skipSuccessfulRequests: true,  // Conta apenas falhas
  message: {
    message: 'Muitas tentativas de acesso. Aguarde alguns minutos e tente novamente.',
  },
});

/**
 * Rate limiter global (todas as rotas).
 * Proteção contra abuso e DDoS simples.
 * 300 requisições por minuto por IP.
 */
const globalRateLimiter = rateLimit({
  windowMs:        60 * 1000,
  max:             300,
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    message: 'Muitas requisições. Tente novamente em instantes.',
  },
});

module.exports = { loginRateLimiter, globalRateLimiter };
