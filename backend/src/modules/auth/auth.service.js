'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../config/prisma');
const env = require('../../config/env');
const { createError } = require('../../middlewares/validate');

// Mensagem genérica: nunca revelar se o usuário existe ou não.
const GENERIC_AUTH_ERROR = 'Usuário ou senha inválidos.';

/**
 * Autentica um usuário e retorna um JWT em caso de sucesso.
 *
 * Proteção contra timing attacks: o hash é sempre comparado,
 * mesmo quando o usuário não existe (evita diferença de tempo
 * que revelaria quais usernames são válidos).
 */
async function login(username, password) {
  if (!username || !password) {
    throw createError(GENERIC_AUTH_ERROR, 401);
  }

  const user = await prisma.user.findUnique({ where: { username } });

  // Hash fictício com o custo correto — garante tempo constante quando usuário não existe.
  // O valor não coincide com nenhuma senha real (não começa com $2a$ válido do bcrypt).
  const DUMMY_HASH = '$2a$12$invalidhashusedtopreventtimingattacks00000000000000000';
  const hashToCompare = user ? user.passwordHash : DUMMY_HASH;

  let passwordMatch = false;
  try {
    passwordMatch = await bcrypt.compare(password, hashToCompare);
  } catch (_e) {
    // bcrypt.compare pode lançar se o hash for malformado — tratar como falha
    passwordMatch = false;
  }

  // Verificações em sequência para não revelar qual falhou
  if (!user || !passwordMatch || !user.active) {
    throw createError(GENERIC_AUTH_ERROR, 401);
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );

  return { token };
}

module.exports = { login };
