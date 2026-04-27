# ADR-0001: Stack Selection

**Data:** 2026-04-27  
**Estado:** Aceite  
**Decisores:** Arquitecto Fullstack

---

## Contexto

Necessidade de construir uma aplicação de gestão de sala para staff de restauração. Os requisitos chave são:

- Uso primário em **tablet e telemóvel** durante o serviço (touch-first)
- **Single-container deployment** — o cliente não tem infraestrutura de cloud
- **Multi-user** com autenticação por utilizador
- **Cálculo de IVA** conforme legislação portuguesa
- Equipa pequena → stack coesa, sem overhead operacional

## Decisão

Adoptar **Next.js 14 App Router + TypeScript + Prisma + SQLite + NextAuth.js + Tailwind CSS** num único container Docker.

## Alternativas Consideradas

| Alternativa | Razão para rejeição |
|---|---|
| React + Express separados | Dois processos, mais complexidade operacional |
| PostgreSQL | Requer servidor DB separado; SQLite é suficiente para carga single-restaurant |
| Remix | Ecossistema menor, menos recursos disponíveis |
| Prisma + MySQL | Desnecessário; SQLite cobre o volume esperado (<100 pedidos/dia) |
| Drizzle ORM | Prisma tem melhor DX e geração de tipos; Drizzle mais adequado para edge |

## Consequências

**Positivas:**
- Single binary deployment via Docker — sem dependências externas
- Prisma gera tipos TypeScript do schema → type-safety end-to-end
- Next.js App Router unifica API routes e UI no mesmo projecto
- SQLite persiste num ficheiro → backup trivial (copiar `dev.db`)
- Tailwind permite UI touch-friendly com utilitários de tamanho explícito

**Negativas / Riscos:**
- SQLite não suporta concorrência de escrita alta → aceitável para restaurante único
- Se escalar para multi-restaurante, migração para PostgreSQL necessária (Prisma torna isto simples)
- NextAuth v4 tem limitações com App Router → monitorizar v5 (Auth.js)

## Notas de Implementação

- `src/lib/prisma.ts` — singleton do PrismaClient para evitar múltiplas conexões em dev (hot reload)
- `src/lib/vat.ts` — função pura `calculateVat(finalPrice, type)` testável de forma isolada
- `middleware.ts` — protege `/admin` (role=ADMIN) e `/sala` (autenticado)
- Volume Docker mapeado para `./prisma/dev.db` para persistência entre restarts
