---
name: Sincronização Vercel
description: Regra para diagnosticar deployments Vercel que continuam servindo um bundle antigo.
---

O domínio de produção pode continuar servindo um deployment antigo mesmo quando o `main` do GitHub recebeu o código novo. Antes de fazer novas alterações no aplicativo, comparar o hash do bundle público, a rota SPA e o commit publicado; se não mudarem após o push, conferir o repositório e a branch de produção nas configurações do projeto Vercel.

**Why:** Um push bem-sucedido para o GitHub não garante que o projeto Vercel esteja conectado ao mesmo repositório, branch ou integração automática.

**How to apply:** Verificar `Project Settings → Git`, usar `main` como Production Branch, disparar um redeploy do commit atual e invalidar o cache quando o bundle público continuar antigo.