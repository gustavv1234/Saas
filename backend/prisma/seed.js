'use strict';

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (!adminPassword || adminPassword.trim().length < 8) {
    console.error('[SEED] Erro: SEED_ADMIN_PASSWORD não definida ou muito curta (mínimo 8 caracteres).');
    console.error('[SEED] Configure a variável no .env antes de rodar o seed.');
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { username: 'admin' } });

  if (existing) {
    console.log('[SEED] Usuário admin já existe — nenhuma ação necessária.');
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.create({
    data: {
      username: 'admin',
      passwordHash,
      role: 'admin',
      active: true,
    },
  });

  console.log('[SEED] Usuário admin criado com sucesso.');
  console.log('[SEED] IMPORTANTE: troque a senha após o primeiro login (funcionalidade a implementar).');
}

main()
  .catch((err) => {
    console.error('[SEED] Erro inesperado:', err.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
