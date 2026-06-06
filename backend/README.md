# Gestão Autopeças — Backend

API REST para o sistema interno de gestão de loja de autopeças.

---

## Stack

| Camada       | Tecnologia                          |
|--------------|-------------------------------------|
| Runtime      | Node.js 20 LTS                      |
| Framework    | Express.js                          |
| ORM          | Prisma                              |
| Banco local  | SQLite (arquivo `.db`)              |
| Banco VPS    | PostgreSQL (migração simples)       |
| Auth         | JWT (`jsonwebtoken`) + `bcryptjs`   |
| Container    | Docker + Docker Compose             |

---

## Pré-requisitos (sem Docker)

- Node.js 20+
- npm 9+

## Rodar localmente (sem Docker)

```bash
# 1. Instalar dependências
cd backend
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Edite .env: defina JWT_SECRET, SEED_ADMIN_PASSWORD e revise os demais valores

# 3. Criar o banco e rodar a migration inicial
npm run db:migrate

# 4. Criar o usuário admin
npm run db:seed

# 5. Iniciar em modo desenvolvimento (hot reload)
npm run dev
# → API disponível em http://localhost:3000
```

> Para acessar o frontend no navegador: abra `frontend/index.html` diretamente  
> ou sirva a pasta com `python3 -m http.server 8080` na raiz do projeto.

---

## Rodar com Docker

```bash
cd backend

# 1. Copiar e configurar o .env
cp .env.example .env
# Edite .env: defina JWT_SECRET e SEED_ADMIN_PASSWORD obrigatoriamente

# 2. Subir o container em background
docker-compose up -d

# 3. Criar o usuário admin (apenas na primeira vez)
docker-compose exec backend node prisma/seed.js

# 4. Verificar que está rodando
curl http://localhost:3000/api/health
```

O frontend é servido automaticamente em `http://localhost:3000` (volume montado do diretório `../frontend`).

**Comandos úteis:**
```bash
docker-compose logs -f          # ver logs em tempo real
docker-compose down             # parar e remover containers
docker-compose down -v          # parar e remover volumes (apaga o banco!)
```

---

## Endpoints

### Público

| Método | Rota              | Descrição              |
|--------|-------------------|------------------------|
| GET    | `/api/health`     | Health check           |
| POST   | `/api/auth/login` | Autenticação → JWT     |

### Protegidos (exigem `Authorization: Bearer <token>`)

| Método | Rota                  | Descrição                          |
|--------|-----------------------|------------------------------------|
| POST   | `/api/customers`      | Cadastrar novo cliente             |
| GET    | `/api/customers`      | Listar clientes (paginado)         |
| GET    | `/api/customers/:id`  | Buscar cliente por ID              |
| PUT    | `/api/customers/:id`  | Atualizar cliente                  |
| DELETE | `/api/customers/:id`  | Desativar cliente (soft delete)    |

**Query params de listagem:** `page`, `limit` (máx. 100), `search` (por nome), `active`.

---

## Variáveis de Ambiente

| Variável              | Obrigatória | Descrição                                               |
|-----------------------|:-----------:|---------------------------------------------------------|
| `DATABASE_URL`        | ✓           | URL do banco (SQLite: `file:./data/gestao.db`)          |
| `JWT_SECRET`          | ✓           | Segredo JWT — mínimo 32 chars, longo e aleatório        |
| `JWT_EXPIRES_IN`      |             | Expiração do token (padrão: `8h`)                       |
| `PORT`                |             | Porta do servidor (padrão: `3000`)                      |
| `NODE_ENV`            |             | `development` ou `production`                           |
| `CORS_ORIGIN`         |             | Origem permitida pelo CORS (padrão: `http://localhost:3000`) |
| `RATE_LIMIT_WINDOW_MS`|             | Janela do rate limit de login em ms (padrão: `900000`)  |
| `RATE_LIMIT_MAX`      |             | Máximo de tentativas de login por janela (padrão: `10`) |
| `SEED_ADMIN_PASSWORD` | seed only   | Senha do admin inicial — use apenas no seed              |

### Gerar um JWT_SECRET seguro

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Migrar para PostgreSQL

Quando for hospedar em VPS, apenas duas mudanças são necessárias:

**1. `prisma/schema.prisma`:**
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**2. `.env`:**
```env
DATABASE_URL="postgresql://user:password@host:5432/gestao_autopecas"
```

Em seguida, rode `npm run db:migrate` para aplicar o schema no novo banco.  
Nenhuma query de aplicação precisa ser alterada — o Prisma abstrai as diferenças.

---

## Segurança — decisões de projeto

- **Senhas sempre com bcrypt** (cost factor 12) — nunca em texto plano.
- **JWT sem persistência**: token apenas em memória no frontend, expira em 8h.
- **Rate limiting** na rota de login: 10 tentativas / 15 min por IP.
- **Timing attack prevention**: bcrypt.compare sempre executado, mesmo quando o usuário não existe.
- **Mensagens genéricas**: erros de autenticação nunca revelam qual campo falhou.
- **Soft delete**: clientes nunca são deletados fisicamente — apenas `active: false`.
- **Sem exposição de stack trace**: erros técnicos logados apenas no servidor.
- **`document` único**: CPF/CNPJ com constraint UNIQUE no banco.
- **Validação dupla**: frontend valida para UX; backend valida como barreira real.
- **HTTPS em produção**: o backend não gerencia TLS diretamente — configure um reverse proxy (nginx/Caddy) na frente para fornecer HTTPS.

> **O campo `role` existe no banco (`admin` / `operator`) mas não é verificado nas rotas nesta versão.**  
> Controle de permissões por perfil deverá ser implementado na próxima fase.

---

## Backup do banco SQLite

O banco é um arquivo em `backend/data/gestao-autopecas.db` (ou no volume Docker `sqlite_data`).  
**Faça backup regularmente** — basta copiar o arquivo:

```bash
cp backend/data/gestao-autopecas.db backup-$(date +%Y%m%d).db
```

Em Docker, o volume fica em `/var/lib/docker/volumes/backend_sqlite_data/_data/`.

---

## Estrutura do projeto

```
backend/
├── src/
│   ├── config/
│   │   ├── env.js             # Carrega e valida variáveis de ambiente
│   │   └── prisma.js          # Singleton do PrismaClient
│   ├── middlewares/
│   │   ├── auth.js            # Verificação de JWT
│   │   ├── errorHandler.js    # Tratamento global de erros
│   │   ├── rateLimiter.js     # Rate limiting (login + global)
│   │   └── validate.js        # createError() + validate() factory
│   ├── modules/
│   │   ├── auth/              # Login (service / controller / routes)
│   │   └── customers/         # CRUD de clientes (service / controller / routes)
│   ├── utils/
│   │   ├── validators.js      # CPF, CNPJ, telefone, e-mail
│   │   └── sanitize.js        # Limpeza de strings de entrada
│   └── app.js                 # Configuração do Express
├── prisma/
│   ├── schema.prisma          # Models: User, Customer
│   └── seed.js                # Cria usuário admin inicial
├── server.js                  # Entry point
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```
