# CheckMesa

Aplicação web de gestão de sala para staff de restauração. Optimizada para uso em tablet e telemóvel durante o serviço.

## Funcionalidades

| Área | Descrição |
|---|---|
| **Backoffice (`/admin`)** | Gestão de utilizadores, mesas e catálogo de produtos com cálculo automático de IVA |
| **Frontoffice (`/sala`)** | Mapa de mesas, lançamento de pedidos, consulta e divisão de conta |

## Stack Tecnológica

| Tecnologia | Versão | Papel |
|---|---|---|
| Next.js | 14+ (App Router) | Framework fullstack |
| TypeScript | 5+ | Linguagem |
| Prisma | 5+ | ORM |
| SQLite | — | Base de dados local |
| NextAuth.js | 4+ | Autenticação |
| Tailwind CSS | 3+ | Estilos (mobile-first) |
| bcryptjs | — | Hash de passwords |

> Decisão documentada em [ADR-0001](docs/adr/0001-stack-selection.md).

## Regras de Negócio

### IVA (Portugal)
- **Prato** → `basePrice = finalPrice / 1.13` · vatRate = 13%
- **Bebida** → `basePrice = finalPrice / 1.23` · vatRate = 23%
- A base de dados guarda: `finalPrice`, `basePrice`, `vatAmount`, `vatRate`

### Divisão de Conta
- **Por Pessoas** → `total / N` (default)
- **Por Consumo** → seleção manual de itens inteiros por pessoa

## Estrutura de Ficheiros

```
checkmesa/
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── src/
│   └── app/
│       ├── (auth)/login/
│       ├── admin/
│       │   ├── users/
│       │   ├── tables/
│       │   └── products/
│       ├── sala/
│       │   ├── page.tsx              # Mapa de mesas
│       │   └── [tableId]/
│       │       ├── page.tsx          # Pedidos
│       │       └── consulta/page.tsx # Fatura + divisão
│       └── api/
│           ├── auth/[...nextauth]/
│           ├── users/
│           ├── tables/
│           ├── products/
│           ├── sessions/
│           └── order-items/
├── src/components/
├── src/lib/
│   ├── prisma.ts       # Singleton Prisma client
│   ├── auth.ts         # NextAuth config + login rate limiter
│   ├── auth-guard.ts   # requireAuth / requireRole API guard
│   ├── schemas.ts      # Zod validation schemas (all routes)
│   └── vat.ts          # Cálculo IVA
├── middleware.ts     # Protecção de rotas
├── Dockerfile
├── docker-compose.yml
├── docs/adr/
└── mockups.html
```

## Desenvolvimento

```bash
# Instalar dependências
npm install

# Setup base de dados
npx prisma migrate dev --name init
npx prisma db seed

# Servidor de desenvolvimento
npm run dev
```

## Docker (desenvolvimento local)

```bash
docker compose up --build
```

A aplicação fica disponível em `http://localhost:3000`.  
O ficheiro SQLite é persistido em volume Docker: `checkmesa-db:/data/prod.db`.

## Deployment (Orange Pi)

O pipeline CI/CD está em `.github/workflows/deploy.yml`. A cada push em `main`:

1. Corre os testes num runner GitHub-hosted (`ubuntu-latest`)
2. O runner self-hosted no Orange Pi faz checkout do código, constrói a imagem Docker nativamente (ARM64) e reinicia o container

### Configuração inicial no Orange Pi

```bash
# 1. Instalar e registar o runner self-hosted
#    (GitHub → Settings → Actions → Runners → New self-hosted runner)
#    Adicionar as labels: self-hosted, linux, arm64

# 2. Adicionar o utilizador do runner ao grupo docker
sudo usermod -aG docker $USER
```

### Secrets necessários no GitHub (Settings → Secrets → Actions)

| Secret | Descrição |
|---|---|
| `NEXTAUTH_SECRET` | Segredo aleatório de 32+ chars para assinatura de sessões |

```bash
# Gerar um segredo seguro:
openssl rand -base64 32
```

### Monitorização do container

O `Dockerfile` inclui uma instrução `HEALTHCHECK` nativa que sonda `/api/health` de 30 em 30 segundos. O estado é visível directamente em `docker ps`:

```
CONTAINER ID   IMAGE        STATUS                    PORTS
a1b2c3d4e5f6   checkmesa    Up 2 minutes (healthy)    0.0.0.0:3000->3000/tcp
```

| Estado | Significado |
|---|---|
| `(health: starting)` | Dentro do período de graça inicial (30 s) — migrações ainda em curso |
| `(healthy)` | `/api/health` respondeu `{"status":"ok"}` nas últimas 3 sondagens |
| `(unhealthy)` | 3 falhas consecutivas — container deve ser reiniciado |

Para inspecionar o histórico de sondagens:

```bash
docker inspect --format='{{json .State.Health}}' checkmesa | jq
```

> Ver [ADR-0005](docs/adr/0005-deploy-orange-pi-ssh.md) para a decisão arquitectural completa.

## Diagramas UML

| Diagrama | Tipo | Ficheiro |
|---|---|---|
| Arquitectura de Componentes | Component | [docs/diagrams/component.md](docs/diagrams/component.md) |
| Modelo de Dados | ER Diagram | [docs/diagrams/data-model.md](docs/diagrams/data-model.md) |
| Fluxo de Autenticação | Sequence | [docs/diagrams/auth-sequence.md](docs/diagrams/auth-sequence.md) |
| Ciclo de Vida de Pedido | Sequence | [docs/diagrams/order-lifecycle-sequence.md](docs/diagrams/order-lifecycle-sequence.md) |
| Estados de Mesa / Sessão | State Machine | [docs/diagrams/state-machines.md](docs/diagrams/state-machines.md) |

> Todos os diagramas estão em sintaxe **Mermaid.js** e renderizam nativamente no GitHub, GitLab e VS Code.

## Decisões de Arquitectura

| ADR | Título | Estado |
|---|---|---|
| [0001](docs/adr/0001-stack-selection.md) | Stack Selection | Aceite |
| [0002](docs/adr/0002-prisma-v5-downgrade.md) | Prisma v5 Downgrade | Aceite |
| [0003](docs/adr/0003-test-suite.md) | Test Suite (Jest + RTL) | Aceite |
| [0004](docs/adr/0004-auth-guard-centralisation.md) | Centralised Auth Guard | Aceite |
| [0005](docs/adr/0005-deploy-orange-pi-ssh.md) | Deploy Orange Pi Self-Hosted Runner | Aceite |
