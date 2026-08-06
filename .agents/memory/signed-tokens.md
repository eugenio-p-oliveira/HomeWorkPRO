---
name: Tokens assinados
description: Regra de segurança para tokens de autenticação da aplicação.
---

Tokens de autenticação devem carregar uma assinatura HMAC feita com `SESSION_SECRET`; Base64 sozinho não protege contra alteração do payload.

**Why:** Tokens apenas codificados permitiam que o conteúdo fosse lido e alterado sem detecção, inclusive identificadores de usuário e tenant.

**How to apply:** Exigir `SESSION_SECRET`, comparar assinaturas com uma operação em tempo constante e rejeitar tokens sem assinatura válida ou expirados. Tokens antigos sem assinatura não devem ser aceitos após a migração.