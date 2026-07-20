# Módulo de Equipes de Distribuição em Igrejas — Design

**Data:** 2026-07-20
**Status:** Aprovado, aguardando plano de implementação

## Contexto

A campanha vai distribuir material impresso (novo, ainda não definido qual) em
congregações, com duplas fixas de 2 pessoas por igreja. Objetivo principal:
**accountability da equipe** — saber quem (qual dupla) foi em qual igreja,
quando, e com prova de entrega.

Já existe uma lista real de congregações em planilha (ex.: Assembleia de Deus
Curitiba, 165 congregações em 12 regionais internas da denominação — ver
`C:\Users\User\Downloads\lista assembleia de deus - curitiba.xlsx`). O sistema
vai receber outras denominações/listas no futuro, cada uma com seus próprios
nomes de regional.

Módulos existentes relevantes (não reaproveitados diretamente, mas que
inspiram os padrões de implementação):
- **Modo Rua** (`PLAN-MODO-RUA.md`): padrão de onboarding via InviteLink
  reutilizável (Gmail login → vira `Collaborator` MEMBER) e entrada rápida
  mobile-first.
- **Envio de mídia no WhatsApp** (`ESTADO-ATUAL.md`, sessão 2026-06-10): upload
  de foto deve ser **via servidor** (multipart → backend → Vercel Blob), não
  PUT direto do navegador — CSP/CORS já causou bug real nesse caminho antes.
- **Importação XLSX de leads**: padrão de import de planilha com
  `sourceOverride` já existe; o import de igrejas segue formato parecido.
- `Zone`/`ZoneCollaborator`, `WhatsAppGroupMember`, `EventRsvp`: padrão de
  join table para relações N:N — **não usado aqui** (ver decisão abaixo sobre
  `member1Id`/`member2Id`).

## Modelo de dados

```prisma
model Church {
  id          String   @id @default(cuid())
  campaignId  String   @default("andre-santos-2026")
  name        String
  regional    String?              // texto livre — divisão interna da denominação, NÃO é Zone da campanha
  denominacao String?              // ex: "Assembleia de Deus" — definida por importação, não por linha
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  campaign    Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  assignments ChurchAssignment[]

  @@index([campaignId])
  @@index([regional])
  @@index([denominacao])
}

model ChurchAssignment {
  id           String   @id @default(cuid())
  churchId     String
  status       ChurchAssignmentStatus @default(PENDENTE)
  photoUrl     String?  @db.Text     // obrigatória quando status=ENTREGUE
  notes        String?               // motivo livre quando NAO_FOI_POSSIVEL
  assignedById String                // coordenador que atribuiu (User.id)
  member1Id    String
  member2Id    String
  deliveredAt  DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  church  Church       @relation(fields: [churchId], references: [id], onDelete: Cascade)
  member1 Collaborator @relation("AssignmentMember1", fields: [member1Id], references: [id], onDelete: Cascade)
  member2 Collaborator @relation("AssignmentMember2", fields: [member2Id], references: [id], onDelete: Cascade)

  @@index([churchId])
  @@index([status])
  @@index([member1Id])
  @@index([member2Id])
}

enum ChurchAssignmentStatus {
  PENDENTE
  ENTREGUE
  NAO_FOI_POSSIVEL
}
```

### Decisões de modelagem

- **`member1Id`/`member2Id` diretos, não join table.** A regra "sempre 2
  pessoas" é fixa e não vai mudar — colunas diretas são mais simples de
  escrever e exibir (dupla sai da mesma linha, sem join extra). O custo é
  que consultar "todas as igrejas desse colaborador" vira um `OR` em vez de
  uma relação única, aceitável no volume esperado (algumas centenas de
  igrejas).
- **`regional`/`denominacao` como texto livre, não `Zone`.** São a divisão
  interna da denominação (ex.: "Boa Vista", "Cajuru" na AD Curitiba), um
  conceito diferente da geografia política da campanha (município/bairro
  usada em `Zone` para votos e grupos de WhatsApp). Cada denominação futura
  vai ter seus próprios nomes de regional — texto livre resolve sem precisar
  de uma segunda hierarquia.
- **Redistribuição vs. nova tentativa da mesma dupla são coisas diferentes:**
  - A **mesma dupla** pode alternar o status livremente
    (`PENDENTE ↔ NAO_FOI_POSSIVEL ↔ ENTREGUE`) na mesma linha —
    "não foi possível" não é terminal, ela pode tentar de novo depois.
  - Só quando o **admin troca as pessoas** (dupla diferente) nasce um
    **novo** `ChurchAssignment` para a mesma igreja; o anterior fica
    congelado como histórico (accountability de quem tentou antes).
- **`onDelete: Cascade`** em `member1`/`member2`: aceitável porque
  colaboradores nunca são de fato excluídos na prática (usa-se
  `status: INACTIVE`), só quando removidos de verdade a atribuição deveria
  sumir junto.

## Importação da planilha

- Aceita `.xlsx`/`.csv` com 2 colunas: **nome da congregação** + **regional**
  (formato já confirmado na planilha real da AD Curitiba).
- **Denominação é definida uma vez por importação** (ex.: escolhida no
  formulário de import), valendo para todas as linhas — não vem da planilha,
  a menos que uma 3ª coluna opcional a informe por linha.
- Normalização automática: trim + case-insensitive nos nomes de regional
  (resolve variações como "Santa Felicidade" vs. "Santa felicidade").
- **Tela de revisão antes de confirmar**: lista os regionais distintos
  detectados (já normalizados) para o usuário conferir/corrigir — é onde
  apareceria um caso como "Alto Bela Vista II" (suspeita de erro de
  digitação/coluna trocada, já visto na planilha real) antes de gravar.
  Nenhuma `Zone` é criada automaticamente — regional é só texto no `Church`.
- Dedup por nome da igreja normalizado dentro da mesma regional, para
  reimportação não duplicar.

## Atribuição de duplas (admin)

- **Onboarding de pessoas novas:** reaproveita o InviteLink reutilizável já
  existente (`/convites`) — gera link com papel MEMBER, pessoa loga com
  Gmail, vira `Collaborator` (role `VOLUNTARIO`, `source: "DISTRIBUICAO"`).
  Nenhuma tela nova necessária para isso.
- **Tela de atribuição** (nova, ex. `/igrejas`, ADMIN-only):
  - Lista de igrejas importadas, filtro por regional/denominação/status.
  - Igreja sem dupla: botão "Atribuir dupla" → modal com 2 seletores de
    `Collaborator` — busca entre **qualquer** colaborador cadastrado no
    sistema (não restrito a `source: "DISTRIBUICAO"`, permite escalar
    voluntários de outras funções).
  - Validação de backend: `member1Id !== member2Id`; ambos obrigatórios.
  - Igreja com status `NAO_FOI_POSSIVEL` **e** admin decide trocar a dupla:
    botão "Redistribuir" → mesmo modal, cria novo `ChurchAssignment`.
  - Coluna de status visível na lista (PENDENTE/ENTREGUE/NAO_FOI_POSSIVEL) +
    nomes da dupla atual.

## Fluxo da dupla (mobile)

- Nova página `/minhas-igrejas` (sidebar, visível a qualquer colaborador
  logado).
- Lista igrejas onde a pessoa é `member1` ou `member2` num
  `ChurchAssignment` que ainda **não** está `ENTREGUE` (ou seja, `PENDENTE`
  ou `NAO_FOI_POSSIVEL` continuam aparecendo — permite nova tentativa sem
  ação do admin).
- Ações por item:
  - **"Marcar entregue"**: exige foto (câmera/galeria) → upload via servidor
    (multipart → backend → Vercel Blob, mesmo padrão que resolveu o bug de
    mídia do WhatsApp — evita CSP/CORS do PUT direto do navegador). Grava
    `photoUrl`, `status: ENTREGUE`, `deliveredAt: now()`.
  - **"Não foi possível"**: campo de nota opcional (`notes`) →
    `status: NAO_FOI_POSSIVEL`. Continua na lista da própria dupla para
    nova tentativa.
- Sem fila offline — sinal normalmente é suficiente nesse contexto.

## Erros e casos de borda

- Upload de foto falha (sem sinal no momento do envio): erro claro, status
  não muda (mesmo padrão de timeout do composer do WhatsApp).
- Dupla incompleta ou pessoa repetida: bloqueado no schema (`member1Id`/
  `member2Id` obrigatórios) e validação de backend (`!==`).
- Igreja duplicada na reimportação: dedup por nome normalizado + regional.
- Colaborador excluído com atribuição ativa: `Cascade` remove a atribuição
  junto — aceitável porque exclusão real de colaborador não é o fluxo normal
  (usa-se `INACTIVE`).

## Testes

- E2E (Playwright, seguindo padrão de `e2e/cadastro`):
  - Admin importa planilha → revisão de regionais → confirma → igrejas
    criadas.
  - Admin atribui dupla → igreja aparece em `/minhas-igrejas` de ambos.
  - Dupla marca "entregue" com foto → status muda, some da lista de
    pendentes de ação da dupla.
  - Dupla marca "não foi possível" → continua na lista da dupla.
  - Admin redistribui (troca dupla) → novo `ChurchAssignment`, o anterior
    preservado como histórico.
- Validações de API cobertas por teste: `member1Id === member2Id` rejeitado;
  entrega sem foto rejeitada; sem sessão → 401; telas administrativas
  ADMIN-only.
- Lint no clone `ovile-ci` antes do push; build real só no Vercel — **nunca**
  `npm run build` na pasta do Drive (roda `prisma db push` em produção).

## Fora de escopo (YAGNI por agora)

- Fila offline para o fluxo da dupla.
- Controle de quantidade/estoque de material por igreja.
- Dashboard de cobertura (% de igrejas visitadas por regional) — pode entrar
  depois como extensão simples sobre esse mesmo modelo, mas não é requisito
  agora.
- Gestão de `Zone` para os regionais da denominação (ficam como texto livre).
