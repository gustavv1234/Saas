'use strict';

const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Middleware de autenticação JWT.
 * Exige header: Authorization: Bearer <token>
 * Adiciona req.user = { id, username, role } se válido.
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Acesso não autorizado.' });
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.user = {
      id:       payload.id,
      username: payload.username,
      role:     payload.role,
    };
    next();
  } catch (err) {
    // Não expõe detalhes do erro de JWT ao cliente
    return res.status(401).json({ message: 'Token inválido ou expirado. Faça login novamente.' });
  }
}

module.exports = authMiddleware;
