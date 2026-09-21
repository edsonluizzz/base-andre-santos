# Mala direta por email — design

Data: 2026-09-21 · Status: desenho aprovado, aguardando plano de implementação

## Objetivo
Enviar propaganda eleitoral por email para a base de cadastros da campanha André Santos, com descadastro funcional, sem reenvio duplicado e com boa entrega.

## Público (decidido)
- Somente a campanha `andre-santos-2026` (nunca outras campanhas do Ovile Eleitoral — dados de outros controladores).
- Fonte única: `Collaborator.email` no banco. **Nada em planilha**: os 25 leads que só existiam na planilha "Leads" (Google Sheets) são importados para o banco uma vez (`LEAD`, origem `PLANILHA_LEADS`), e o formulário do site passa a gravar direto no banco (componente 6).
- Censo de 2026-09-21: 2.680 cadastros, 2.456 emails únicos válidos (811 com `lgpdConsent`, 1.645 sem). Planilha "Leads": 126 emails únicos, 101 já no banco, 25 novos → lista final ≈ 2.463 (já descontados os 18 do Wix). Opção escolhida: **enviar para todos os únicos válidos, com descadastro em todo email**.
- Excluir: email inválido, domínio `offline-members-wix.com` (18 gerados pelo Wix), quem estiver na lista de supressão.
- Pendência jurídica: validar com o jurídico da campanha o envio a quem não tem `lgpdConsent` (Res. TSE 23.610 exige identificação do remetente e descadastro simples). Não bloqueia a construção, só o disparo real.

## Componentes

### 1. `EmailSuppression` (novo modelo Prisma)
- Campos: `email` (único, minúsculo), `reason` (`UNSUBSCRIBE` | `BOUNCE` | `COMPLAINT` | `MANUAL`), `createdAt`.
- Independente de `Collaborator`, para cobrir descadastros de emails que ainda não são `Collaborator`.
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
- A lista final é `Collaborator` com email válido, deduplicada, menos supressão. Sem upload de CSV.
- Disparo em lotes pelo Resend, escalonado por ondas (ex.: ~500/dia) para aquecer o domínio.
- **Idempotência:** modelo de log por (campanha de envio, email) com status; reexecução nunca reenvia a quem já está `SENT` (evita repetir o incidente de envio duplicado de 2026-08).

### 5. Pré-requisitos
- SPF, DKIM e DMARC do domínio remetente verificados no Resend.
- Plano do Resend compatível com o volume (plano gratuito: 100/dia e 3.000/mês).

### 6. Formulário de leads grava no banco (repo `andre-santos`)
- `app/api/leads/route.ts` deixa de chamar o Apps Script/planilha e passa a repassar para `https://leads.prandresantos.com.br/api/public/cadastro` (mesmo padrão do `/grupo`), com `email`, `source` e `lgpdConsent`.
- `app/leads/page.tsx` ganha checkbox de consentimento (LGPD + aceite de receber comunicações por email/WhatsApp), obrigatório. Hoje o formulário não coleta consentimento — é a causa de só 33% da base ter `lgpdConsent`.
- CEP: o endpoint de cadastro não tem campo de CEP; resolver cidade/bairro via ViaCEP no formulário (a base tem 64% sem cidade) e enviar como `city`/`neighborhood`.
- Importação única dos 25 leads da planilha: script one-shot que grava no banco e é descartado.
- A planilha "Leads" deixa de receber dados (não é apagada).

## Fora do escopo
- Segmentação por cidade/perfil.
- Métricas além das do painel do Resend.
- Migrar outros formulários além de `/leads` (o `/grupo` já grava no banco).

## Pendências
- Texto e arte da mala direta.
- Validação jurídica do público sem `lgpdConsent`.
