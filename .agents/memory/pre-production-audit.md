---
name: Auditoria pré-produção
description: A prontidão do EduSaaS precisa ser avaliada por matriz de papéis e tenant em runtime, não apenas por typecheck ou renderização.
---

Uma auditoria de produção deve testar cada papel diretamente contra cada endpoint sensível, incluindo respostas e campos retornados, e não apenas confirmar que as rotas existem.

**Why:** A aplicação pode estar disponível, tipada e visualmente correta enquanto alunos ou professores ainda conseguem alcançar relatórios institucionais, provas fora do fluxo e dados administrativos por chamadas diretas.

**How to apply:** Antes de qualquer liberação, executar uma matriz admin/coordenador/professor/aluno/responsável × endpoint, verificar isolamento entre tenants e confirmar que o payload não expõe campos de gabarito, hashes ou dados de terceiros.