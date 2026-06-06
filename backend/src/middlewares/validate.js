'use strict';

/**
 * Cria um objeto de erro com statusCode para uso no errorHandler global.
 * @param {string} message - Mensagem amigável para o cliente.
 * @param {number} statusCode - Código HTTP (padrão: 400).
 */
function createError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

/**
 * Middleware factory: envolve uma função de validação em um middleware Express.
 * A função de validação deve lançar erros criados com createError() em caso de falha.
 *
 * @param {Function} validatorFn - Função (body) => void que valida req.body.
 */
function validate(validatorFn) {
  return (req, res, next) => {
    try {
      validatorFn(req.body);
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { createError, validate };
