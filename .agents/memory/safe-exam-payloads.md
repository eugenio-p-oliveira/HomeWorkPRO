---
name: Payloads seguros de provas
description: O fluxo do aluno deve separar rigorosamente o payload da prova em andamento do payload do resultado final.
---

Durante uma prova, a API deve retornar somente a representação necessária para responder: enunciado, metadados não sensíveis e alternativas sem gabarito, explicação ou indicador de correção. A correção e a explicação só podem aparecer depois que a sessão estiver finalizada e pertencer ao aluno autenticado.

**Why:** A autorização de rota não protege contra cola se o próprio payload de questões carregar `isCorrect`, explicações ou equivalentes.

**How to apply:** Qualquer novo endpoint ou alteração no fluxo de sessões deve reutilizar uma projeção segura para a prova em andamento e testar explicitamente vazamento de campos sensíveis, além de validar aluno, tenant, prova e sessão.