---
name: SQLite legado
description: Compatibilidade necessária para dados de data migrados para SQLite.
---

Datas armazenadas como texto ISO são o formato normal da aplicação, mas bancos migrados podem conter o literal `CURRENT_TIMESTAMP` em algumas colunas antigas.

**Why:** Esse valor é aceito como texto pelo SQLite, mas não representa uma data válida quando convertido para `Date`; serializá-lo diretamente causa `Invalid time value` e derruba endpoints inteiros.

**How to apply:** O tipo de data compartilhado deve converter valores inválidos para um valor seguro antes da camada de rotas serializar a resposta. Não é necessário apagar ou recriar os dados legados.