# Orbitalis — Guia de Deploy (Railway + Vercel)

## 1. Backend — Railway

### Pré-requisitos
- Conta em [railway.app](https://railway.app)
- CLI do Railway: `npm i -g @railway/cli`

### Passos

1. **Criar projeto no Railway**
   ```bash
   cd orbitalis-api
   railway login
   railway init
   ```

2. **Adicionar PostgreSQL**
   - No painel Railway → New → Database → PostgreSQL
   - A variável `DATABASE_URL` é injetada automaticamente

3. **Configurar variáveis de ambiente**
   No Railway → Variables, adicionar (modelo completo em `orbitalis-api/.env.example`):
   ```
   JWT_SECRET=<gere com: openssl rand -base64 32>   # OBRIGATÓRIA: a API não sobe sem ela
   JWT_EXPIRES_IN=8h
   NODE_ENV=production
   FRONTEND_URL=https://www.orbitalis.com.br
   ```
   Opcionais (a funcionalidade fica desativada se faltarem): `SMTP_*` e `ADMIN_EMAIL` (e-mails),
   `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` (Google Agenda),
   `EVOLUTION_API_URL` / `EVOLUTION_API_KEY` / `EVOLUTION_INSTANCE` (WhatsApp) e `S3_*` (evidências).

4. **Deploy**
   ```bash
   # ⚠️ IMPORTANTE: rodar de DENTRO de orbitalis-api/, não do repo root
   # O Root Directory no Railway está vazio — o Railway usa o diretório que você envia
   cd orbitalis-api
   railway up
   ```
   O `railway.json` já configura:
   - Build: via `Dockerfile` (instala dependências, `prisma generate` e `npm run build`)
   - Start: `npx prisma migrate deploy && node dist/src/main` (aplica só as migrações versionadas em `prisma/migrations`; nunca usa `db push`)

   > Para re-deploys futuros: `cd orbitalis-api && railway up`
   > **Auto-deploy via GitHub**: se quiser auto-deploy no push, configure no painel Railway →
   > Settings → Source → Root Directory: `orbitalis-api`; após isso use `railway up` da raiz do repo.

5. **Seed inicial (uma vez)**
   ```bash
   railway run npx ts-node prisma/seed.ts
   ```
   Cria admin, técnico e cliente de demonstração.

6. **Anotar a URL do backend**
   Exemplo: `https://orbitalis-api.up.railway.app`

---

## 2. Frontend — Vercel

### Passos

1. **Criar projeto no Vercel**
   - Importar o repositório pelo painel [vercel.com](https://vercel.com)
   - **Root Directory:** `orbitalis-web`
   - Framework: Next.js (detectado automaticamente)

2. **Configurar variável de ambiente**
   ```
   NEXT_PUBLIC_API_URL=https://orbitalis-api.up.railway.app/api/v1
   ```
   (usar a URL obtida no passo 6 do Railway)

3. **Deploy**
   - Vercel faz build automático a cada push para `master`
   - O build usa `next build --webpack` (o `next-pwa` não é compatível com o Turbopack do Next 16)

---

## 3. Credenciais padrão após seed

| Perfil  | E-mail                        | Senha        |
|---------|-------------------------------|--------------|
| Admin   | admin@orbitalis.app           | Admin@2026   |
| Técnico | joao.silva@orbitalis.app      | Tecnico@2026 |
| Cliente | contato@frigocenter.com.br    | Cliente@2026 |

> Altere as senhas em produção imediatamente após o primeiro login.

---

## 4. Checklist pós-deploy

- [ ] Acessar `/login` e logar como admin
- [ ] Verificar cockpit em `/dashboard`
- [ ] Criar cliente via `/clientes/novo`
- [ ] Criar ambiente via `/ambientes/novo`
- [ ] Criar equipamento via `/equipamentos/novo`
- [ ] Criar plano preventivo via `/planos-manutencao/novo`
- [ ] Abrir O.S. manual via `/ordens-servico/nova`
- [ ] Fazer triagem de O.S. (despachar técnico)
