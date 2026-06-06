'use strict';

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const env = require('./config/env');
const { globalRateLimiter } = require('./middlewares/rateLimiter');
const errorHandler = require('./middlewares/errorHandler');
const authRoutes = require('./modules/auth/auth.routes');
const customersRoutes = require('./modules/customers/customers.routes');

const app = express();

// ─── Headers de segurança (helmet) ───────────────────────────────────────────
app.use(helmet({
  // Content-Security-Policy desligado aqui: o frontend é servido em ambiente controlado.
  // Habilitar e configurar quando houver CDN ou recursos externos.
  contentSecurityPolicy: false,
}));
app.disable('x-powered-by'); // Redundante com helmet, mas explícito por clareza.

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    // Aceitar mesma origem ou origem configurada
    const allowed = [env.corsOrigin, 'http://localhost:3000', 'http://127.0.0.1:3000'];

    // Em desenvolvimento, permite file:// (frontend aberto diretamente no navegador)
    if (env.nodeEnv === 'development' && !origin) {
      return callback(null, true);
    }

    if (!origin || allowed.includes(origin)) {
      return callback(null, true);
    }

    callback(new Error('Origem não permitida pelo CORS.'));
  },
  methods:        ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Body parser (limite de 10kb para evitar payload bombing) ─────────────────
app.use(express.json({ limit: '10kb' }));

// ─── Rate limiter global ──────────────────────────────────────────────────────
app.use(globalRateLimiter);

// ─── Servir frontend estático ─────────────────────────────────────────────────
// Aponta para ../frontend relativo à pasta backend/ em qualquer ambiente.
// Em desenvolvimento local: backend/src/app.js → ../../frontend
// Em Docker: o volume monta ../frontend em /app/../frontend (mesmo caminho relativo)
const frontendDir = path.join(__dirname, '..', '..', 'frontend');
app.use(express.static(frontendDir));

// ─── Health check (sem autenticação) ─────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Rotas de negócio ─────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/customers', customersRoutes);

// ─── 404 para rotas de API desconhecidas ──────────────────────────────────────
app.use('/api', (req, res) => {
  res.status(404).json({ message: 'Rota não encontrada.' });
});

// ─── GET / — serve o index.html do frontend ──────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});

// ─── Error handler global (DEVE ser o último middleware) ─────────────────────
app.use(errorHandler);

module.exports = app;
