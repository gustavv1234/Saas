'use strict';

const authService = require('./auth.service');

async function login(req, res, next) {
  try {
    const { username, password, tenantSlug } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Usuário e senha são obrigatórios.' });
    }
    const result = await authService.login({ username, password, tenantSlug: tenantSlug || null });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { login };
