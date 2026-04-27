# PLAN — Contribuições + Rastreio + Tiers + Lider de Célula

## Decisões de Arquitetura

### Formas de contribuição
`contributionTypes String[]` no Collaborator (array PostgreSQL).
Opções: VOLUNTARIO_CAMPANHA, DOADOR, DIVULGADOR_REDES, CABO_ELEITORAL, PANFLETEIRO, MOTORISTA, APOIO_LOGISTICO, OUTRO

### Rastreio de quem cadastrou
- `registeredById String?` → FK para `User.id`
- Link de referência: `/cadastro?ref=<userId>`
- Admin que cria colaborador internamente: `registeredById` = `session.user.id` automaticamente

### Tiers (calculado por cadastros ativos do registrador)
Enum `CollaboratorTier`:
- APOIADOR: 0–4 ativos cadastrados
- ATIVISTA: 5–14 ativos cadastrados
- LIDER_CELULA: 15+ ativos cadastrados
- COORDENADOR: atribuição manual pelo admin

### Permissão de lider de célula
Sem novo role no banco. Em `PUT /api/collaborators/[id]`:
- ADMIN/LEADER: edição completa (atual)
- `collaborator.registeredById === currentUser.id`: pode alterar só `status` e `tier`

---

## Passos

### [ ] Passo 1 — Schema
Adicionar ao Collaborator: `contributionTypes String[]`, `registeredById String?`, `tier CollaboratorTier @default(APOIADOR)`
Novo enum `CollaboratorTier`; relação `registeredBy User?`
`prisma db push`

### [ ] Passo 2 — API pública /cadastro
Aceitar `refUserId` e `contributionTypes` no body → salvar no registro

### [ ] Passo 3 — API interna CRUD
POST auto-preenche `registeredById`; PUT permite edição de status/tier pelo registrador; recalcula tier do registrador após mudança de status

### [ ] Passo 4 — Página pública /cadastro
Leitura de `?ref=` e envio como `refUserId`; checkboxes de contribuição

### [ ] Passo 5 — Formulário interno (modal de colaborador)
Checkboxes de contribuição; campo "Cadastrado por" + badge de tier

### [ ] Passo 6 — Lista de colaboradores
Filtro "Meus cadastros"; badge de tier

### [ ] Passo 7 — Card "Minha Célula" no Dashboard
Visível para qualquer usuário com ao menos 1 cadastro: total registrados, ativos, tier atual
