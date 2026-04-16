# PLAN — Onboarding Ovile

> Criado em 2026-04-16. Execute step por step. Ao retomar, paste o prompt do passo seguinte.

---

## Contexto

Dois fluxos de onboarding distintos:

1. **Admin** — pastor/líder que acabou de criar a congregação. Primeiro acesso ao dashboard é completamente vazio. Precisa de orientação clara sobre o que fazer primeiro.
2. **Membro** — entrou via link de convite ou join code. Acessa o portal mas não sabe o que pode fazer lá.

### Decisões de design

- **Sem migration de banco**: estado de onboarding via `localStorage` (chave por `establishmentId` para admin, por `userId` para membro). Simples, sem custo, funciona para o caso de uso.
- **Admin**: checklist dinâmico no dashboard — cada passo é verificado pelo estado real do banco (dados já carregados). Some automaticamente quando todos os itens estiverem feitos, ou ao clicar em "dispensar".
- **Membro**: modal de boas-vindas com tour de 3 steps no `/portal`. Aparece apenas na primeira visita.
- **Página de sucesso do cadastro** (`/cadastro`): melhorar o "próximos passos" pós-criação da congregação.

---

## Arquivos alterados

| Arquivo | O que muda |
|---------|-----------|
| `src/app/(dashboard)/dashboard/page.tsx` | Adiciona `<SetupChecklist>` acima dos stat cards |
| `src/components/onboarding/setup-checklist.tsx` | **Novo** — card de primeiros passos para admin |
| `src/app/(dashboard)/portal/page.tsx` | Adiciona `<PortalWelcomeTour>` |
| `src/components/onboarding/portal-welcome-tour.tsx` | **Novo** — modal de boas-vindas para membros |
| `src/app/cadastro/page.tsx` | Melhora tela de sucesso pós-cadastro |

---

## Step 1 — Checklist de configuração (Admin Dashboard)

**Componente:** `src/components/onboarding/setup-checklist.tsx`

Props recebidas do dashboard:
```ts
{
  establishmentId: string
  membersCount: number
  eventsCount: number
  hasJoinCode: boolean
  hasLogo: boolean
}
```

Passos verificados:
| # | Passo | Condição "feito" | Link destino |
|---|-------|-----------------|-------------|
| 1 | Congregação criada | sempre ✅ | — |
| 2 | Adicionar membros | `membersCount > 0` | `/membros` |
| 3 | Criar primeiro evento | `eventsCount > 0` | `/chamada` |
| 4 | Gerar link de convite | `hasJoinCode` | `/configuracoes` |
| 5 | Adicionar logo | `hasLogo` | `/configuracoes` |

Comportamento:
- Aparece apenas para role `ADMIN`
- Some automaticamente quando todos os 5 passos estiverem feitos
- Botão "×" salva `ovile_setup_dismissed_{eid}` no localStorage
- Barra de progresso `X/5 concluídos`

**No dashboard:** inserir `<SetupChecklist>` entre o greeting e os stat cards. Calcular `membersCount` de `members` state, `eventsCount` de `events` state. Buscar `hasJoinCode` e `hasLogo` via `GET /api/settings` (já existe, já é chamado na página de configurações).

---

## Step 2 — Tour de boas-vindas (Portal do Membro)

**Componente:** `src/components/onboarding/portal-welcome-tour.tsx`

Modal com 3 steps, botões "Próximo / Concluir":

| Step | Título | Conteúdo |
|------|--------|----------|
| 1 | Bem-vindo ao seu Portal! | Espaço pessoal na congregação. Veja sua presença, confirme eventos e atualize seu perfil. |
| 2 | Sua Presença | Acompanhe seu histórico de participação por evento. Seu líder registra a chamada. |
| 3 | Confirme Presença | Em eventos futuros, você pode confirmar antecipadamente via RSVP. |

Comportamento:
- Aparece na primeira visita: `!localStorage.getItem('ovile_portal_tour_{userId}')`
- Ao fechar ou finalizar: `localStorage.setItem('ovile_portal_tour_{userId}', '1')`
- Transição suave entre steps (opacity + translate)

---

## Step 3 — Pós-cadastro melhorado (`/cadastro`)

Na tela de sucesso, substituir a mensagem simples atual por lista visual de próximos passos:

```
✅ Congregação criada!
E-mail enviado para {adminEmail}.

── Seus próximos passos ──
1. Faça login com sua conta Google
2. Adicione seus membros
3. Crie o primeiro evento
4. Compartilhe o link de convite com sua equipe

[Ir para o Login →]
```

---

## Ordem de execução

1. **Step 1** (checklist admin) — maior impacto para retenção
2. **Step 3** (pós-cadastro) — rápido, melhora primeira impressão
3. **Step 2** (tour portal) — para membros

---

## Status

| Step | Status |
|------|--------|
| 1 — Checklist admin | 🔜 Próximo |
| 2 — Tour portal | Pendente |
| 3 — Pós-cadastro | Pendente |

---

## Prompt para retomar no Step 1

> "Execute o Step 1 do PLAN.md: criar `src/components/onboarding/setup-checklist.tsx` e integrá-lo no dashboard. Ver o plano completo em PLAN.md."

## Prompt para retomar no Step 2

> "Execute o Step 2 do PLAN.md: criar `src/components/onboarding/portal-welcome-tour.tsx` e integrá-lo em `src/app/(dashboard)/portal/page.tsx`. Ver o plano completo em PLAN.md."

## Prompt para retomar no Step 3

> "Execute o Step 3 do PLAN.md: melhorar a tela de sucesso pós-cadastro em `src/app/cadastro/page.tsx` com lista visual de próximos passos. Ver o plano completo em PLAN.md."
