'use strict';

require('dotenv').config();

const required = (key) => {
  const v = process.env[key];
  if (!v) throw new Error(`Variável de ambiente obrigatória não definida: ${key}`);
  return v;
};

const masterDbUrl = required('MASTER_DATABASE_URL');
const jwtSecret   = required('JWT_SECRET');

if (jwtSecret.length < 32) {
  throw new Error('JWT_SECRET muito curto — mínimo 32 caracteres.');
}

module.exports = Object.freeze({
  masterDbUrl,
  jwtSecret,
  jwtExpiresIn:      process.env.JWT_EXPIRES_IN  || '8h',
  port:              parseInt(process.env.PORT, 10) || 3000,
  nodeEnv:           process.env.NODE_ENV           || 'development',
  corsOrigin:        process.env.CORS_ORIGIN        || 'http://localhost:3000',
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900_000,
  rateLimitMax:      parseInt(process.env.RATE_LIMIT_MAX, 10)        || 10,
});
