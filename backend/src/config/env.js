'use strict';

require('dotenv').config();

const REQUIRED = ['DATABASE_URL', 'JWT_SECRET'];

for (const key of REQUIRED) {
  if (!process.env[key] || process.env[key].trim() === '') {
    throw new Error(`[ENV] Variável de ambiente obrigatória não definida: ${key}`);
  }
}

if (process.env.JWT_SECRET.length < 32) {
  throw new Error('[ENV] JWT_SECRET deve ter pelo menos 32 caracteres. Use uma string longa e aleatória.');
}

module.exports = Object.freeze({
  port:               parseInt(process.env.PORT, 10) || 3000,
  nodeEnv:            process.env.NODE_ENV || 'development',
  jwtSecret:          process.env.JWT_SECRET,
  jwtExpiresIn:       process.env.JWT_EXPIRES_IN || '8h',
  corsOrigin:         process.env.CORS_ORIGIN || 'http://localhost:3000',
  rateLimitWindowMs:  parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
  rateLimitMax:       parseInt(process.env.RATE_LIMIT_MAX, 10) || 10,
});
