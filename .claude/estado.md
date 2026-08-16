# Estado — Ovile Eleitoral (Base André Santos)

**Última atualização:** 2026-08-16 (sessão: recibos/pdfkit, valor editável, início oficial da campanha)

---

## Sessão 2026-08-12/16 — pdfkit em produção, recibos, valor editável, início oficial da campanha (16/08)

### Bug crítico: recibos (PDF/email/WhatsApp) não saíam em produção — RESOLVIDO
`PaymentReceipt.pdfUrl` ficava `null` e `emailStatus`/`whatsappStatus` travados em `SKIPPED`. Causa raiz
em duas camadas, achada via `vercel logs` (não dava pra reproduzir só local):
1. O webpack do Next **embutia o pdfkit inteiro no chunk da rota** e reescrevia `__dirname`, fazendo o
   pdfkit procurar seus `.afm` de fonte em `.next/server/chunks/data/` (que não existe) em vez de
   `node_modules/pdfkit/js/data/` real — `ENOENT` silencioso.
2. Corrigido com **duas configs juntas** em `next.config.mjs`: `outputFileTracingIncludes` (garante que
   os `.afm` entrem no bundle) **+** `experimental.serverComponentsExternalPackages: ["pdfkit"]` (impede
   o webpack de embutir o módulo, preservando seu `__dirname`) — a primeira sozinha **não bastava**.
3. `RESEND_API_KEY` também estava ausente em produção (só `RESEND_FROM` configurada) — adicionada via
   `vercel env add`.
4. Bug relacionado no `zapi.ts`: as funções `zapiSend*` não validavam se a resposta da Z-API trazia
   `messageId`/`zaapId` — um HTTP 200 "vazio" (típico quando a sessão do WhatsApp cai) fazia o app marcar
   `SENT` mesmo sem nada ter saído de fato. Corrigido com `assertQueued()`.
5. Bug de layout no PDF do recibo: `doc.x` do pdfkit ficava preso na coluna "Valor" da tabela depois do
   loop de linhas — todo texto seguinte sem `x` explícito ("Forma de pagamento", parágrafo de
   declaração) saía espremido/cortado na margem direita. Corrigido resetando `doc.x` e passando
   `x`/`width` explícitos.
6. Recibos antigos gerados durante o bug (pdfUrl null) recuperados com `regenerateReceiptPdf()` (nova
   função em `receipts.ts`) + botão "Gerar PDF" na aba Financeiro de `/igrejas`.
7. `Campaign.office` não existia — recibo da fonte pagadora padrão (André, sem `PayingEntity`) sempre
   caía no fallback genérico "candidato(a)" em vez de "Deputado Estadual". Campo adicionado, populado em
   produção.

### Exports XLSX + PDF em todos os relatórios financeiros — NO AR
Helper genérico `src/lib/pdf-table.ts` (paginação/cabeçalho repetido) reaproveitado em: colaboradores,
lançamentos (`/financeiro/lancamentos`), pagamentos de cabos eleitorais (Financeiro de `/igrejas`) e o
novo relatório **Cabos Eleitorais / TSE** (`/financeiro/cabos-eleitorais`) — uma linha por recibo (data,
nome, CPF, valor, forma de pagamento, fonte pagadora, nº do recibo), com filtro por fonte pagadora,
pronto pra digitar no SPCE. PDF de colaboradores limitado a 3000 linhas (acima disso, só XLSX).

### CPF do colaborador editável — NO AR
Campo `cpf` (já existia no schema) agora tem UI: formulário de novo/editar colaborador (com máscara +
validação de dígito verificador) e exibido no perfil individual.

### Valor de pagamento editável por dupla — NO AR
`ChurchAssignment.paymentValue` (null = usa `Settings.deliveryPaymentValue` padrão) — editável ao
atribuir a dupla e depois, na aba Financeiro de Igrejas, antes de pagar (trava após qualquer membro já
pago). `getPaymentsReport` e `generateAndSendReceipt` somam o valor real de cada entrega em vez de um
rate fixo × contagem; o PDF do recibo ganhou coluna de valor por linha.

### Ícones de email/WhatsApp do recibo viram botões de disparo — NO AR
Clicáveis em qualquer estado (não só quando falhou) — permite reenviar mesmo já tendo sido enviado
antes. Link de PDF virou botão "PDF" explícito.

### Início oficial da campanha (16/08) — identificação de candidato — NO AR (nos dois repos)
"Pré-candidato" → "Candidato" + número **30777** em todo lugar público, nos dois repositórios
(`base-andre-santos` e `andre-santos`, que serve `prandresantos.com.br`). Módulo compartilhado
`src/lib/campaign-identification.ts` (mesmo padrão nos dois repos) com `isOfficialCampaignPeriod()`
(data de corte 16/08 00:00 BRT) — troca automática, sem precisar de deploy manual no dia.

**Bug achado e corrigido durante a virada:** como as páginas são estáticas (`force-static`/prerendered),
o "snapshot de servidor" do `useSyncExternalStore` estava fixo em `false` por design (nunca afirmar
"Candidato" antes da hora num build pré-16/08) — mas isso significava que **todo build, mesmo depois de
16/08, continuava congelando o HTML estático em "Pré-candidato"** pra quem não roda JS (crawlers, prévia
de link do WhatsApp — confirmado por print real do Edson). Corrigido: servidor e cliente agora reavaliam
a mesma `isOfficialCampaignPeriod()`, já que não há mais risco de antecipar nada.

Termo "comitê financeiro" removido de todo lugar (rodapé público, PDF do recibo, Configurações, schema)
a pedido do Edson — mantido só razão social + CNPJ.

No repo `andre-santos`: favicon.ico e `app/icon.svg` trocados (triângulo "A" → monograma "AS"); moldura
de `/fotoperfil` atualizada pro tema novo (`tema-as.png`, Edson) com número eleitoral 30777 (antes 30321).

### Descoberta: integração Instagram/Metricool foi removida silenciosamente
`Campaign.metricoolToken`/`metricoolBlogId` ainda existem no schema, mas a página `/instagram` e as
rotas `/api/metricool/*` (documentadas como "✅ concluído" em `.claude/estado.md` maio/2026) não existem
mais no HEAD atual — sumiram num commit (`ae36261`) cuja mensagem não menciona isso. Campos órfãos no
banco; não investigado a fundo (fora do escopo da sessão).

### Pendente / decisões do Edson
- Monitoramento de notícias/menções (Google + Instagram + Facebook) sobre o André — pesquisado e
  explicado a viabilidade (Google é fácil via Alerts ou n8n; Instagram/Facebook não têm API pública pra
  monitorar menções de terceiros, só ferramenta paga tipo Brand24/Mention.com) — **Edson recusou as
  opções apresentadas, feature não construída, fica em aberto pra retomar de outro jeito no futuro.**

## Sessão 2026-08-11 (cont.) — Módulo Financeiro restrito — NO AR

Novo módulo `/financeiro` (visão geral, lançamentos, fornecedores) pra cadastrar fornecedores e lançar
despesas/receitas da campanha. Acesso restrito por e-mail via `isFinanceAdmin` (env var
`FINANCE_ADMIN_EMAILS`, hoje só `edsonluizz.silva@gmail.com`, configurada em Production e Preview na
Vercel) — separado do role `ADMIN` (compartilhado por 5 pessoas: Edson, André, Marcel, Everton, Fernando)
e de `isSuperAdmin`. Protegido em 3 camadas: middleware (`auth.config.ts` → redireciona se
`!isFinanceAdmin`, proteção de rota real que `/super-admin` ainda não tem hoje), todas as rotas
`/api/financeiro/**` (403 se não autorizado), e guarda client-side.

Models novos: `Supplier` (fornecedor) e `FinancialEntry` (despesa/receita), cada lançamento pode ser
ligado a uma `PayingEntity` (fonte pagadora — mesma André/Indiara/Jeffrey Chiquini já usada pros
pagamentos de cabos eleitorais) pra manter a prestação de contas TSE consistente em um lugar só. Suporta
upload de comprovante (imagem ou PDF), filtros (tipo/status/fonte), export XLSX, dashboard com
saldo/breakdown por fonte e categoria.

**Pendente:** se algum dia precisar dar acesso financeiro a mais alguém, é só adicionar o e-mail em
`FINANCE_ADMIN_EMAILS` na Vercel (Production + Preview) — não precisa mexer em código.

### Ligação /igrejas ↔ /financeiro + registro manual de entrega — NO AR
Marcar uma entrega de igreja como paga (aba Financeiro de `/igrejas`) agora cria automaticamente uma
despesa "Cabos eleitorais" já paga no `/financeiro`, com a mesma fonte pagadora — antes os dois sistemas
não se falavam e o saldo do financeiro ficava incompleto. Também, a pedido do Edson pra agilizar
lançamento retroativo de várias entregas de uma vez: a fonte pagadora agora pode ser escolhida já na
hora de "Atribuir dupla" (não só na hora de pagar), e tem um botão novo "Registrar entrega" em
`/igrejas` que marca uma atribuição como ENTREGUE com **data escolhida pelo admin** (não trava em hoje)
e, opcionalmente, já paga na hora — sem precisar da confirmação com foto pelo colaborador.

## Sessão 2026-08-09/11 — CNPJ da campanha, fontes pagadoras (chapa conjunta), remoção do Score de Mobilização, incidente crítico de disparo WhatsApp

### CNPJ da campanha + Fontes Pagadoras (chapa conjunta) — NO AR
Cadastro de dados do CNPJ (razão social, endereço) da campanha do André em Configurações →
"Dados Cadastrais (CNPJ)", persistido em `Settings` e estampado nos recibos eleitorais em PDF. Como a
campanha roda em chapa conjunta com outros candidatos que também pagam cabos eleitorais, criado o model
`PayingEntity` (CNPJ/razão social/endereço/candidato próprios por fonte). Cada entrega (`ChurchAssignment`)
pode ser atribuída a uma fonte pagadora específica antes do pagamento (seletor na aba Financeiro de
/igrejas); ao pagar, o sistema agrupa automaticamente por fonte e gera um recibo por CNPJ (nunca mistura
pagadores no mesmo documento). Relatório financeiro ganhou filtro por fonte + export XLSX com cabeçalho
identificando o pagador. Cadastradas em produção: André (padrão), Indiara Barbosa Custódio (Deputada
Federal) e Jeffrey Chiquini da Costa (Deputado Federal) — dados via cartões CNPJ enviados pelo Edson +
consulta pública (receitaws.com.br) pra Indiara.

### Score de Mobilização — REMOVIDO
Analisado a pedido do Edson e confirmado que não tinha função real: não filtrava, ordenava nem priorizava
nada em nenhuma tela, só era exibido (badge, KPI, top-5, export). Removido por completo: coluna no
schema, lib de cálculo, endpoint/botão de recálculo, auto-recálculo em presença de evento, exibições em
colaboradores, KPI "Score médio", painel de engajamento, coluna no export, filtro morto no broadcast,
coluna no init SQL de tenant, e menções na landing page pública e no deck de treinamento.

### Incidente crítico: disparo WhatsApp reenviando pra mesma pessoa — RESOLVIDO
Disparo "Agora é OFICIAL - #1" (136 destinatários) ficou preso 2+ dias mostrando 100% de progresso falso
(sentCount chegou a 201, maior que o total). Investigação em 3 camadas:
1. **Nosso código** (`/api/n8n/broadcast/next` e `/api/n8n/broadcast/delivery/[id]`): contador não era
   idempotente e a entrega não era reservada atomicamente — corrigido com novo status `SENDING`
   (reserva com expiração de 10min) e contadores só somando na 1ª confirmação.
2. **Circuit breaker**: limite de 5 confirmações por entrega — acima disso força FAILED e pausa o
   broadcast automaticamente, contendo qualquer dano mesmo que a causa externa não esteja corrigida.
3. **Causa raiz real, no workflow do n8n** (`Ovile — WF5: Manual de Transmissão`,
   `andresantos.app.n8n.cloud/workflow/9UD6uQGhOtLQjbAz`): o loop usava dois nós HTTP separados pra
   "buscar próxima entrega" (um pro início, outro pro retorno do loop), e os nós de envio/confirmação
   referenciavam os dados pelo NOME do primeiro nó (`$('Buscar próxima delivery')`) em vez de relativo
   (`$json`) — em loop manual (sem Split-in-Batches), isso sempre resolve pro dado da 1ª execução da
   run, não da volta atual. Resultado: cada volta do loop reenviava pra MESMA pessoa capturada no
   início, enquanto o nó duplicado reservava (sem mensageiar) o resto da fila. Também havia 2 nós IF
   comparando booleano como string, derrubando a execução toda vez que a condição virava verdadeira —
   por isso rodava 15h–25h e só parava por erro. Corrigido consolidando o loop num nó só, religando as
   confirmações de volta pra ele, e trocando as comparações pro tipo Boolean nativo — tudo aplicado via
   `GET`/`PUT /api/v1/workflows/{id}` da API REST do n8n (criei chave temporária, editei o JSON em
   Python, mandei de volta, revoguei a chave — muito mais confiável que arrastar conexão no canvas via
   automação de navegador). Ver [[andre_santos_broadcast_stuck_incident]] na memória pra detalhe completo.
   **Broadcast ficou pausado manualmente em produção** — retomar clicando "Notificar n8n de novo" na
   tela do disparo quando o Edson quiser reenviar pros 135 restantes.

### Próximos passos
Módulo financeiro restrito (fornecedores, despesas/receitas ligadas a `PayingEntity`, acesso via flag
`isFinanceAdmin` separado do role ADMIN) — planejamento já alinhado com o Edson, implementação pendente.

## Sessão 2026-08-06 (tarde) — Diagnóstico de dados + estratégia "45 Dias de Chão" (sem alteração de código)

A pedido do Edson: estratégia territorial completa para os 45 dias de campanha (16/ago–29/set/2026),
cruzando dados reais do banco de produção com a agenda sincronizada do Google Calendar. Entregue como
Claude Artifact (documento fora do repo) — não gerou PR nem deploy, nenhum arquivo do projeto alterado.

### Método
Consulta direta ao banco de produção via `vercel env pull` + Prisma 7 com `@prisma/adapter-pg`
(**nota técnica:** `datasourceUrl` sozinho no construtor do `PrismaClient` não funciona mais no client
engine do Prisma 7 — dá `PrismaClientConstructorValidationError`; é obrigatório usar o `adapter` do
`@prisma/adapter-pg`/`@prisma/adapter-neon`). Scripts temporários deletados ao final da sessão, junto
com `.env.production.local`.

### Achados de dados (estado real do CRM, não bug — mas relevantes pro produto)
- **64% da base (1.680 de 2.628 Collaborator) está sem `city` preenchido** — maior bolsão invisível
  no `/mapa`. Recomendação registrada no plano: campanha de complemento de cadastro (1 campo só).
- **165 `Church` cadastradas, 100% em bairros de Curitiba** — nenhuma no litoral ou interior, apesar
  de 151 colaboradores com `profile=PASTOR` espalhados pela base.
- **Apenas 1 das 165 igrejas tem `pastorId` vinculado** a um Collaborator — relação pastor↔igreja
  quase toda por preencher.
- **As 6 `Zone` cadastradas têm 0 `ZoneCollaborator` vinculado** — estrutura existe no schema, ainda
  não é usada operacionalmente.
- **`WhatsAppGroupMember` vazio (0 registros)** nos 7 `WhatsAppGroup` cadastrados — sistema não sabe
  quem está em qual grupo real (mesmo com o disparo via Broadcast agora robusto, ver sessão abaixo).
- **`MunicipalityGoal` da RMC soma ~11.600 votos** — abaixo da meta real de 30.000 que o Edson definiu
  para a região; sugerido recalibrar os targets municipais da RMC.
- Litoral (Antonina/Paranaguá/Pontal/Guaratuba/Matinhos) tem só 8 `Collaborator` no total; Pontal do
  Paraná não tem nenhum registro.

---

## Sessão 2026-08-03/06 — Bugs de sessão, Agenda↔Google, Eleitos 2022, WhatsApp robusto, paleta da campanha

### Bug crítico: `useSession()` client nunca resolvia a sessão real — CORRIGIDO
`src/components/session-provider.tsx` tinha `session = null` como default e sempre repassava
esse valor pro `SessionProvider` do next-auth. No next-auth v5, passar `session` explicitamente
(mesmo `null`) sinaliza "sessão já resolvida no servidor" e o client pula o fetch inicial em
`/api/auth/session` — `useSession()` ficava travado em `null` pra sempre em todo componente
client (agenda, onboarding, whatsapp, super-admin). Fix: default pra `undefined` (prop
realmente opcional). Sidebar nunca quebrou porque recebe o cargo via prop do servidor, com o
hook como fallback.
**Efeitos colaterais liberados por esse fix** (comportamentos que nunca funcionaram até aqui,
agora passam a valer): botão de WhatsApp individual vs. institucional (`whatsapp-send-button.tsx`),
tela "admin only" de `/whatsapp`, link de indicação em `/onboarding` (nunca apareceu pra
ninguém), badge "Proprietário" em `/super-admin`.

### Agenda ↔ Google Calendar: correção unidirecional — NO AR
`src/lib/gcal-sync.ts` (`forceSyncFromGoogle`) + `POST /api/google-calendar/force-sync` +
botão "Corrigir com Google" em `/agenda` (só ADMIN). Trata o Google Calendar como fonte da
verdade pra eventos futuros: sobrescreve divergências, casa eventos locais sem vínculo por
data+título, importa o que falta, remove local o que não existe mais no Google — nunca escreve
de volta no Google (evita contaminar a fonte da verdade com dado local errado). Usado e
validado em produção pelo Edson.

### Meu Perfil — mostra dados reais do usuário — NO AR
Antes só mostrava nome (legenda pequena) + CPF. Agora mostra foto do Google (com fallback de
iniciais via `Avatar`/`AvatarFallback`), e-mail, telefone, cidade/bairro e cargo na campanha.
Nome/e-mail/foto vêm do servidor (`auth()`) como prop pro form client.

### Segurança crítica: `/relatorio` vazava dados financeiros — CORRIGIDO
Página e as 3 rotas de export (PDF/XLSX/CSV) só checavam login, não role — qualquer
MEMBER/VOLUNTARIO acessando a URL direto via dados financeiros da campanha (pago/pendente,
top líderes). Sidebar escondia o link mas isso nunca foi proteção real. Fix: gate
`["ADMIN","LEADER"].includes(session.user.role)` nas 4 rotas, igual ao padrão já usado em
`collaborators/export`. Achado pela auditoria completa pedida pelo Edson.

### Eleitos PR 2022 — inclui não eleitos de Dep. Estadual/Federal — NO AR
`dep-estaduais.json`/`dep-federais.json` regerados a partir dos dados abertos do TSE
(`votacao_candidato_munzona_2022`, filtrado UF=PR) — antes só tinham os 54+30 eleitos, agora
860+600 candidatos reais (eleito/não eleito/suplente, `#NULO` excluído) com voto somado por
candidato. Números dos eleitos mudaram levemente da versão antiga (fonte mais completa/recente
do TSE). `EleitoralPanel` ganhou filtro Eleitos/Todos (default Eleitos) + badge de situação.
Município por candidato (`-municipios.json`) NÃO foi regerado — só existe pros eleitos antigos;
não eleitos mostram "dados não disponíveis" no modal, sem quebrar.

### WhatsApp — de "sem visibilidade" pra robusto — NO AR
Contexto: Z-API tinha ficado desconectado do celular (sintoma real era `HTTP 400 "You need to
be connected with whatsapp"` da própria Z-API, **não** o bug de decrypt que uma sessão anterior
suspeitava — corrigido via reconexão manual do Edson no painel Z-API, não é fix de código).

Depois de reconectado, o "sistema de disparo" já tinha um backend robusto (Broadcast +
BroadcastDelivery com tracking por destinatário, pacing anti-ban, dailyLimit) mas **zero UI**
pra usar isso — a única tela (`/comunicados`) era um sistema separado e mais simples de
e-mail/Telegram. Construído nesta sessão:
- `/comunicados/disparos` (lista) + `/comunicados/disparos/[id]` (detalhe): status,
  progresso, breakdown por status de entrega, pausar/retomar/cancelar/reenviar falhas.
- Agendamento real: `scheduledFor` existia no schema mas nunca era checado em
  `/api/n8n/broadcast/next` — agora é respeitado; `DisparoForm` ganhou o campo de data/hora.
- Ação `start` (promove DRAFT → QUEUED) e `kick` (reenvia só a notificação webhook pro n8n,
  sem mexer em status/dados — pra quando a notificação original falhou silenciosamente).
- **Variação automática de mensagem por destinatário** (anti-ban, sem IA):
  `src/lib/message-variation.ts` troca saudação/fechamento por sinônimos equivalentes
  (Olá↔Oi↔Opa, Obrigado↔Grato, etc.) + emoji sutil no final, determinístico por
  `delivery.id`. Nunca toca o conteúdo real da mensagem. Campo `Broadcast.varyMessage`
  (default true), checkbox + preview de 3 exemplos no `DisparoForm`.

**Incidente real corrigido ao vivo:** o disparo "Agora é OFICIAL - #1" (136 destinatários,
`CADASTRO_PUBLICO`) ficou `QUEUED` sem processar nada por ~30min — diagnosticado abrindo o
n8n (`Ovile — WF5: Broadcast Manual`, workflow id `9UD6uQGhOtLQjbAz`) e vendo **zero
execuções**: a notificação webhook na criação (fire-and-forget, sem retry) simplesmente não
chegou lá naquela hora. Testado que o webhook em si funciona normal. Usado o botão "Notificar
n8n de novo" (ação `kick`) pra reenviar — funcionou, execução rodou com sucesso, confirmado
1/136 enviado com status "Enviando" antes do fim da sessão (conclusão dos 136 não verificada
ao vivo — checar `/comunicados/disparos/cmsi75a57000004kvlf7ztczh` se precisar confirmar).

### Paleta de cores — rebrand pra identidade oficial da campanha 30777 — NO AR
Trocado o dourado (`#d4af37`/`#d4a817`) pela paleta oficial (arquivo do Edson em Downloads:
"paleta de cores andre santos - campanha.jpeg"): **laranja `#ff6b04`** (principal/CTA) e
**azul petróleo `#005578`** (orbs de fundo). Cobre `globals.css` (dark+light), token Tailwind
`gold` (usado na landing pública), e ~15 arquivos com hex/rgba hardcoded fora do sistema de
variáveis (telas de erro, login, cadastro público, ebook, export XLSX, ícones PWA). Nomes de
classe/variável antigos (`.gold-glow`, chave `gold` no XLSX) mantidos por compatibilidade.

### Pendência não resolvida
- `RESEND_API_KEY` — mesma pendência de 2026-07-28, não confirmado se foi adicionado desde
  então. Verificar antes de assumir que e-mail funciona.

---

## Sessão 2026-07-28/29 — Recibos de pagamento, dupla opcional, CPF do colaborador

### Feature: Recibos de pagamento (Financeiro de Entregas — Igrejas) — NO AR
Branch `feat/recibos-pagamento-igrejas` mergeada em `main`.
- Model `PaymentReceipt` + enum `ReceiptChannelStatus` (SKIPPED/SENT/FAILED).
- `generateAndSendReceipt` (`src/lib/receipts.ts`): gera PDF (pdfkit) consolidado por lote de
  pagamento, sobe pro Vercel Blob, envia por email (Resend, anexo) e WhatsApp (Z-API,
  `zapiSendDocument`) — best-effort, nunca desfaz o pagamento já commitado.
- `pay`/`pay-bulk` disparam o recibo automaticamente (só assignments que não eram no-op).
- `POST /api/payment-receipts/:id/resend` — reenvio manual por canal, idempotente.
- `GET /api/church-assignments/payments/export` — XLSX do agregado financeiro.
- `FinanceiroTab`: botão Exportar XLSX + indicadores de canal (✓/✗ reenviar/—) + link PDF.
- **Reformulado depois pra formato de recibo eleitoral formal** (a pedido do Edson, "TSE"):
  título "RECIBO ELEITORAL", referência à Lei 9.504/1997 + Resoluções TSE, numeração, valor
  por extenso, assinatura com CPF do colaborador. **Não expõe mais o nome da igreja** — só a
  `Church.regional` (localidade) — por prudência em não vincular igrejas a movimentação
  financeira de campanha publicamente.

### Pendências de configuração encontradas ao testar o envio (NÃO RESOLVIDAS)
- ⚠️ **`RESEND_API_KEY` não existe nas env vars de produção da Vercel** (só `RESEND_FROM`
  está setado). Todo o canal de email do recibo (e de qualquer outro fluxo que use
  `src/lib/email.ts`) está com o código certo mas nunca envia nada até essa chave ser
  adicionada em `vercel env add RESEND_API_KEY production`.
- ⚠️ **Z-API não descriptografa com a `APP_ENCRYPTION_KEY` atual** — testado diretamente
  contra o banco de produção, erro `Unsupported state or unable to authenticate data`
  (AES-GCM auth tag mismatch) tanto em `zApiToken` quanto `zApiClientToken` de
  `Campaign.andre-santos-2026`. Mesmo padrão do incidente de 2026-06-06 acima, mas parece
  ter voltado — **provavelmente todo envio de WhatsApp da campanha está quebrado agora**,
  não só recibos. Fix provável: re-colar o Client-Token em Configurações → Integrações
  (gera criptografia nova com a chave atual), mas não foi confirmado/aplicado nesta sessão.

### Fix: dupla de igrejas aceita 1 pessoa (member2 opcional) — NO AR
Branch `fix/dupla-igrejas-opcional` mergeada. `ChurchAssignment.member2Id` virou opcional
no schema, na API de atribuição (`POST /api/churches/:id/assignments`), no `AssignDialog`,
e em todo o fluxo financeiro (`church-payments.ts`, exibição em `/igrejas`). Dupla continua
sendo o ideal, mas atribuir só 1 pessoa não trava mais o salvamento.

### Feature: CPF do colaborador — NO AR
Branch `feat/cpf-recibo-localidade` mergeada (junto com a reformulação do recibo acima).
- `Collaborator.cpf` (schema) + `src/lib/cpf.ts` (validação módulo-11 + máscara).
- Onboarding (`completar-perfil`) agora exige CPF pra novos colaboradores.
- **Nova página `/meu-perfil`** (link na sidebar, visível a qualquer colaborador logado) +
  `GET/PUT /api/collaborators/me` — pra quem já tinha conta (passou pelo onboarding antes
  do campo existir) conseguir cadastrar o CPF depois, já que `completar-perfil` só aparece
  uma vez (gate por telefone preenchido).

### Bug de login de colaboradores convidados (não-master) — AINDA NÃO RESOLVIDO
Reportado pelo Edson: colaboradores que não são o usuário master (ex: Jimmy Alan,
jimmyalanoliver@gmail.com) às vezes veem "Erro do servidor" (`/api/auth/...`, tela padrão
do NextAuth — mensagem de "Configuration") logo após o login com Google, e não são
redirecionados pro `/dashboard` — mas se navegam manualmente pra `/dashboard` depois,
funciona (sessão já estava válida). NÃO é a tela `/sem-acesso` do app.
**Hipótese não confirmada:** o callback `jwt` em `src/lib/auth.ts` faz uma sequência pesada
de queries só pro caminho de convite pendente (linkar collaborator por email, ativar
convite numa transação) — caminho que o usuário master não percorre (não tem convite
pendente) — podendo estourar o tempo da função serverless (`maxDuration=30` declarado em
`src/app/api/auth/[...nextauth]/route.ts`, mas o plano Vercel pode ter um teto real menor).
**Não foi possível confirmar via logs** — o retention de runtime log da Vercel neste plano
parece muito curto (minutos, não horas), mesmo pedindo `--since` maior. Tentativa de captura
ao vivo (`vercel logs --follow`) rodada 2x nesta sessão sem coincidir com uma tentativa real
de login do Jimmy. **Próximo passo:** pedir pro Jimmy tentar logar enquanto o log ao vivo
está rodando, ou considerar mover a lógica pesada do `jwt` callback pra fora do caminho
crítico do login (ex: processar convite pendente de forma assíncrona/lazy).

---

## Incidente — Z-API Client-Token corrompido (2026-06-06, RESOLVIDO)

**Sintoma:** WhatsApp parou de enviar (WF3/WF4) após a remoção do Z-API hardcoded.
**Causa raiz:** `Campaign.zApiClientToken` no banco estava num formato de cripto ANTIGO
(sem prefixo `v1:`). `decrypt()` (crypto.ts:59) retorna o valor cru quando não há `v1:`
(assume "legado plain") → entregava 104 chars de ciphertext ao n8n → Z-API rejeitava o
header Client-Token → 0 mensagens. Antes ficava mascarado porque o código usava o
Client-Token hardcoded como fallback; ao removê-lo (Sprint 24 segurança), o valor
corrompido do banco passou a valer.
**Fix:** Edson recolou o Client-Token correto em /configuracoes → Integrações → re-salvou
com encrypt() atual (gera `v1:`) → decrypt volta a funcionar (34 chars). Diagnóstico via
`GET /api/n8n/config` (clientTokenLen 104→34) + Z-API `/status` (connected=true).
**Lição:** ao migrar/remover fallback de credencial, validar que o valor do banco
descriptografa para um formato plausível. Possível hardening futuro: sanity-check de
comprimento no config/route.ts (cair no env fallback se o token resolvido for implausível).

---

## Sprint 24 (2026-06-06) — Auditoria Profunda + Segurança Crítica

Auditoria em 4 eixos (segurança 4/10, performance 6.5/10, qualidade ~7/10, design 6.5/10).

### Correções de segurança aplicadas (frente "Segurança crítica")
- **Z-API hardcoded removido** (`api/n8n/config/route.ts`): instance/token/client-token
  saíram do código → agora vêm de env vars `ZAPI_INSTANCE` / `ZAPI_TOKEN` / `ZAPI_CLIENT_TOKEN`.
  ✅ **RESOLVIDO 2026-06-06:** Edson rotacionou no Z-API e salvou em /configuracoes →
  Integrações (gravado criptografado em Campaign.zApi*, lido via getCampaignIntegrations).
  Não precisou de env var (banco tem prioridade). Credenciais antigas do Git = lixo.
- **IDOR cadastro público fechado** (`lib/tenant-resolver.ts`): tenant resolve EXCLUSIVAMENTE
  pelo host. Removidos ramos `header`/`explicit` que permitiam inserir leads cross-tenant
  via `campaignId` no body. `cadastro/route.ts` não passa mais `explicitCampaign`.
- **/api/settings GET** não retorna mais `googleRefreshToken` (mesmo criptografado) — só
  `googleCalendarConnected` (boolean). `configuracoes/page.tsx` ajustado.
- **5 endpoints debug/one-shot removidos:** `debug-env`, `debug-tenants`, `debug-city`,
  `backfill-toledo`, `normalize-phones`. Mantidos `seed-tenants`/`seed-whatsapp-groups`
  (provisionamento Miriam pendente).

### Frente "Resiliência/burst" — APLICADA (2026-06-06)
- ✅ +3 índices quentes em Collaborator (registeredById+status, lastContactedAt, supportStatus)
- ✅ `ranking`/`my-cell`/`collaborators/stats`/`mapa` migrados para `groupBy` (não puxam
  mais a tabela inteira p/ agregar em JS)
- ✅ Import em lote: N+1 eliminado (dedup + responsável pré-carregados em Map/IN; 1000+
  queries → ~2 + creates) + `maxDuration=60`
- ✅ `maxDuration=60` em relatorio/export, export-xlsx, collaborators/export, whatsapp/broadcast
- ✅ **RESOLVIDO 2026-06-07 (PLAN phoneNormalized, 3 steps):** campo `phoneNormalized`
  (últimos 8 dígitos) + `@@index([campaignId, phoneNormalized])`. Escrita popula em todos os
  caminhos (cadastro público, import, POST/PUT manual). Backfill one-shot rodou: **1.520
  registros** atualizados (2ª passada = 0, cobertura total). Dedup do cadastro público agora
  é lookup indexado O(log n) — fim do full-scan. Fecha o último risco de burst Gospel Class.
- ℹ️ `xlsx` (parse client) e `exceljs` (geração server) são ambos necessários — não remover.

### Backlog da auditoria (frentes não escolhidas)
### Frente "Build/qualidade" — PARCIAL (2026-06-06)
- ✅ `zod` declarado em package.json (^3.25.76) + lock sincronizado (era transitivo; risco
  de quebrar build da captação de leads)
- ✅ Dead code removido: `src/context/` (vazia), `api/admin/seed-tenant-db/` (vazia),
  `prisma.config.ts.bak`
- ✅ **`tsc --noEmit` RODADO 2026-06-07** (via clone temporário em `C:\Users\usuario\ovile-tsc`,
  fora do Drive — `npm install` funciona lá). Revelou **30 erros** mascarados.
  - **7 bugs funcionais corrigidos:** `recalcTier()` chamado c/ 1 arg em 3 lugares (tier NUNCA
    recalculava); 3 cidades duplicadas em tse.ts; comparação morta em cadastro-form.
  - **23 type-errors restantes (não quebram runtime), documentados p/ correção futura:**
    - Padrão Select `string|null` (~10): celulas:394/459, colaboradores:543, comunicados:191,
      comunicados/disparar:238/253, metas:167, tarefas:222/246, super-admin:406/414 → fix `?? ""`
    - Libs/workarounds (~13): choropleth-map (react-simple-maps sem @types), tenant-db:17 (Pool→
      PoolConfig Neon), export:209 (Buffer→BodyInit ExcelJS), comunicados:95 (asChild no Button
      base-ui), grupos:247 (title em ícone Lucide), grupos:261, super-admin:718, bulk-invite:191
      (JSON index sig), cadastro:124, telegram/status:23, edit-collaborator-button:38, sidebar:119
  - **Flag `ignoreBuildErrors`: MANTIDA true.** Reativar exigiria zerar os 23 E o Edson não roda
    local (testa no Vercel) → um type-error cosmético bloquearia deploy urgente. Dívida mapeada
    acima; corrigir incrementalmente quando conveniente, então flipar a flag.
- ✅ **2026-06-07:** removido `--accept-data-loss` do build (era o risco real: dropava dados em
  divergência). Agora aditivo aplica, destrutivo falha sem destruir. Migrate deploy completo
  (baseline + migrations versionadas) NÃO adotado — exige resolve manual contra prod + muda o
  workflow (sem ambiente local). Documentado como opção futura se necessário.
- 📌 NÃO feito (baixo valor): 130 console.log → logger condicional; next-auth.d.ts p/ tipos.

### Backlog da auditoria (frente não escolhida)
### Frente "Design/UX" — APLICADA (2026-06-06)
- ✅ `button.tsx`: glow hover indigo → gold (afetava todo botão primário)
- ✅ `gradient-title` + `page-header` em 17 páginas (zonas, grupos, tarefas, agenda, metas,
  planejamento, instagram, eleitos-2022, campanhas, nova-campanha, colaboradores,
  colaboradores/[id], configuracoes, mapa, super-admin, comunicados/disparar; onboarding só
  gradient-title por ser hero centralizado). + dashboard/comunicados que já tinham.
- ✅ h1 padronizado `text-xl lg:text-2xl` (planejamento saiu de text-3xl)
- ✅ Empty states ricos com CTA: zonas/grupos/tarefas; loading `animate-shimmer` nas mesmas
- ✅ `min-w-[640px]` nas tabelas do planejamento (scroll mobile)
- ✅ **2026-06-07:** `completar-perfil-form.tsx` refatorado (estilos inline → tokens, suporta
  tema claro, htmlFor/id, aria-pressed). + **14 aria-label** em botões ícone-only (celulas,
  colaboradores, agenda, grupos, tarefas, eleitos-2022).
- 📌 Backlog menor remanescente: `htmlFor`+`id` nos Labels dos dialogs (comunicados/grupos/zonas/
  super-admin); contraste `text-muted-foreground/30-40` → /70; `animate-fade-in-up` em grids;
  empty-CTA em metas/mapa.
- **Outros seguranças (não-críticos):** CSP com unsafe-inline/unsafe-eval, cron fail-open
  se CRON_SECRET ausente, telegram webhook sem secret-token, comparação Bearer não timing-safe.

---

## Sprint 23 (2026-06-06) — Unificação Menus Células + Design System Upgrade (anterior)

---

## Sprint 23 (2026-06-06) — Unificação Menus Células + Design System Upgrade

### Unificação menus Células/Minha Célula/Ranking (concluído)
- `/celulas/page.tsx` reescrito como página com 3 abas: **Minha Célula | Todas as Células | Ranking**
- `/minha-celula/page.tsx` e `/ranking/page.tsx` → redirect simples para `/celulas`
- Sidebar: 3 itens → 1 item "Células" (minRole MEMBER); `Trophy` removido do import, `Star` mantido (usado no header)
- Mobile bottom nav: "Relatório" substituído por "Células"; indicador ativo corrigido (dot, não absolute bar)
- Aba padrão: "Minha Célula" (estado local `useState`, sem `useSearchParams` — evita Suspense boundary)

### Design System Upgrade (concluído)
**`globals.css`:**
- `glass-card` ganhou `transition` + hover glow (ring gold sutil)
- `animate-fade-in-up` e variantes escalonadas (-1 a -4)
- `animate-shimmer` para loading states (dark + light)
- `.page-header` com underline gradiente gold via `::after`
- `.gradient-title` texto em gradiente gold (dark + light)
- `.stat-pill` badge numérico padrão
- Body gradient mais rico (3 color stops)

**Dashboard `page.tsx`:**
- H1 com `gradient-title` e container `page-header`
- Barras "Por Cargo" com cores individuais por cargo (`ROLE_BAR_COLOR`) e altura h-2
- Cards de município: hover, número `text-2xl font-black`
- Estado vazio "Próximos Eventos" com ícone + link "Agendar evento"
- Contadores Minha Célula com bordas coloridas (primary/green)
- Banner onboarding com ícone Star animado

**KPI Card:**
- Glow hover dinâmico baseado na cor da prop (não gold fixo)
- Ícone container com fundo colorido a 8% de opacidade
- Barra colorida na base (w-12 → w-full ao hover), derivada da cor
- Padding mobile p-3 → p-3.5

**Comunicados:**
- Header responsivo (flex-col sm:flex-row) + `gradient-title`
- Cards com barra lateral gold (gradient from-primary/60 to-primary/20)
- Audiência e sentCount como pills com borda
- Loading substituído por `animate-shimmer`
- Estado vazio elaborado com ícone + CTA "Primeiro Comunicado"
- Contador audiência como pill destacado

**Sidebar:**
- Grupos de navegação com labels: **Base / Coordenação / Administração** (apenas quando expandida)
- Colapsada: comportamento inalterado (ícones + tooltip)

---

## Sprint 22 (2026-06-04 → 05) — Roteamento Regional + Fix n8n Webhooks

### Roteamento regional WhatsApp (concluído)
Quando lead responde SIM ao WF2, sistema identifica city → mapeia PRRegion → busca WhatsAppGroup dessa região → retorna link correto no welcome (ao invés de link fixo).

- **Schema:** enum `PRRegion` (RMC/LITORAL/NORTE/NOROESTE/OESTE/SUDOESTE/SUL/CENTRO/OUTROS) + `WhatsAppGroup.region` + `WhatsAppGroup.isFallback`.
- **`src/lib/pr-regions.ts`** — ~150 municípios PR mapeados (`regionForCity(city)` → enum). Normaliza acento+caixa, fallback OUTROS.
- **Endpoints (Bearer N8N_API_KEY):**
  - `POST /api/n8n/seed-whatsapp-groups` — cria/atualiza 4 grupos (OESTE, LITORAL, SUDOESTE, GERAL fallback). Já executado em prod.
  - `GET /api/n8n/group-for-lead?phone=X` — resolve grupo pelo telefone.
  - `GET /api/n8n/find-lead?city=X` — busca leads por city contains.
  - `POST /api/n8n/trigger-lead?lead_id=X` — dispara WF3 manualmente (testes).
  - `GET /api/n8n/debug-env` — inspeciona metadata das envs sem revelar (length, prefix, hasAngleBrackets).
- **`/api/n8n/config?lead_phone=X`** — quando passado, resolve grupo regional e substitui `{groupLink}` no welcome. Retorna `groupRegion` + `groupSource`.
- **WF2 atualizado via API n8n** — passa `lead_phone={{encodeURIComponent($('Extrair telefone e texto').item.json.fromPhone)}}` no node "Buscar config Ovile". PUT 200, active=True.

### Fix paths webhooks n8n WF4/WF5 (concluído código + n8n; env Vercel PENDENTE validação)
**Bug raiz:** WF4 e WF5 estavam com mesmo path `ovile-disparo-manual`. No n8n cloud só 1 workflow ativo escuta por path → bulk-invite (que esperava WF4) era recebido pelo WF5, que quebrava no node "Buscar próxima delivery" com 400 "broadcastId obrigatório". **Nenhuma mensagem bulk-invite foi enviada de verdade até 2026-06-04.** Pior: WF4 (disparo-manual) **nunca tinha sido importado no n8n cloud** — só existia o JSON local.

Padronização aplicada:
| WF | ID n8n | Path |
|---|---|---|
| WF1 disparo-agendado | `3zMetjbtuIUt3JGX` | (cron) — INACTIVE |
| WF2 resposta-whatsapp | `ZDkd1oS1P8VdSh2l` | `ovile-resposta-wa` ATIVO |
| WF3 lead-novo-imediato | `u7pCdMoHT5uqZKet` | `ovile-lead-novo` ATIVO |
| WF4 disparo-manual | `gw1BlNhKzLAU1ukz` (NOVO) | `ovile-bulk-invite` ATIVO |
| WF5 broadcast-manual | `9UD6uQGhOtLQjbAz` | `ovile-broadcast` ATIVO (renomeado) |

- `broadcast/route.ts` agora usa `N8N_BROADCAST_WEBHOOK_URL` (fallback `N8N_MANUAL_WEBHOOK_URL`).
- `triggerManualInviteBatch` em `lib/n8n.ts` ganhou log detalhado (url preview + err.name no catch + body da resposta).

### ⚠️ PENDENTE — env Vercel
Durante o teste de validação, logs mostraram URL ainda começando com `<http...` — env `N8N_MANUAL_WEBHOOK_URL` ainda tinha `<` e `>` em volta do valor. Após o usuário corrigir e redeployar (último deploy `dpl_HUhGZX...` READY), **o teste end-to-end não foi feito ainda**.

Envs corretas Vercel Production (devem estar sem `<>`, sem aspas, sem espaços):
```
N8N_MANUAL_WEBHOOK_URL=https://andresantos.app.n8n.cloud/webhook/ovile-bulk-invite
N8N_BROADCAST_WEBHOOK_URL=https://andresantos.app.n8n.cloud/webhook/ovile-broadcast
```

Validar: bulk-invite Foz → WF4 → 2-4min → lead recebe → SIM → WF2 → welcome com link OESTE.

---

**Última atualização anterior:** 2026-05-31 (Sprint 14 + WF2 reimport + fix phone lookup; card n8n nas Integrações; ebook capture aguardando decisão)
**Plano de produto:** `.claude/ovile-plano.md` — SaaS multi-tenant eleitoral
**Domínio:** ovile.com.br (migrado do projeto Ovile igreja)
**GitHub:** https://github.com/edsonluizzz/base-andre-santos
**Deploy:** Vercel — base-andre-santos.vercel.app · último deploy: `fb2f05e` (READY)

---

## Status Atual

Sistema funcional e em produção. Terminologia "Base de Apoio" (não "campanha") em todos os textos visíveis — requisito legal pré-campanha.

---

## Módulos

| Módulo | Rota | Status |
|--------|------|--------|
| Planejamento | `/planejamento` | ✅ ADMIN only · análise STRIDE × sistema · GAPs dinâmicos via $queryRaw |
| Dashboard | `/dashboard` | ✅ KPIs + VelocityPanel (crescimento/semana por cidade) + FunnelPanel |
| Colaboradores | `/colaboradores` | ✅ XLSX/CSV import (upsert duplicatas · CEP auto · responsavel_email) · filtros avançados (origem, perfil, canal, apoio, cidade, líder) · seleção em massa · bulk status · alerta 30d+ sem contato · "Marcar contato hoje" |
| Perfil colaborador | `/colaboradores/[id]` | ✅ score breakdown (5 componentes) · canal/fonte/lastContactedAt · histórico completo presenças |
| Mapa de Apoio | `/mapa` | ✅ choropleth PR · zoom/pan · tooltip hover · cards clicáveis por status de apoio |
| Zonas | `/zonas` | ✅ |
| Grupos WhatsApp | `/grupos` | ✅ quick assign zona inline (GAP7) · gerenciamento de membros |
| Agenda | `/agenda` | ✅ calendário mensal + lista · modal detalhe · painel do dia · sync Google Calendar bidirecional · AttendanceDialog (presenças P/A/J) · QR Code evento |
| Comunicados | `/comunicados` | ✅ filtro por audiência + envio real Telegram + email Resend batch · sentCount real |
| Configurações | `/configuracoes` | ✅ logo · join code · Google Calendar · botão "Sugerir metas TSE/IBGE" · botão "Recalcular scores" |
| Relatório | `/relatorio` | ✅ KPI cards clicáveis · filtros · funil · crescimento · capital político · CSV + XLSX · EngagementPanel (top presenças, top scores, alertas 30d+) |
| Minha Célula | `/minha-celula` | ✅ tier · stats · link de convite · gestão de status · **Minhas Tarefas** (checkbox, prazo colorido, prioridade) |
| Tarefas | `/tarefas` | ✅ ADMIN only · todas as tarefas agrupadas por usuário · filtros PENDING/DONE/ALL · toggle/delete · modal nova tarefa com seletor de responsável |
| Metas | `/metas` | ✅ Meta × Realizado por município · velocidade +X/sem · data estimada colorida · KPI "Crescendo" |
| Instagram | `/instagram` | ✅ grid posts/reels · KPIs · range 7/30/90d · widget no dashboard (req. METRICOOL_TOKEN) |
| Células | `/celulas` | ✅ visualização hierárquica |
| Ranking | `/ranking` | ✅ scroll horizontal mobile |
| Super Admin | `/super-admin` | ✅ todas as seções expansíveis (acesso, pendentes, links, duplicatas, auditoria) |
| Cadastro público | `/cadastro` | ✅ sem auth · Short YouTube `z_9zver8iN0` (9:16 autoplay) · auto-copia link pessoal · redirect automático grupo WA em 60s · link compartilhável · channel via ?ch= |
| Instagram | `/instagram` | ✅ grid posts/reels · KPIs · range 7/30/90d · correlação posts×cadastros · widget dashboard |
| Convite por link | `/entrar?token=X` | ✅ email-first flow · Google OAuth · completar-perfil |
| Privacidade | `/privacidade` | ✅ LGPD Art. 9 · público |
| Notificações | sidebar | ✅ badge de não lidas · dropdown · marcar como lida |
| Onboarding | `/onboarding` | ✅ boas-vindas + tour de features |

---

## APIs

- `/api/collaborators` — CRUD + filtros (role, status, city, mine, registeredBy, sourceType, profile, channel, supportStatus, **dateFrom/dateTo** por createdAt) · search inclui `source` · POST chama `ensureCityGoal` automaticamente
- `/api/collaborators/[id]` — GET/PUT/DELETE
- `/api/collaborators/[id]/contact` — POST: marca `lastContactedAt = now()`
- `/api/collaborators/import` — bulk XLSX/CSV (max 500 linhas) · upsert por telefone · lookup CEP automático · `responsavel_email` para atribuir a outro usuário · `source` sempre "IMPORTACAO_XLSX" · origem vai para `notes`
- `/api/collaborators/bulk` — PATCH status/campaignRole/supportStatus em massa (max 500)
- `/api/events/[id]/attendance` — GET lista presenças · POST batch (delete+createMany, recalcula score)
- `/api/tasks` — GET (`?all=true` para ADMIN retorna todas com nome) · POST cria tarefa
- `/api/tasks/[id]` — PATCH toggle PENDING↔DONE · DELETE
- `/api/tse/municipios-pr` — GET (ADMIN) sugestões de meta: 0,5% eleitorado PR 2022
- `/api/cron/gcal-sync` — GET autenticado por CRON_SECRET (schedule: 04h UTC diário)
- `/api/broadcasts` — POST: busca emails por audiência, dispara Resend batch + Telegram, salva sentCount
- `/api/broadcasts/count` — GET contagem por audiência
- `/api/mapa` + `/api/mapa/stats` — lideranças por cidade
- `/api/admin/users` — listar/convidar usuários
- `/api/admin/users/[id]` — atualizar/revogar
- `/api/admin/recalc-scores` — recalcula mobilizationScore (com attendanceCount via groupBy)
- `/api/google-calendar/connect`, `/callback`, `/sync` — OAuth + sync bidirecional
- `/api/public/cadastro` — sem auth, rate limit 5/min, source whitelist (EVENTO/INSTAGRAM/WHATSAPP), notifica líder da zona + Telegram
- `/api/invite-links` · `/api/invite/validate` · `/api/invite/pre-auth` · `/api/invite/complete-profile`
- `/api/notifications` · `/api/notifications/[id]` · `/api/notifications/read-all`
- `/api/municipios` — 399 municípios PR com cache 24h
- `/api/cep/[cep]` — proxy ViaCEP (público)
- `/api/municipality-goals` — GET/PUT/DELETE (ADMIN)
- `/api/telegram/webhook` — POST (público) dispatch: /novo /lista /stats /municipio /ajuda
- `/api/telegram/register-webhook` — GET (ADMIN) registra webhook no Telegram
- `/api/telegram/status` — GET (ADMIN) diagnóstico: urlMatch, bot info

---

## Schema

### Collaborator
`campaignRole`, `status` (LEAD/ACTIVE/INACTIVE), `profile`, `supportStatus`, `source`, `channel CollaboratorChannel?`, `mobilizationScore Float?`, `contributionTypes String[]`, `registeredById String?`, `lgpdConsent`, `lgpdConsentAt`, **`lastContactedAt DateTime?`**

### Task
`id`, `campaignId` (@default "andre-santos-2026"), `title`, `description?`, `assignedToId`, `createdById`, `dueDate DateTime?`, `status TaskStatus` (PENDING/DONE), `priority TaskPriority` (LOW/NORMAL/HIGH), `createdAt`, `updatedAt`
Índices: campaignId, assignedToId, status

### Attendance
`id`, `eventId`, `collaboratorId?`, `guestName?`, `status` (PRESENT/ABSENT/JUSTIFIED), `createdAt`, `updatedAt`

### MunicipalityGoal
`campaignId`, `city` (unique), `targetVotes Int`, `targetLeaders Int`

### UserCampaign
`tier CollaboratorTier` (APOIADOR/ATIVISTA/LIDER_CELULA/COORDENADOR)
Thresholds: 0–4 APOIADOR · 5–14 ATIVISTA · 15+ LIDER_CELULA · COORDENADOR manual

### InviteLink
`token @unique`, `role`, `expiresAt DateTime?`, `useCount Int`, reutilizável

### Settings
`campaignName`, `logoBase64`, `googleRefreshToken`

---

## mobilizationScore — src/lib/mobilization.ts

`score = PROFILE_BASE[profile] × SUPPORT_MULT[supportStatus] × STATUS_MULT[status] + contributionTypes.length × 3 + min(20, attendanceCount × 2)`
Recalcular: POST `/api/admin/recalc-scores` ou botão em /configuracoes

---

## Hierarquia de Acesso

| Papel | Módulos visíveis |
|-------|-----------------|
| MEMBER | Dashboard, Colaboradores, Minha Célula, Células, Ranking |
| LEADER | + Mapa, Zonas, Grupos WA, Agenda, Relatório, Metas |
| ADMIN | + Comunicados, Configurações, Super Admin, Planejamento, Tarefas |

---

## Env Vars no Vercel

```
DATABASE_URL · AUTH_SECRET · AUTH_GOOGLE_ID · AUTH_GOOGLE_SECRET · APP_URL
ADMIN_EMAILS = edsonluizz.silva@gmail.com
SUPER_ADMIN_EMAILS = edsonluizz.silva@gmail.com
```
Opcionais:
```
METRICOOL_TOKEN         → analytics Instagram via Metricool API (userId=4802533 · blogId=6229175)
RESEND_API_KEY          → emails de convite e broadcast
RESEND_FROM             → "Base André Santos <noreply@...>"
BLOB_READ_WRITE_TOKEN   → upload de logo
GOOGLE_CALENDAR_CLIENT_ID / CLIENT_SECRET / REDIRECT_URI / ID
TELEGRAM_BOT_TOKEN      → notificações + comandos no canal
TELEGRAM_CHAT_ID        → ID do canal (ex: -1002xxxxx)
CRON_SECRET             → valida chamadas dos cron jobs
```

---

## Recursos-chave

### Telegram Bot
- Webhook registrado ✅ (2026-05-09)
- `/api/telegram/*` liberado no middleware auth (isPublic)
- Comandos: /novo /lista /stats /municipio /ajuda
- Notificações: novo lead via /cadastro, broadcast, agenda matinal 10h UTC
- Crons (vercel.json): `0 10 * * *` digest · `0 14/18/22 * * *` agenda do dia se houver eventos

### Google Calendar
- Sync bidirecional manual (botão /agenda) + cron automático `0 4 * * *`
- Conta: andrelnsantos.as@gmail.com · Projeto GCP: "Calendario Andre Santos"
- Client ID: 375239227006-edgpcjo9o037dcs8kf4h1806vln6r9q6.apps.googleusercontent.com

### vercel.json — crons ativos
```json
birthday-notifications: 0 11 * * *
nurturing:              0 13 * * *
weekly-report:          0 10 * * 0
agenda-telegram:        0 10/14/18/22 * * *  (4 entradas separadas)
gcal-sync:              0 4 * * *             (1×/dia — Hobby plan limit)
```
**IMPORTANTE:** Hobby plan = máx 1×/dia por cron. `0 */N * * *` com N<24 quebra deploys silenciosamente.

---

## Pendências

### Ações manuais do admin
- [x] **YouTube:** vídeo definitivo `z_9zver8iN0` (Shorts) · aspecto 9:16 · countdown 60s antes do redirect WA (2026-05-14)
- [x] **Scores:** /configuracoes → "Recalcular scores agora" — executado em 2026-05-14
- [x] **Metas TSE:** automáticas — `ensureCityGoal` dispara em todos os fluxos (form público, admin, import, cron, sync manual) · sincronizado em 2026-05-14
- [x] **Normalização de cidades:** botão em /configuracoes · lista oficial 399 municípios PR
- [x] **Metas sincronizadas:** "Sincronizar metas agora" executado em 2026-05-14
- [x] **Importação Gospel Class:** 1652 leads importados em 2026-05-12
- [x] **Leads pré-fix:** /configuracoes → "Corrigir origem de leads antigos" — executado em 2026-05-14

### Análise adversária — Mara Lima 2022
- [x] **ZIP TSE baixado** e script executado (2026-05-16) · 357.452 votos · 399 municípios
- [x] **`src/data/mara-lima-2022.json`** commitado
- [x] **Painel em `/metas`** — cruzamento Meta × Mara Lima 2022 × Ativos por município · prioridade crítica/alta/média/ok

### Integrações pendentes
- [ ] **Evolution API:** WhatsApp para ativação da base — decisão 2026-05-13 (ver seção abaixo) · aguardando número dedicado + instância
- [x] **Metricool:** integração completa (2026-05-17/18)
  - [x] Sprint 1+2: proxy API · widget dashboard · página /instagram (posts, reels, KPIs, range 7/30/90d)
  - [x] Sprint 3: /r?src=instagram → UTM tracking → channel salvo no banco
  - [x] Sprint 4: correlação posts × cadastros por dia (gráfico em /instagram)
- [ ] **Compliance ago/2026:** CNPJ coligação + registro SPCE

---

## Próximo Sprint — Comunicação WhatsApp (Evolution API)

**Decisão (2026-05-13):** Evolution API escolhida como ferramenta de WhatsApp para ativar a base.

| Fase | Escopo |
|------|--------|
| Fase 1 — Infraestrutura | Subir instância Evolution API (cloud ou self-hosted) · número dedicado · conectar via QR Code |
| Fase 2 — Integração básica | Botão "Enviar WhatsApp" no card do colaborador (wa.me) · broadcast manual via painel /comunicados |
| Fase 3 — API completa | Webhook Evolution → CRM (mensagens recebidas) · templates de ativação · histórico de contato |
| Fase 4 — Compliance | Avaliar migração para Meta Cloud API antes do registro de candidatura (ago/2026) |

**Pré-requisitos antes de implementar:**
- Definir número dedicado para a campanha (não usar pessoal)
- Instância Evolution API: cloud (evolutionapi.com ~R$80/mês) ou self-hosted (VPS ~R$30/mês)
- Testar envio manual antes de integrar ao código

---

## Metricool — Concluído (2026-05-17/18)

| Sprint | Entregável | Status |
|--------|------------|--------|
| 1+2 | Proxy `/api/metricool/instagram` · widget dashboard · página `/instagram` | ✅ |
| 3 | `/r?src=instagram` → UTM → `channel` salvo no banco | ✅ |
| 4 | Correlação posts × cadastros por dia em `/instagram` | ✅ |

**Env vars necessárias:** `METRICOOL_TOKEN` (já adicionado ao Vercel)
**blogId:** 6229175 · **userId:** 4802533 · **Instagram:** @andresantos_as
**Link UTM Instagram:** `/r?src=instagram` (sem ref) ou `/r?src=instagram&ref={userId}`

---

## UX — correções 2026-05-18

- **Sidebar nome/foto:** `serverName` e `serverImage` passados do layout (server) para o Sidebar — elimina flash de "Usuário"/"U" enquanto useSession carrega
- **Super Admin:** 5 seções expansíveis com chevron, badge de contagem e estado padrão correto (Com acesso e Pendentes abertos por padrão)
- **lucide-react:** ícone `Instagram` não existe — usar `Camera` como substituto

## Entregas sprint 2026-05-20

- ✅ **Fix 3 bugs criação de campanha** (commit `fb2f05e`):
  - `provision/route.ts`: `neonData` declarado dentro de bloco `if` mas referenciado fora → ReferenceError silencioso (modo auto quebrado)
  - `campaigns/route.ts`: catch retornava "Erro interno" genérico; adicionado check de slug duplicado + erro real exposto no response
  - `auth.ts` session callback: `isSuperAdmin` re-avaliado em toda sessão — tokens antigos chegavam como `false`
- ✅ **Banco Neon tenant inicializado**: `ep-steep-poetry-acb6x32c` · prisma db push via C:\tmp (Google Drive trava npm)
- ⚠️ **Workflow**: Google Drive/OneDrive travam npm install — mover projetos para `C:\Projetos\` ou usar GitHub Codespaces
- ⏳ **Sprint 4 ISSACAR** (próximo): roteamento de tenant — JWT dinâmico por campanha · slug/subdomínio · convite de admin do tenant

## ISSACAR.IA — Multi-tenant (Sprints 1–3) — 2026-05-19

### O que foi feito
- **Sprint 1:** Branch `v2/issacar` + schema Campaign expandido (`slug`, `dbUrl`, `plan`, `active`, `adminEmail`, `candidateName`, `party`, `district`, `electionYear`, `primaryColor`, `secondaryColor`) · `meta-db.ts` · `tenant-db.ts` · `campaign-context.ts` · `next-auth.d.ts` com `dbUrl`/`campaignId` no JWT
- **Sprint 2:** 47 rotas API convertidas para `getCampaignContext(session)` → `{ db, cid }` (Python bulk script) · `const CID = cid` adicionado em todas as rotas · mergeado em `main`
- **Sprint 3:** `/campanhas` (lista) · `/nova-campanha` (form) · sidebar com `superAdminOnly` flag · `/api/admin/campaigns` CRUD · `/api/admin/campaigns/provision` (Vercel API → Neon API fallback) · `tenant-init-sql.ts` · `.vercelignore` para excluir CSVs TSE (4.3 GB)

### Padrão de acesso ao banco (crítico)
```ts
// pages (sem auth de rota): usa db global + CID do session
import { db } from "@/lib/db";
const CID = session?.user?.campaignId ?? "andre-santos-2026";

// API routes: usa getCampaignContext
const { db, cid } = getCampaignContext(session);
const CID = cid;
```
`getCampaignContext` → usa `globalDb` quando dbUrl == `DATABASE_URL` (tenant principal), `getTenantDb` para URLs diferentes (futuros tenants).

### Status do provisionamento
- **Neon API direta:** bloqueada — org André Santos é "managed by Vercel"
- **Vercel Storage API:** endpoint `/v1/storage/databases` retorna `not_found` (não disponível na conta atual)
- **Solução atual:** Modo Manual (Recomendado) — usuário cria Neon via Vercel Marketplace, cola DATABASE_URL no form, roda `prisma db push` localmente
- **Pendência:** criar campanha via form ainda tem problema (a investigar na próxima sessão)
- **Script local:** `temporaria/init-tenant-db.ps1 -DbUrl "postgresql://..."` roda `prisma db push` contra novo banco

### Módulos super-admin adicionados
| Rota | Status |
|------|--------|
| `/campanhas` | ✅ lista com contagem de colaboradores/operadores + status DB |
| `/nova-campanha` | ✅ form modo manual (padrão) + automático · pendente bug ao criar |

### Regressões corrigidas
- `ReferenceError: CID is not defined` em 47 rotas → fix `const CID = cid` (commit `13188d6`)
- Pages zeradas (dashboard, metas, relatorio, colaboradores/[id]) → restaurado `import { db }` global (commit `3330d22`)
- Login quebrado após merge → revertido upsert do Campaign no signIn (commit na sequência)
- Deploy CLI 4.3 GB → `.vercelignore` com `temporaria/` (commit `bf6f516`)
- `getTenantDb` causava dados zerados → `getCampaignContext` usa `globalDb` para tenant principal (commit `2c88134`)

---

## Eleitos 2022 PR — 2026-05-19

### Módulo `/eleitos-2022`
- **Dados:** dep-estaduais.json (54) · dep-federais.json (30) · senadores.json (Moro) · governador.json (Ratinho Jr) · presidente.json
- **Por município:** dep-estaduais-municipios.json (~2 MB, 54 × 399) · dep-federais-municipios.json (~1.1 MB, 30 × 399)
- **Script:** `temporaria/fetch-eleitos-municipios.ps1` — lê CSVs TSE com encoding CP1252
- **Componente:** `EleitoralPanel.tsx` — 5 tabs, search, filtro partido, favoritos localStorage, modal município com fetch on-demand
- **API:** `/api/eleitos/municipios` — serve dados municipais sob demanda
- **Mara Lima corrigida:** `mara-lima-2022.json` = 46.011 votos (era 357.452 por filtro errado); Arapongas = 785 votos

---

## Armadilhas conhecidas

- `campaignId` fixo = "andre-santos-2026" em todos os endpoints
- NextAuth v5 Beta: `user.id` no jwt = sub do OAuth. `auth.ts` resolve via `findUnique({ email })`
- Build usa `prisma db push` — banco Neon precisa estar acessível no build
- `typescript: { ignoreBuildErrors: true }` — erros de tipo não quebram o build
- Terminologia: "base de apoio" (não "campanha") nos textos visíveis
- `/entrar`, `/api/invite/*`, `/api/cep/*`, `/api/telegram/*`, `/api/public/*` DEVEM estar em `isPublic` em `auth.config.ts`
- `existsSync` não funciona em Vercel serverless — usar dynamic import
- **Hobby plan crons:** cada entrada do vercel.json precisa de schedule máx 1×/dia. `0 */6 * * *` (a cada 6h) bloqueia deploys silenciosamente. Confirmar sempre com `vercel --prod` se GitHub integration parar.
- Vercel CLI instalado: `npm i -g vercel` + `vercel login` + `vercel --prod` (fallback quando GitHub integration travar)

---

## Achados de Segurança — Auditoria 2026-05-27

### Crítico
- `ignoreBuildErrors: true` + `eslint ignoreDuringBuilds: true` → erros silenciados em produção (`next.config.mjs`)
- Rate limit in-memory ineficaz no serverless (`api/public/cadastro`) — cada instância Vercel tem estado próprio
- `joinCode: "andre2026"` hardcoded no `signIn` (`auth.ts:157`)

### Médio
- Sem CSP (Content-Security-Policy) nos headers
- `googleRefreshToken` texto plano no banco
- Bulk updates usam `as never` — sem validação de enum
- Token de impersonation no JWT sem TTL

### Baixo
- N+1 queries parcialmente corrigido; `console.error` pode vazar stack traces

**Plano completo:** `PLAN.md` (Sprints 1–4, criado 2026-05-27)

---

## Sprint 14 — Mobile-first UI + Treinamento + bugs WhatsApp (2026-05-30/31)

**Motivação:** "Nosso sistema primordialmente será usado em celulares e tablets" — auditoria mobile mostrou: sem PWA, sem bottom nav, KPIs com 1 coluna apenas no mobile, score sem visualização, tabelas escondendo dados, bugs visíveis no WhatsApp.

### Fases entregues

| Fase | Tema | Status |
|------|------|--------|
| A | Auditoria mobile inicial | ✅ |
| B | PWA + viewport cover + safe-area + touch targets 44px + manifest com 8 ícones + 3 shortcuts | ✅ commit `cca9960` |
| C | Bottom nav fixo (5 itens: Início, Apoiadores, Agenda, Relatório, Menu) + drawer mobile sincronizado via SidebarContext | ✅ commit `34a660b` |
| D | 6 KPI cards em `/colaboradores` com delta % 7d (`/api/collaborators/stats`) | ✅ commit `04723ea` |
| E | `ScoreBar` (gradient red→amber→green) plugada em perfil + lista de colaboradores | ✅ commit `77ab2d2` |
| F | Tabelas → cards mobile (Ranking + Relatório cobertura municípios) | ✅ commit `f0e3f69` |
| G | Dashboard mobile stack (KPIs 2 cols mobile, padding reduzido, tipografia ajustada) | ✅ commit `d2a4e4b` |
| H | Polish + memória + estado.md atualizado | em curso |
| I | Página `/treinamento` com slide deck (9 slides, scroll vertical com snap, anime.js v4) | ✅ commits `4c7c6ef` + `258d50b` |

### Bugs WhatsApp corrigidos (commit `6357607`)
- **`{nome}` literal nas boas-vindas**: `/api/n8n/config` compat path não substituía `{nome}` quando workflow não passava `?name=`. Fallback "apoiador(a)" adicionado.
- **404 "Lead não encontrado"** no node `CONVERT — Ovile` do n8n: agora retorna `{ searched, campaignId, action }` para facilitar debug.
- **Tom dos templates**: reescritos invite/welcome/optout em tom formal (memória `feedback_commit_push`). Removidas gírias ("tava", "grupinho", "demais", "bora", "tá", "Aaaa", "Sem stress"), saudação "Olá, {nome}" em vez de "Oi, {nome}! 😊", "Responda *SIM* ou *NÃO*" no lugar de "Manda SIM ou NÃO 🙏". Bandeira 🇧🇷 → 🇵🇷 (André é Deputado Estadual pelo Paraná). REACTIVATION mantido (já estava formal).

### Arquivos criados
- `public/manifest.json` — PWA manifest
- `src/components/mobile-bottom-nav.tsx` — bottom nav mobile (lg:hidden)
- `src/app/api/collaborators/stats/route.ts` — KPIs com delta 7d/14d
- `src/components/collaborators/kpi-cards.tsx` — 6 KPI cards do CRM
- `src/components/ui/score-bar.tsx` — barra gradient reutilizável
- `src/app/(dashboard)/treinamento/page.tsx` — server component (auth + Settings)
- `src/components/treinamento/deck.tsx` — slide deck client com scroll-snap-y

### Arquivos modificados
- `src/app/layout.tsx` — viewport "cover", appleWebApp, manifest, Toaster top-center
- `src/app/globals.css` — utilities `.safe-*`, `.touch-target`, `.touchable`, font-size 16px mobile/14 lg
- `src/contexts/sidebar-context.tsx` — `mobileOpen`/`setMobileOpen` no contexto
- `src/components/sidebar.tsx` — usa context + item "Treinamento" (icon GraduationCap)
- `src/components/sidebar-main-wrapper.tsx` — renderiza MobileBottomNav + padding bottom safe-area
- `src/app/(dashboard)/colaboradores/page.tsx` — KpiCards + ScoreBar inline + tipo `mobilizationScore`
- `src/app/(dashboard)/colaboradores/[id]/page.tsx` — ScoreBar grande no perfil
- `src/lib/message-templates.ts` — 4 pools reescritos
- `src/app/api/n8n/config/route.ts` — fix `{nome}` fallback
- `src/app/api/n8n/update-lead/route.ts` — diagnóstico no 404
- `src/app/(dashboard)/ranking/page.tsx` — cards mobile + grid desktop
- `src/app/(dashboard)/relatorio/page.tsx` — cards cobertura mobile + tabela desktop
- `src/app/(dashboard)/dashboard/page.tsx` — densidade mobile
- `src/components/dashboard/kpi-card.tsx` — padding/tipo responsivos
- `src/app/(dashboard)/eleitos-2022/page.tsx` — header sem `p-6` extra

### Débito técnico assumido
- `typescript.ignoreBuildErrors = true` mantido durante Sprint 14 para velocidade. Sprint 13 (TS cleanup) pausada — retomar após estabilizar o mobile-first.

### Pendências operacionais (usuário)
- N8N_IMPORT_WEBHOOK_URL no Vercel
- APP_ENCRYPTION_KEY no Vercel
- UPSTASH_REDIS_REST_URL/TOKEN no Vercel (rate limit serverless)
- Multi-tenant Miriam: Configurações → Integrações (Metricool, Telegram, Z-API)
- Reimport WF4 (kind=reactivation) — Sprint 12
- Verificar deploy do `/treinamento` no Vercel após push (concluído — está no ar)

---

## Sessão 2026-05-31 (tarde) — WF2 reimport via API + card n8n nas Integrações

### Bugs corrigidos

1. **WF2 com body form-urlencoded em vez de json (commit `cebdcea` antes; reimport via n8n API)**: a versão do WF2 importada anteriormente não tinha `contentType: json` + `specifyBody: keypair` nos nós CONVERT, OPT_OUT, Welcome e Despedida. Backend (`req.json()`) falhava silenciosamente em parsear → 400 → não atualizava status. Substituído via API n8n (`PUT /api/v1/workflows/ZDkd1oS1P8VdSh2l`) usando JSON do repo + credential ID real `lQQNPGFAlsKMbUfL`. Webhook Z-API NÃO precisou reconfigurar (mesmo ID do workflow → mesmo path `/webhook/ovile-resposta-wa`).

2. **Phone lookup com 9 dígitos não bate quando Z-API manda celular sem o "9" (commit `3111084`)**: Z-API às vezes manda 12 dígitos (55+DDD+8) enquanto banco salva com 13 (55+DDD+9). Sufix9 não bate. Fix: tenta sufix9 → fallback sufix8 em `/api/n8n/update-lead` e `/api/n8n/lead-by-phone`.

3. **Build quebrado por ESLint `_req unused` (commit `8cd7bc4`)**: bloqueou 10 deploys de produção da sprint 14 inteira. Fix: remover `_req` da rota `/api/collaborators/stats`. **Lição:** ESLint do projeto não aceita prefixo `_` para argumentos não usados — usar `export async function GET()` sem args quando não precisa.

### Diagnóstico WF2 (9 SIMs perdidos)

- 26 execuções do WF2 listadas via API n8n: 9 SIM com CONVERT 404, 17 outros
- Rota temporária `/api/n8n/debug-phone` (criada e removida na mesma sessão) confirmou: **nenhum dos 9 phones tinha sequer 6-9 dígitos em comum com qualquer registro do banco**
- Conclusão: os 9 SIMs vieram de pessoas **não cadastradas** no Ovile (testes pessoais via WhatsApp do Edson, indicações de terceiros, etc). Nada a recuperar
- Stats da base: 1463 colaboradores com phone, 1659 LEAD, formato padrão 11 dígitos (sem +55)

### Nova feature — card n8n nas Integrações (commit `cebdcea`)

`Configurações → Integrações` ganhou 5º card "n8n (Workflows)":
- Status de N8N_API_KEY (Bearer)
- Status de 3 webhooks (Lead novo / Disparo manual / Import bulk) com hint do host+path
- Link "Abrir n8n Cloud" externo
- Nota explicando que WF2 (Resposta WhatsApp) não usa webhook nosso (Z-API → n8n direto)
- API GET `/api/campaign/integrations` retorna agora também `n8n: {...}`

### Limpeza n8n (via API)

- 3 workflows duplicados deletados: `0Nm5Y6WujlDWU9pb`, `GqqPEHnmWHRsbMjs` (ambos "wf2"), `SOD4yQfe1S8wtd2z` ("resposta-whatsapp")
- WF2 ativo (`ZDkd1oS1P8VdSh2l`) preservado e atualizado

### Cadastro público dos ebooks (proposta pendente)

Hoje os cadastros dos 2 ebooks vão para uma planilha Google. Edson importa manual no Ovile. Solução proposta — pendente decisão:
- **(A)** Landing `/ebook/[slug]` dentro do Ovile com form custom (recomendado — sem dependência externa)
- **(B)** Apps Script no Google Forms chamando `/api/public/cadastro`
- **(C)** Make/Zapier intermediário

Endpoint `/api/public/cadastro` já existe e está robusto: aceita name, phone, email, city, neighborhood, source, channel, refUserId, refc, contributionTypes, lgpdConsent. Já dispara WF3 (WhatsApp imediato), Telegram, e notifica líder de zona.

