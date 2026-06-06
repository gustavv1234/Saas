'use strict';

const authService = require('./auth.service');
const { sanitizeString } = require('../../utils/sanitize');

async function loginController(req, res, next) {
  try {
    const username = sanitizeString(req.body.username);
    // Senha: apenas garantir que é string; não trimmar (pode ter espaços intencionais)
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    const result = await authService.login(username, password);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { loginController };
