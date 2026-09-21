# Mala direta por email — design

Data: 2026-09-21 · Status: desenho aprovado, aguardando plano de implementação

## Objetivo
Enviar propaganda eleitoral por email para a base de cadastros da campanha André Santos, com descadastro funcional, sem reenvio duplicado e com boa entrega.

## Público (decidido)
- Somente a campanha `andre-santos-2026` (nunca outras campanhas do Ovile Eleitoral — dados de outros controladores).
- Fontes: `Collaborator.email` (base de apoio) + CSV de leads do site (planilha Google), cruzados por email.
- Censo de 2026-09-21: 2.680 cadastros, 2.456 emails únicos válidos (811 com `lgpdConsent`, 1.645 sem). Opção escolhida: **enviar para todos os únicos válidos, com descadastro em todo email**.
- Excluir: email inválido, domínio `offline-members-wix.com` (18 gerados pelo Wix), quem estiver na lista de supressão.
- Pendência jurídica: validar com o jurídico da campanha o envio a quem não tem `lgpdConsent` (Res. TSE 23.610 exige identificação do remetente e descadastro simples). Não bloqueia a construção, só o disparo real.

## Componentes

### 1. `EmailSuppression` (novo modelo Prisma)
- Campos: `email` (único, minúsculo), `reason` (`UNSUBSCRIBE` | `BOUNCE` | `COMPLAINT` | `MANUAL`), `createdAt`.
- Independente de `Collaborator`, para cobrir emails que só existem no CSV de leads.
- Consultada em todo envio. Bounces e reclamações de spam do Resend entram aqui via webhook.

### 2. Descadastro
- Link `/descadastro?e=<email>&t=<hmac>`; o token é HMAC do email com segredo do servidor.
- Página pública com confirmação de um clique; grava em `EmailSuppression`.
- Headers `List-Unsubscribe` e `List-Unsubscribe-Post: List-Unsubscribe=One-Click` em todo email (exigência Gmail/Yahoo para remetentes em massa).

### 3. Template de propaganda
- Layout próprio em `src/lib/email.ts` (ou módulo dedicado), separado do "comunicado interno".
- Rodapé: comitê e CNPJ 68.464.730/0001-87, indicação de propaganda eleitoral, motivo do recebimento, link de descadastro.
- Conteúdo (texto/arte) será definido depois do censo final.

### 4. Ferramenta de envio (`/mala-direta`, restrita a admin)
- Etapas: prévia do email → contagem final (dry-run) → envio de teste para o email do admin → disparo.
- Entrada extra: upload do CSV de leads; a lista final é `Collaborator ∪ CSV`, deduplicada, menos supressão.
- Disparo em lotes pelo Resend, escalonado por ondas (ex.: ~500/dia) para aquecer o domínio.
- **Idempotência:** modelo de log por (campanha de envio, email) com status; reexecução nunca reenvia a quem já está `SENT` (evita repetir o incidente de envio duplicado de 2026-08).

### 5. Pré-requisitos
- SPF, DKIM e DMARC do domínio remetente verificados no Resend.
- Plano do Resend compatível com o volume (plano gratuito: 100/dia e 3.000/mês).

## Fora do escopo
- Segmentação por cidade/perfil.
- Métricas além das do painel do Resend.
- Importar leads para a base de apoio.

## Pendências
- CSV de leads do site (exportar da planilha Google; ainda não localizado em Downloads).
- Texto e arte da mala direta.
- Validação jurídica do público sem `lgpdConsent`.
