'use strict';

// env.js deve ser o primeiro require: valida variáveis antes de qualquer outra coisa
const env = require('./src/config/env');
const app = require('./src/app');

const server = app.listen(env.port, () => {
  console.log(`[SERVER] Gestão Autopeças API iniciada`);
  console.log(`[SERVER] Porta: ${env.port} | Ambiente: ${env.nodeEnv}`);
  console.log(`[SERVER] Health check: http://localhost:${env.port}/api/health`);
});

// Graceful shutdown: fecha conexões abertas antes de encerrar
process.on('SIGTERM', () => {
  console.log('[SERVER] SIGTERM recebido — encerrando servidor...');
  server.close(() => {
    console.log('[SERVER] Servidor encerrado.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[SERVER] SIGINT recebido — encerrando servidor...');
  server.close(() => {
    console.log('[SERVER] Servidor encerrado.');
    process.exit(0);
  });
});
