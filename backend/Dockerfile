# =============================================================================
# Gestão Autopeças — Dockerfile (multi-stage build)
# Node.js 20 LTS Alpine para imagem enxuta.
# NÃO roda como root — usa o usuário "node" nativo da imagem base.
# =============================================================================

# ── Stage 1: instalar dependências ──────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

COPY package*.json ./
# Instala TODAS as dependências (incluindo dev) pois precisamos do
# prisma CLI (devDependency) para rodar migrations no entrypoint.
RUN npm ci --ignore-scripts

# ── Stage 2: gerar Prisma Client ─────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Gera o Prisma Client com base no schema
RUN npx prisma generate

# ── Stage 3: imagem de produção ──────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

# Cria diretório de dados para o SQLite antes de trocar de usuário
RUN mkdir -p /app/data && chown -R node:node /app

# Copia apenas o necessário da stage de build
COPY --chown=node:node --from=build /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/src         ./src
COPY --chown=node:node --from=build /app/prisma      ./prisma
COPY --chown=node:node --from=build /app/server.js   ./
COPY --chown=node:node --from=build /app/package.json ./

# Não roda como root
USER node

EXPOSE 3000

# Aplica migrations pendentes (idempotente) e inicia o servidor
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node server.js"]
