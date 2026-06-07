'use strict';

const path    = require('path');
const express = require('express');
const helmet  = require('helmet');
const cors    = require('cors');

const env              = require('./config/env');
const { globalRateLimiter } = require('./middlewares/rateLimiter');
const errorHandler     = require('./middlewares/errorHandler');
const authRoutes       = require('./modules/auth/auth.routes');
const customersRoutes  = require('./modules/customers/customers.routes');
const categoriesRoutes = require('./modules/categories/categories.routes');
const productsRoutes   = require('./modules/products/products.routes');
const stockRoutes      = require('./modules/stock/stock.routes');
const salesRoutes      = require('./modules/sales/sales.routes');
const reportsRoutes    = require('./modules/reports/reports.routes');
const tenantsRoutes    = require('./modules/tenants/tenants.routes');

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.disable('x-powered-by');

app.use(cors({
  origin: (origin, cb) => {
    const allowed = [env.corsOrigin, 'http://localhost:3000', 'http://127.0.0.1:3000'];
    if (env.nodeEnv === 'development' && !origin) return cb(null, true);
    if (!origin || allowed.includes(origin)) return cb(null, true);
    cb(new Error('Origem não permitida pelo CORS.'));
  },
  methods:        ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10kb' }));
app.use(globalRateLimiter);

// ── Arquivos estáticos do frontend ───────────────────────────────────────────
const frontendDir = path.join(__dirname, '..', '..', 'frontend');
app.use(express.static(frontendDir));

// ── API ──────────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use('/api/auth',       authRoutes);
app.use('/api/customers',  customersRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/products',   productsRoutes);
app.use('/api/stock',      stockRoutes);
app.use('/api/sales',      salesRoutes);
app.use('/api/reports',    reportsRoutes);
app.use('/api/tenants',    tenantsRoutes);

app.use('/api', (_req, res) => res.status(404).json({ message: 'Rota não encontrada.' }));

// ── Frontend SPA catch-all ────────────────────────────────────────────────────
app.get('/', (_req, res) => res.sendFile(path.join(frontendDir, 'index.html')));

app.use(errorHandler);

module.exports = app;
