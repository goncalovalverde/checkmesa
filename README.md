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

## Modelo de Dados

```
User            Table           Product
─────────────   ─────────────   ──────────────────────
id              id              id
name            name            name
email           capacity        category
passwordHash    status          type (DRINK|DISH)
role            └ FREE          finalPrice
└ ADMIN         └ OCCUPIED      basePrice
└ STAFF                         vatAmount
                                vatRate
                                active

TableSession    OrderItem
─────────────   ─────────────
id              id
tableId ──────► sessionId ──►
openedBy        productId ──►
consumers       quantity
status          unitPrice (snapshot)
└ OPEN          addedAt
└ CLOSED
openedAt
closedAt
```

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
│   ├── prisma.ts     # Singleton Prisma client
│   ├── auth.ts       # NextAuth config
│   └── vat.ts        # Cálculo IVA
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

## Docker

```bash
docker compose up --build
```

A aplicação fica disponível em `http://localhost:3000`.  
O ficheiro SQLite é persistido em volume Docker: `./prisma/dev.db`.

## Decisões de Arquitectura

| ADR | Título | Estado |
|---|---|---|
| [0001](docs/adr/0001-stack-selection.md) | Stack Selection | Aceite |
