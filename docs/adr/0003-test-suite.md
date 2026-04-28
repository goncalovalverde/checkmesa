# ADR-0003: Test Suite — Jest + React Testing Library

**Date:** 2026-04-28
**Status:** Accepted
**Deciders:** Lead Engineer

---

## Context

The codebase had zero automated tests. Per the project's engineering standards, a minimum of 80% coverage is required. Three critical paths were identified for the initial scaffold:

1. `src/lib/vat.ts` — pure VAT calculation function (already flagged as testable in ADR-0001)
2. `src/components/sala/OrderItemRow.tsx` — order row interaction and line-total display
3. `src/components/sala/ProductGrid.tsx` — category filtering and product selection

## Decision

Adopt **Jest** with **`next/jest`** transform + **React Testing Library** for unit and component testing.

## Alternatives Considered

| Alternative | Reason for rejection |
|---|---|
| `ts-jest` | Brittle with Next.js internals and `moduleResolution: "bundler"`; `next/jest` is the official baseline |
| Vitest | Excellent DX but requires Vite; adds build-tool complexity to a Next.js-only project |
| Playwright/Cypress (only) | Overkill for unit/component coverage; complements but does not replace unit tests |

## Consequences

**Positive:**
- `next/jest` handles SWC transforms, CSS/asset mocks, and env loading automatically
- RTL encourages behaviour-first assertions (no snapshot brittleness)
- Pure functions (`calculateVat`) are trivially testable with no mocking

**Negative / Risks:**
- JSDOM does not fully replicate browser layout — touch/scroll interactions require E2E tests
- React 19 + RTL 16 is still a recent pairing; watch for upstream issues

## Implementation Notes

- `jest.config.ts` — `next/jest` with `jest-environment-jsdom` and `@/` alias
- `jest.setup.ts` — `@testing-library/jest-dom` matchers
- `"test": "jest"` added to `package.json` scripts
- Test files co-located with source: `*.test.ts` / `*.test.tsx`
