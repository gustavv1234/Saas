'use strict';

// Mapeamento de códigos Prisma para respostas HTTP amigáveis.
// Referência: https://www.prisma.io/docs/reference/api-reference/error-reference
const PRISMA_ERRORS = {
  P2002: { status: 409, message: 'Já existe um registro com esses dados únicos.' },
  P2025: { status: 404, message: 'Registro não encontrado.'                      },
  P2003: { status: 400, message: 'Referência inválida entre registros.'           },
};

/**
 * Middleware global de tratamento de erros.
 * DEVE ser registrado como último middleware no app.js.
 *
 * Princípio: logar detalhes técnicos apenas no servidor,
 * retornar ao cliente apenas mensagens genéricas e amigáveis.
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  // Log completo no servidor (nunca exposto ao cliente)
  console.error(`[ERROR] ${new Date().toISOString()} ${req.method} ${req.path}`);
  console.error(err.stack || err.message);

  // Erros do Prisma (ORM)
  if (err.code && PRISMA_ERRORS[err.code]) {
    const { status, message } = PRISMA_ERRORS[err.code];
    return res.status(status).json({ message });
  }

  // Erros com statusCode definido (createError, validação, auth)
  if (err.statusCode) {
    const body = { message: err.message };
    if (err.validationErrors) body.errors = err.validationErrors;
    return res.status(err.statusCode).json(body);
  }

  // Erros de JWT (caso cheguem aqui sem serem tratados no middleware de auth)
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Token inválido ou expirado. Faça login novamente.' });
  }

  // Erros de parse do body (JSON malformado)
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Corpo da requisição inválido.' });
  }

  // Fallback: erro interno genérico (nunca expõe stack ao cliente)
  res.status(500).json({ message: 'Ocorreu um erro interno. Tente novamente em instantes.' });
}

module.exports = errorHandler;
