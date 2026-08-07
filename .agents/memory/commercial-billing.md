---
name: Cobrança comercial
description: Regra para apresentar planos enquanto a cobrança automática ainda não está integrada
---

Enquanto Stripe, Whop ou outro provedor não estiver escolhido e conectado, o produto deve tratar os preços como referência comercial e encaminhar o interessado para vendas. Não simular checkout, assinatura, trial, cancelamento ou limites pagos no frontend.

**Why:** Uma interface de cobrança falsa cria expectativa operacional e pode induzir escolas a contratar recursos que ainda não têm provisionamento, webhooks ou persistência de assinatura.

**How to apply:** Ao implementar billing real, escolher um único provedor, conectar seus webhooks e aplicar o estado da assinatura no backend antes de transformar os CTAs em checkout.