# ESPECIFICAÇÃO TÉCNICA OFICIAL (BLUEPRINT DE ENGENHARIA)
**Projeto:** Plataforma Orbitalis  
**Versão:** 1.0.0  
**Contexto:** Sistema de Gestão de Ativos e Manutenção (CMMS) focado em Climatização.

---

## 1. VISÃO GERAL E REGRAS DE NEGÓCIO CORE

A plataforma Orbitalis gerencia a operação de manutenção de campo seguindo uma hierarquia rígida de dados: 
**Cliente (Documento Único) -> Ambiente -> Equipamento -> Ordem de Serviço (O.S.)**.

### Perfis de Acesso (RBAC):
1. **Administrador (Painel Web):** Controle total de cadastros, automação de agendas preventivas e emissão de relatórios legais (PMOC).
2. **Cliente (Portal Web):** Abertura de chamados corretivos de urgência e consulta ao histórico de seus ambientes.
3. **Técnico (Aplicativo Mobile):** Execução de ordens de serviço em campo via leitura de QR Code, operando em regime **Offline-First**.

---

## 2. IDENTIDADE VISUAL E DESIGN SYSTEM (UI/UX)

Devem ser utilizados estes tokens hexadecimais exatos para estilização de interfaces (Web e Mobile), respeitando as regras de contraste WCAG para leitura em campo sob luz solar.

### Elementos de Branding:
* **Logotipo:** Palavra **Orbitalis** com a letra "O" estilizada contendo um anel orbital e um **QR Code embutido**.
* **Tagline:** "DADOS EM ÓRBITA. MANUTENÇÃO EM DIA."

### Tokens de Cores e Semântica:
* **Roxo Escuro (`#480058`):** Identidade primária. Utilizado em sidebars, headers e tipografia principal sobre fundos claros.
* **Azul Orbital (`#4B75FF`):** Cor de ação. Utilizado em botões primários (ex: "Criar O.S."), links ativos e badge de status `OPERANDO` (Concluído).
* **Carmesim (`#B71247`):** Ações destrutivas e badge de status `CRÍTICO` ou `ATRASADO`. O texto interno deve ser **Branco**.
* **Amarelo (`#EDD82A`):** Badge de status `ATENÇÃO` ou `EM ANDAMENTO`. **Obrigatório:** O texto sobre este fundo deve ser Roxo Escuro (`#480058`). Nunca usar texto branco aqui.
* **Salmão/Coral (`#FF997E`):** Badge de status `AGENDADO` (Preventivas automáticas). O texto sobre este fundo deve ser Roxo Escuro (`#480058`).

---

## 3. ARQUITETURA DE SOFTWARE & STACK

O backend deve seguir o padrão de **Arquitetura Modular**, isolando os domínios para escalabilidade.

### Tecnologias Homologadas:
* **Banco de Dados:** PostgreSQL (Uso nativo de indexação de `UUID` e estruturas maleáveis via `JSONB`).
* **Backend API:** Node.js com TypeScript (Fastify ou NestJS). Validação estrita de inputs via DTOs (Zod ou Class-Validator) em todas as rotas.
* **Frontend Web:** React.js ou Next.js (Grid responsivo).
* **Aplicativo Móvel:** Flutter ou React Native com banco relacional embutido (SQLite / WatermelonDB).
* **Storage de Mídias:** Object Storage (AWS S3 ou compatível). O banco de dados grava apenas strings de URLs absolutas.
* **Tempo Real:** WebSockets para contadores do Admin e Firebase Cloud Messaging (FCM) para gatilhos de sincronização em background no celular do técnico.

---

## 4. MODELAGEM FÍSICA DO BANCO DE DADOS (POSTGRESQL)

Todas as chaves primárias e estrangeiras utilizam obrigatoriamente `UUIDv4`.

Para o **Claude Code** (ou qualquer IA de desenvolvimento), o melhor formato absoluto é um arquivo **Markdown (`.md`) limpo, direto e sem conversas textuais**, para que ele possa ler o arquivo de uma vez só e começar a codificar a estrutura imediatamente.

Crie um arquivo chamado `schema_blueprint.md` na raiz do seu projeto e cole o conteúdo exato do bloco abaixo:

```markdown
# ESPECIFICAÇÃO TÉCNICA OFICIAL (BLUEPRINT DE ENGENHARIA)
**Projeto:** Plataforma Orbitalis  
**Versão:** 1.0.0  
**Contexto:** Sistema de Gestão de Ativos e Manutenção (CMMS) focado em Climatização.

---

## 1. VISÃO GERAL E REGRAS DE NEGÓCIO CORE

A plataforma Orbitalis gerencia a operação de manutenção de campo seguindo uma hierarquia rígida de dados: 
**Cliente (Documento Único) -> Ambiente -> Equipamento -> Ordem de Serviço (O.S.)**.

### Perfis de Acesso (RBAC):
1. **Administrador (Painel Web):** Controle total de cadastros, automação de agendas preventivas e emissão de relatórios legais (PMOC).
2. **Cliente (Portal Web):** Abertura de chamados corretivos de urgência e consulta ao histórico de seus ambientes.
3. **Técnico (Aplicativo Mobile):** Execução de ordens de serviço em campo via leitura de QR Code, operando em regime **Offline-First**.

---

## 2. IDENTIDADE VISUAL E DESIGN SYSTEM (UI/UX)

Devem ser utilizados estes tokens hexadecimais exatos para estilização de interfaces (Web e Mobile), respeitando as regras de contraste WCAG para leitura em campo sob luz solar.

### Elementos de Branding:
* **Logotipo:** Palavra **Orbitalis** com a letra "O" estilizada contendo um anel orbital e um **QR Code embutido**.
* **Tagline:** "DADOS EM ÓRBITA. MANUTENÇÃO EM DIA."

### Tokens de Cores e Semântica:
* **Roxo Escuro (`#480058`):** Identidade primária. Utilizado em sidebars, headers e tipografia principal sobre fundos claros.
* **Azul Orbital (`#4B75FF`):** Cor de ação. Utilizado em botões primários (ex: "Criar O.S."), links ativos e badge de status `OPERANDO` (Concluído).
* **Carmesim (`#B71247`):** Ações destrutivas e badge de status `CRÍTICO` ou `ATRASADO`. O texto interno deve ser **Branco**.
* **Amarelo (`#EDD82A`):** Badge de status `ATENÇÃO` ou `EM ANDAMENTO`. **Obrigatório:** O texto sobre este fundo deve ser Roxo Escuro (`#480058`). Nunca usar texto branco aqui.
* **Salmão/Coral (`#FF997E`):** Badge de status `AGENDADO` (Preventivas automáticas). O texto sobre este fundo deve ser Roxo Escuro (`#480058`).

---

## 3. ARQUITETURA DE SOFTWARE & STACK

O backend deve seguir o padrão de **Arquitetura Modular**, isolando os domínios para escalabilidade.

### Tecnologias Homologadas:
* **Banco de Dados:** PostgreSQL (Uso nativo de indexação de `UUID` e estruturas maleáveis via `JSONB`).
* **Backend API:** Node.js com TypeScript (Fastify ou NestJS). Validação estrita de inputs via DTOs (Zod ou Class-Validator) em todas as rotas.
* **Frontend Web:** React.js ou Next.js (Grid responsivo).
* **Aplicativo Móvel:** Flutter ou React Native com banco relacional embutido (SQLite / WatermelonDB).
* **Storage de Mídias:** Object Storage (AWS S3 ou compatível). O banco de dados grava apenas strings de URLs absolutas.
* **Tempo Real:** WebSockets para contadores do Admin e Firebase Cloud Messaging (FCM) para gatilhos de sincronização em background no celular do técnico.

---

## 4. MODELAGEM FÍSICA DO BANCO DE DADOS (POSTGRESQL)

Todas as chaves primárias e estrangeiras utilizam obrigatoriamente `UUIDv4`.


```

[usuarios] ───1:1───> [clientes] ───1:N───> [ambientes] ───1:N───> [equipamentos]
│                      │
│                      │
1:N                    1:N
│                      │
▼                      ▼
[ordens_servico] ──1:N──> [ordem_servico_itens]

```

### `usuarios`
* `id` UUID PRIMARY KEY
* `email` VARCHAR(255) UNIQUE NOT NULL
* `senha_hash` VARCHAR(255) NOT NULL
* `tipo` ENUM('admin', 'tecnico', 'cliente') NOT NULL
* `data_criacao` TIMESTAMP DEFAULT NOW()

### `clientes`
* `id` UUID PRIMARY KEY
* `usuario_id` UUID FOREIGN KEY -> `usuarios.id` NULLABLE
* `documento` VARCHAR(14) UNIQUE NOT NULL
* `razao_social` VARCHAR(255) NOT NULL
* `nome_fantasia` VARCHAR(255) NULLABLE
* `endereco` TEXT NOT NULL
* `deleted_at` TIMESTAMP NULLABLE

### `ambientes`
* `id` UUID PRIMARY KEY
* `cliente_id` UUID FOREIGN KEY -> `clientes.id` NOT NULL
* `nome` VARCHAR(100) NOT NULL
* `metros_quadrados` DECIMAL(10,2) NOT NULL
* `capacidade_termica` VARCHAR(50) NOT NULL
* `localizacao_interna` TEXT NOT NULL
* `deleted_at` TIMESTAMP NULLABLE

### `equipamentos`
* `id` UUID PRIMARY KEY
* `ambiente_id` UUID FOREIGN KEY -> `ambientes.id` NOT NULL
* `codigo_qr` VARCHAR(50) UNIQUE INDEXED NOT NULL
* `nome` VARCHAR(100) NOT NULL
* `marca` VARCHAR(100) NOT NULL
* `modelo` VARCHAR(100) NOT NULL
* `numero_serie` VARCHAR(100) NOT NULL
* `tipo_equipamento` VARCHAR(100) NOT NULL
* `deleted_at` TIMESTAMP NULLABLE

### `modelos_checklist`
* `id` UUID PRIMARY KEY
* `nome` VARCHAR(150) NOT NULL
* `itens` JSONB NOT NULL

### `ordens_servico`
* `id` UUID PRIMARY KEY
* `ambiente_id` UUID FOREIGN KEY -> `ambientes.id` NOT NULL
* `tecnico_id` UUID FOREIGN KEY -> `usuarios.id` NULLABLE
* `status` ENUM('aberta', 'agendada', 'em_andamento', 'concluida', 'cancelada') NOT NULL INDEXED
* `origem` ENUM('manual_admin', 'preventiva_automatica', 'portal_cliente') NOT NULL
* `assinatura_url` VARCHAR(512) NULLABLE
* `observacoes_gerais` TEXT NULLABLE
* `data_agendamento` TIMESTAMP NOT NULL
* `data_inicio` TIMESTAMP NULLABLE
* `data_conclusao` TIMESTAMP NULLABLE

### `ordem_servico_itens`
* `id` UUID PRIMARY KEY
* `ordem_servico_id` UUID FOREIGN KEY -> `ordens_servico.id` ON DELETE CASCADE NOT NULL
* `equipamento_id` UUID FOREIGN KEY -> `equipamentos.id` NOT NULL
* `status_item` ENUM('pendente', 'concluido') NOT NULL DEFAULT 'pendente'
* `checklist_snapshot` JSONB NOT NULL
* `observacoes_tecnicas` TEXT NULLABLE

---

## 5. MATRIZ DE ROTAS DA API REST (V1)

Prefixo global obrigatório: `/api/v1`. Todas as rotas privadas exigem header `Authorization: Bearer <token>`.

### Autenticação e Utilitários (`/auth`)
* `POST /auth/login` -> Valida credenciais e emite JWT com payload contendo a claim `role`.
* `PATCH /equipamentos/:id/substituir-qr` -> **[Admin]** Substitui a string `codigo_qr` de um ativo caso a etiqueta física sofra dano, mantendo intacto todo o histórico de manutenções anteriores.

### Cadastros do Backoffice (`/clientes`, `/ambientes`, `/equipamentos`)
* `GET /clientes/consulta-cnpj/:cnpj` -> **[Admin]** Proxy para API externa da Receita Federal para autocompletar dados.
* `POST /clientes` -> **[Admin]** Insere cliente e gera gatilho para credenciais do usuário correspondente.
* `POST /ambientes` -> **[Admin]** Associa área física ao cliente.
* `POST /equipamentos` -> **[Admin]** Cria ativo e injeta o hash do QR Code gerado internamente.

### Fluxo de Trabalho e Automação (`/ordens-servico`)
* `POST /ordens-servico` -> **[Admin/Cliente]** Abre registro pai de O.S. Se disparado pelo Portal do Cliente, define a origem como `portal_cliente` e status inicial como `aberta`.
* `GET /ordens-servico/painel` -> **[Admin]** Retorna agregações de contagem por status para os widgets do dashboard.
* `GET /ordens-servico/tecnico/:tecnico_id` -> **[Técnico]** Alimenta a fila mobile (retorna apenas estados `aberta` ou `em_andamento`).
* `PATCH /ordens-servico/:id/sincronizar` -> **[Técnico]** Recebe o lote de dados de execução colhidos offline pelo aplicativo móvel.
* `POST /ordens-servico/evidencias/presigned-url` -> **[Técnico]** Emite URLs seguras e temporárias para que o app envie fotos e assinaturas diretamente para o bucket S3.
* `GET /relatorios/pmoc/:cliente_id` -> **[Admin]** Compila os checklists executados no mês/ano e gera o PDF do PMOC padronizado para a vigilância sanitária.

---

## 6. DIRETRIZES OBRIGATÓRIAS DE ENGENHARIA

### 6.1 Elasticidade Granular (O.S. Relação 1:N)
A Ordem de Serviço é emitida para o **Ambiente** e não para uma máquina isolada. Ao criar uma O.S., o backend deve varrer os equipamentos daquele ambiente e criar registros filhos na tabela `ordem_servico_itens`. O técnico responde um checklist por equipamento, mas o fechamento e a coleta de assinatura ocorrem em uma **única assinatura digital** na tabela pai `ordens_servico`.

### 6.2 Snapshot Estático de Checklist
No momento em que a O.S. passa para o estado `aberta`, o backend deve fazer uma cópia profunda (deep copy) do layout do checklist atual da tabela `modelos_checklist` e persistir dentro do campo `checklist_snapshot` da tabela filha `ordem_servico_itens`. Alterações futuras no modelo pai não podem afetar O.S. antigas.

### 6.3 Sincronização Mobile Offline-First
O aplicativo mobile salvará todas as mutações de campo localmente no banco SQLite definindo a flag `sincronizado = false`. O app monitorará o estado da rede. Assim que detectar internet estável, despachará sequencialmente a fila de alterações para o endpoint `/sincronizar` da API.

### 6.4 Concorrência e Conflito de Estados
Caso o Administrador cancele uma O.S. via painel web enquanto o técnico executa o serviço offline, o endpoint `/sincronizar` deve:
1. Abrir uma transação isolada no banco de dados.
2. Verificar o status ativo. Se estiver como `cancelada`, dar rollback e retornar `409 Conflict`.
3. Salvar o payload rejeitado do técnico na tabela de log `auditoria_conflitos_sincronizacao`, salvando o relatório escrito pelo técnico de campo e limpando o cache do aparelho.

### 6.5 Camada Global de Soft Delete
Fica proibido o uso de comandos `DELETE` diretos nas tabelas `clientes`, `ambientes` e `equipamentos`. Requisições de exclusão disparam comandos de `UPDATE ... SET deleted_at = NOW()`. O ORM do backend deve interceptar todas as queries de leitura (`GET` / `SELECT`) e injetar a cláusula restritiva `WHERE deleted_at IS NULL`.

---

## 7. BACKLOG DE HISTÓRIAS DE USUÁRIO (USER STORIES)

### 7.1 Painel Administrativo Web
* **US01 [CNPJ Automático]:** Como Admin, quero inserir o CNPJ do cliente para que o sistema consulte APIs públicas e preencha os dados cadastrais automaticamente.
* **US02 [Cadastro de Ambientes]:** Como Admin, quero cadastrar as áreas físicas informando m² e capacidade térmica total para subsidiar os relatórios de fiscalização.
* **US03 [Identificadores QR]:** Como Admin, quero cadastrar ativos, gerando hashes curtos exclusivos (`codigo_qr`) e exportar o layout para impressão física de etiquetas.
* **US04 [Montador de Checklists]:** Como Admin, quero estruturar templates de verificação em formato JSONB, definindo quais tarefas são de preenchimento obrigatório pelo técnico.
* **US05 [Motor de Cron Preventivo]:** Como Admin, quero vincular planos de manutenção recorrentes aos ativos para que um script Cron automatizado (executado diariamente às 00:00:01) gere as O.S. preventivas em estado `agendada`.
* **US06 [Cockpit em Tempo Real]:** Como Admin, quero monitorar os contadores de chamados em um painel que atualize dinamicamente via WebSockets utilizando as cores semânticas estabelecidas.
* **US07 [Triagem de Chamados]:** Como Admin, quero avaliar chamados abertos por clientes, definir o técnico responsável, estipular a data e despachar a O.S. para a fila de campo.

### 7.2 Aplicativo Móvel do Técnico
* **US08 [Agenda Sincronizada]:** Como Técnico, quero realizar login para carregar minha fila de trabalho contendo apenas chamados em estado `aberta` ou `em_andamento` destinados ao meu ID.
* **US09 [Escaneamento de QR Code]:** Como Técnico, quero acionar a câmera do app para ler o QR Code de uma máquina e abrir imediatamente a tela de preenchimento do checklist correspondente.
* **US10 [Time Tracking]:** Como Técnico, quero clicar em "Iniciar Serviço" para gravar o timestamp de início real do atendimento e transicionar o status da O.S. para `em_andamento`.
* **US11 [Validação de Obrigatoriedade]:** Como Técnico, quero preencher as medições do checklist sabendo que o aplicativo bloqueará o encerramento do chamado se houver itens obrigatórios pendentes.
* **US12 [Fechamento com Evidências]:** Como Técnico, quero tirar fotos do ativo, digitar minhas notas diagnósticas e coletar a assinatura digital do cliente na tela do celular para transmitir a conclusão da O.S. para o servidor.

```