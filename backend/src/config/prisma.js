'use strict';

const { PrismaClient } = require('@prisma/client');

// Singleton: garante uma única conexão com o banco em toda a aplicação.
const prisma = new PrismaClient();

module.exports = prisma;
