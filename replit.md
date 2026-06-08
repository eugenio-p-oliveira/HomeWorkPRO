# EduSaaS — Plataforma Educacional Multi-tenant

Plataforma SaaS completa para gestão escolar: criação de provas com correção automática, estrutura acadêmica (séries, turmas, disciplinas), interface de aluno com timer, portal de responsáveis, e relatórios pedagógicos avançados com landing page de planos.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied to /api)
- `pnpm --filter @workspace/escola-saas run dev` — run the frontend (proxied to /)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — JWT signing secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite 7, Wouter (routing), TanStack Query, Tailwind CSS v4, Recharts, Sonner
- API: Express 5, pino logging
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec in `lib/api-spec/openapi.yaml`)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for all API contracts
- `lib/api-client-react/src/generated/api.ts` — generated React Query hooks (do not edit manually)
- `lib/db/src/schema/` — Drizzle ORM schema (tenants, users, academic, exams)
- `artifacts/api-server/src/routes/` — all backend route handlers
- `artifacts/escola-saas/src/pages/` — all frontend page components
- `artifacts/escola-saas/src/components/Layout.tsx` — shared sidebar layout + PageHeader
- `artifacts/escola-saas/src/lib/auth.tsx` — AuthContext para staff/aluno
- `artifacts/escola-saas/src/lib/guardian-auth.tsx` — AuthContext para responsáveis
- `artifacts/escola-saas/src/index.css` — Tailwind theme vars (deep blue primary)

## Architecture decisions

- **Contract-first API**: OpenAPI spec → Orval codegen → typed React Query hooks + Zod schemas. Never write hooks manually.
- **JWT in localStorage**: Token stored as `edusaas_token`, injected via `setAuthTokenGetter` into every API request. No cookies.
- **Multi-tenant by design**: Every DB query scoped to `tenantId` extracted from JWT. Tenant isolation enforced at route middleware level.
- **`lib/api-client-react` exports**: The `./src/custom-fetch` sub-path must be declared in `exports` in package.json — Vite enforces package exports strictly.
- **Wouter routing**: Use `<Link href="..."><Button>...</Button></Link>` — do NOT wrap with inner `<a>` tags, Link already renders as `<a>`.

## Product

- **Admin/Coordinator**: Dashboard with institution stats, exam management, user management, classes/series/subjects, pedagogical reports with charts, send messages to guardians.
- **Teacher**: Exam creation, class management, student performance reports, send messages to guardians.
- **Student**: Browse exams, take exams with countdown timer, view detailed results.
- **Guardian/Parent**: Dedicated portal with desempenho por aluno, radar chart por disciplina, mensagens da escola, calendário de eventos, dicas pedagógicas. Login: `maria.alves@teste.com / senha123`.
- **Landing page**: Página pública (`/`) com hero, 6 recursos, passo a passo, 4 planos de preço (Inicial R$79, Intermediário R$179, Robusto R$349, Customizado sob consulta).
- **Exam types**: ENEM, Simulado, Prova tradicional, Atividade — com timer, agendamento, múltiplas tentativas.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After running `pnpm --filter @workspace/api-spec run codegen`, the file `lib/api-zod/src/index.ts` may get a duplicate export. Check and fix if needed.
- Never call service ports directly (e.g. port 8080) — always go through the proxy at `localhost:80`.
- `getListClassesQueryKey` requires params argument (can be empty object `{}`).
- The `useLogout` hook is a mutation (POST /api/auth/logout) — handle its `onSettled` to call `logout()` from AuthContext.
- **drizzle-orm `inArray` with node-postgres**: `inArray(col, ids)` generates `col IN ($1, $2)` which works correctly. Do NOT use `sql\`col = ANY(${ids})\`` — it generates `= ANY(($1,$2))` (ROW constructor) which PostgreSQL rejects. Always use `inArray` from `drizzle-orm`.
- **`classStudentsTable.studentId`** had a wrong FK referencing `tenantsTable` instead of `usersTable` — was fixed in `lib/db/src/schema/academic.ts` and migrated with `push-force`.
- **Radix UI `<SelectItem>`**: `value=""` (empty string) is forbidden — use a sentinel like `"_none"` and convert back in `onValueChange`.
- **Wouter `<Link>`**: renders as `<a>`, do NOT nest another `<a>` inside. Pass `className` directly to `<Link>`.
- **Seed script**: `pnpm --filter @workspace/scripts run seed` — idempotent, safe to re-run. Credentials: admin `admin@teste.com / senha123`, alunos `nome.sobrenome@aluno.escolateste.com / senha123`.
- **Seed responsáveis**: `pnpm --filter @workspace/scripts exec tsx ./src/seed_parents.ts` — cria 35 responsáveis, vincula a alunos, 10 eventos, 12 dicas, 12 mensagens. Login responsável: `maria.alves@teste.com / senha123`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
