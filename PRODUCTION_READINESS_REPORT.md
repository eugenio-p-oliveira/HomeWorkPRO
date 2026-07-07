# Relatório de Prontidão para Produção — EduSaaS

**Data:** 2026-07-07
**URL de Produção:** https://educacao-omni--aesirsoftwareho.replit.app
**Status Geral:** Funcional em desenvolvimento. Produção requer seed de dados e hardening adicional.

---

## 1. Status de Funcionalidades

| Funcionalidade | Dev | Produção | Observação |
|---|---|---|---|
| Landing page | OK | OK | Renderiza corretamente |
| Login staff (admin/prof) | OK | **Falha** | Banco de produção vazio — sem dados demo |
| Login aluno | OK | **Falha** | Banco de produção vazio |
| Login responsável | OK | **Falha** | Banco de produção vazio |
| Registro de instituição | OK | N/A | Schema de plano inconsistente |
| Dashboard admin | OK | N/A | Requer dados |
| Criação de provas | OK | N/A | Requer dados |
| Portal do responsável | OK | N/A | Requer dados |
| Timer de provas (aluno) | OK | N/A | Requer dados |
| Relatórios pedagógicos | OK | N/A | Requer dados |
| Demo page (/demo) | OK | **Falha** | Auto-login falha (401) |
| Página de planos | 404 | 404 | Corrigido: redireciona para /#planos |

### Ação Imediata para Produção

O banco de dados PostgreSQL de produção está vazio (sem tenants, users, provas, etc.). O deploy do código funciona, mas não há dados para autenticar. **É necessário executar o seed no banco de produção.**

Comandos sugeridos (via Secrets/Environment do Replit):
```bash
# No ambiente de produção (não disponível via agent):
pnpm --filter @workspace/db run push  # schema
pnpm --filter @workspace/scripts run seed  # dados demo
pnpm --filter @workspace/scripts exec tsx ./src/seed_parents.ts  # responsáveis
```

---

## 2. Auditoria de Segurança — Backend

### ✅ Corrigidos (7 vulnerabilidades)

1. **CORS hardening** — `app.ts` linha 28: `origin: false` em produção, `true` em dev.
2. **Tenant isolation** — Todas as rotas de recursos agora filtram por `tenantId` (academic.ts, questions.ts, sessions.ts, etc.).
3. **Role-based access control** — Rota `/users` restrita a `admin`, `coordinator`, `teacher`. Alunos retornam 403.
4. **Guardian message ownership** — `guardians.ts` verifica se mensagens pertencem ao guardian autenticado.
5. **Student exam access** — Alunos só acessam provas de sua própria turma.
6. **Class enrollment validation** — Verifica se aluno e turma pertencem ao mesmo tenant.
7. **JWT audience/issuer** — Tokens incluem `aud: "edusaas"`, `iss: "edusaas"`.

### ⚠️ Ainda Expostos (Backend)

| # | Problema | Severidade | Arquivo | Correção Sugerida |
|---|---|---|---|---|
| 1 | **Sem rate limiting** | Alta | `app.ts` | Adicionar `express-rate-limit` (100 req/min por IP) |
| 2 | **Sem CSP / Helmet** | Alta | `app.ts` | Adicionar `helmet()` com CSP policy |
| 3 | **SHA-256 para senhas** | Alta | `auth.ts` | Migrar para `bcrypt` com salt ≥12 |
| 4 | **JWT sem expiração explícita** | Média | `auth.ts` | Definir `expiresIn: "24h"` e refresh tokens |
| 5 | **Sem proteção contra brute-force** | Média | `auth.ts` | Rate-limit por email/IP no login |
| 6 | **Password reset inexistente** | Média | N/A | Implementar flow de reset via email |
| 7 | **Sem audit log de ações** | Baixa | N/A | Logar operações críticas (delete, update de notas) |
| 8 | **SQL injection via orderBy** | Baixa | Várias | Validar colunas de `orderBy` contra whitelist |

---

## 3. Auditoria de Segurança — Frontend

### ⚠️ Vulnerabilidades Client-Side

| # | Problema | Severidade | Arquivo | Correção Sugerida |
|---|---|---|---|---|
| 1 | **Token JWT em localStorage** | Alta | `auth.tsx`, `guardian-auth.tsx` | Usar cookies `HttpOnly; Secure; SameSite=Strict` |
| 2 | **dangerouslySetInnerHTML** | Média | `chart.tsx:79` | Remover ou sanitizar com DOMPurify |
| 3 | **Sem validação de formulários** | Média | Vários | Usar Zod + react-hook-form em todos os inputs |
| 4 | **Role checks duplicados (cliente + servidor)** | Baixa | Vários | Manter apenas server-side; cliente só para UI |

---

## 4. Vulnerabilidades de Dependências

Scanner identificou 21 vulnerabilidades (8 alta, 11 moderada, 2 baixa). **A maioria é em devDependencies** (build pipeline), não em runtime.

| Pacote | Severidade | Impacto | Ação |
|---|---|---|---|
| `@babel/core` 7.29.0 | Alta | Sourcemap leak em build | Atualizar quando patch disponível |
| `axios` | Moderada | Request smuggling (dev-only) | Low priority |
| `yoctocolors` | Moderada | Prototype pollution (dev-only) | Low priority |
| `esbuild` | Moderada | Path traversal (build-time) | Low priority |

**Runtime (produção):** `express`, `cors`, `drizzle-orm`, `pg` — sem vulnerabilidades críticas.

---

## 5. Bugs Funcionais Encontrados

| # | Problema | Status |
|---|---|---|
| 1 | **Email de demo do professor errado** | ✅ Corrigido: `carlos.mendes@escolateste.com` |
| 2 | **Brand inconsistente** | ✅ Corrigido: `HomeworkPRO` → `EduSaaS` |
| 3 | **`/plans` retorna 404** | ✅ Corrigido: redireciona para `/#planos` |
| 4 | **Schema de plano inconsistente** | ⚠️ Aberto: API aceita `free`/`basic`/`premium`; landing mostra `Inicial`/`Intermediário`/`Robusto` |
| 5 | **Guardian auth com Buffer.from()** | ✅ Corrigido: usado `atob()` para compatibilidade browser |
| 6 | **Produção sem dados de demo** | ⚠️ Aberto: Requer seed no DB de produção |

---

## 6. Checklist para Go-Live

- [x] Landing page funcional
- [x] Multi-tenant isolation implementada
- [x] RBAC no backend
- [x] CORS hardening
- [x] HTTPS em produção
- [ ] **Seed de dados de demo em produção** (BLOQUEANTE)
- [ ] Rate limiting no Express (BLOQUEANTE)
- [ ] Helmet/CSP headers (BLOQUEANTE)
- [ ] Senhas com bcrypt (BLOQUEANTE)
- [ ] Tokens em cookies HttpOnly (BLOQUEANTE)
- [ ] Schema de planos consistente
- [ ] Password reset flow
- [ ] Input sanitization em todos os forms
- [ ] Audit logging
- [ ] Testes E2E automatizados

---

## 7. Recomendações Imediatas

### Prioridade 1 (Bloqueante para Go-Live)
1. **Popular DB de produção** com seed script ou adicionar auto-seed no startup
2. **Adicionar `helmet()` e `express-rate-limit`** ao Express
3. **Migrar hash de senha** de SHA-256 para bcrypt
4. **Mover JWT para cookies HttpOnly**

### Prioridade 2 (Semana 1 pós-launch)
5. Corrigir schema de planos (`inicial/intermediario/robusto` vs `free/basic/premium`)
6. Implementar password reset
7. Adicionar DOMPurify para dangerouslySetInnerHTML
8. Rate-limit específico no login

### Prioridade 3 (Mês 1)
9. Audit logging para operações sensíveis
10. Testes E2E com Playwright
11. CSP policy refinada
12. Dependabot/renovate para atualização automática de deps

---

## 8. Verificação de Rotas Protegidas

Testado em desenvolvimento (todas retornam status corretos):

| Rota | Admin | Teacher | Student | Guest | Esperado |
|---|---|---|---|---|---|
| GET /api/users | 200 | 200 | 403 | 401 | ✅ |
| GET /api/exams | 200 | 200 | 401 | 401 | ✅ |
| GET /api/classes | 200 | 200 | 401 | 401 | ✅ |
| GET /api/student/exams | 401 | 401 | 200 | 401 | ✅ |
| GET /api/guardians/me | 401 | 401 | 401 | 401* | ✅ |
| GET /api/guardians/:id/stats | 401 | 401 | 401 | 401* | ✅ |

\* Requer guardian token separado
