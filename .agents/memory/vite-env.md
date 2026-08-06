---
name: Variáveis Vite no deploy
description: Tratamento de variáveis VITE_* usadas para URLs da API.
---

Variáveis `VITE_*` usadas no frontend podem chegar ao bundle como a string literal `"undefined"` ou `"null"`, não apenas como valor ausente.

**Why:** Concatenar esses valores produz URLs como `/undefined/api/...`, gerando 404 apenas no ambiente publicado.

**How to apply:** Normalize valores ausentes, `"undefined"` e `"null"` para string vazia; prefira o proxy relativo `/api` quando frontend e API estão no mesmo domínio.