# PLAN — Modo Rua (cadastro rápido por colaborador)

Objetivo: tela autenticada para o colaborador cadastrar **outras** pessoas na rua,
rápido (~15s/pessoa), com atribuição automática a quem cadastrou, fila offline e
**cidade do PR obrigatória** (CEP ou nome) — senão o apoiador não aparece no Mapa.

Decisões fechadas com o Edson:
- Cada colaborador no **próprio celular** (logado) — atribuição via `registeredById`.
- **Fila offline** (salva no aparelho, sincroniza quando volta o sinal).
- **Cidade do PR obrigatória**: aceita CEP (faixa 80–87) que resolve a cidade, OU
  nome escolhido no autocomplete dos 399 municípios. Grava sempre a grafia canônica.
- Consentimento LGPD verbal (checkbox "declaro que a pessoa autorizou o contato").

> Build/lint: NUNCA `npm run build` na pasta do Drive (roda `prisma db push`).
> Rodar lint no clone `C:\Users\usuario\ovile-ci` antes de cada push. Validar no Vercel.

---

## Passo 1 — Base de dados dos municípios do PR ✅ (feito)
`src/lib/pr-cities.ts`: lista oficial (IBGE/BrasilAPI), `normalizeCity`,
`canonicalPRCity`, `isPRCity`, `isPRCep`, `findPRCities` (autocomplete). Estático
(funciona offline).

## Passo 2 — Endpoint autenticado de cadastro de rua
`src/app/api/rua/route.ts` (POST):
- Exige sessão; resolve o `Collaborator` do usuário logado (vira `registeredById`).
- Valida: nome, telefone (>=10 dígitos), e **cidade canônica do PR** obrigatória
  (via `canonicalPRCity`; se vier só CEP, a cidade já vem resolvida do client).
- Dedup por `phoneNormalized` (mesma regra do cadastro público).
- Cria com `source: "RUA"`, `status: "LEAD"`, `campaignRole: "VOLUNTARIO"`,
  `lgpdConsent: true/at`. Chama `ensureCityGoal` (Mapa).
- Verificar se `source` é enum no Prisma; se for, adicionar `RUA` ao enum +
  `tenant-init-sql.ts` (db push aplica no deploy). Se for string, nada a migrar.
- Rate-limit mais folgado que o público (operador faz muitos seguidos).

## Passo 3 — Tela `/rua` (entrada rápida)
`src/app/(dashboard)/rua/page.tsx` (client):
- Campos: Nome*, WhatsApp* (teclado numérico, foco automático), Cidade* (autocomplete
  PR via `findPRCities`), CEP (opcional, preenche cidade via `/api/cep` e valida PR),
  checkbox LGPD verbal*.
- Botão grande **"Salvar e próximo"**: salva, limpa, devolve foco ao Nome.
- Contador da sessão ("X cadastrados hoje").
- Bloqueia salvar se a cidade não for do PR (mensagem clara).

## Passo 4 — Fila offline + sincronização
- Store local (IndexedDB; fallback localStorage) com cadastros pendentes.
- Submit: online → POST `/api/rua`; offline/erro → enfileira ("salvo offline").
- Sincroniza no evento `online` + botão manual "Sincronizar (N)"; badge de pendentes.
- Dedup ao sincronizar (não duplicar se o POST já tinha ido).

## Passo 5 — Acesso no menu
- Item "Cadastro na Rua" no sidebar (minRole MEMBER) e/ou botão destacado em
  Colaboradores. Ícone dedicado.

## Passo 6 — Polimento e verificação
- Testar PR válido/inválido, CEP fora do PR, offline→online, atribuição correta.
- Conferir Mapa exibindo os novos cadastros. Atualizar `ESTADO-ATUAL.md`.

---

### Retomar no Passo 2
Cole no chat:

> Continue o PLAN-MODO-RUA.md a partir do Passo 2: crie o endpoint autenticado
> `src/app/api/rua/route.ts` que cadastra a pessoa atribuindo ao colaborador logado,
> exigindo cidade canônica do PR (use `src/lib/pr-cities.ts`), com dedup por telefone
> e `ensureCityGoal`. Verifique se `source` é enum no Prisma e adicione `RUA` se for.
> Depois commite e me dê o prompt do Passo 3.
