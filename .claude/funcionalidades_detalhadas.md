# Ovile — Catálogo de Funcionalidades v2.0

> Atualizado em 2026-04-17. Reflete o estado atual do sistema em produção.

---

## 1. Gestão de Membros

- **Ficha Cadastral Completa:** Nome, data de nascimento, telefone, e-mail, foto e observações internas.
- **Status Ativo/Inativo:** Controle do ciclo de vida do membro.
- **Busca, Filtros e Paginação:** Busca por nome/telefone; filtro por status, ministério, gênero; seletor de itens por página (12/24/48/96).
- **Importação/Exportação XLSX:** Upload de planilha com suporte a 100+ linhas (processamento paralelo em chunks de 50); exportação completa para análise externa.
- **Convite via WhatsApp:** Botão no card do membro para enviar link de convite direto pelo WhatsApp, vinculando o convite ao membro específico.
- **Vinculação de Login:** Campo `email` no cadastro conecta o membro ao usuário Google OAuth automaticamente no primeiro acesso.

---

## 2. Entrada e Onboarding de Membros

- **Join Code Autônomo:** Admin e Líder geram ou revogam o código de convite diretamente nas Configurações, sem depender do Super Admin.
- **Fluxo via Link:** Membro acessa `/entrar?c=CODE`, cria conta Google, é vinculado automaticamente ao estabelecimento e ao cadastro de membro existente (se houver).
- **Notificação de Novo Membro:** Admins recebem notificação in-app quando um membro entra via link.
- **Promoção de Role com E-mail:** Admin promove membro a Líder ou Admin; o promovido recebe e-mail de confirmação.

---

## 3. Onboarding Interno (Primeiros Passos)

- **Checklist Admin no Dashboard:** Card com 5 passos verificados em tempo real (criar congregação, adicionar membros, criar evento, gerar link de convite, adicionar logo); barra de progresso; some automaticamente ao concluir ou ao clicar em "×".
- **Tour do Portal do Membro:** Modal de 3 steps exibido na primeira visita do membro ao portal (bem-vindo, presença, RSVP); persistido via localStorage.
- **Pós-Cadastro com Próximos Passos:** Tela de sucesso após criar congregação exibe 4 passos claros (login, adicionar membros, criar evento, compartilhar link).

---

## 4. Ministérios e Departamentos

- **CRUD de Ministérios:** Criação, edição e exclusão de grupos (Louvor, Kids, Jovens, etc.).
- **Coordenadores e Membros:** Designação de papéis dentro de cada ministério.
- **Filtro Cruzado:** Eventos e registros financeiros filtráveis por ministério.

---

## 5. Eventos e Calendário

- **CRUD de Eventos:** Cultos, Ensaios, Reuniões e Retiros com data, hora, tipo e ministério associado.
- **Calendário Interativo no Dashboard:** Dias com eventos destacados; clicar abre modal com lista de eventos + link para chamada + botão "Novo Evento"; dias sem evento abrem diálogo de criação direto.
- **Auto-abertura por URL:** Parâmetro `?evento=id` abre o evento correto automaticamente na tela de chamada.
- **Notificações de Evento Criado:** Ao criar evento, todos os membros relevantes (por ministério ou todos os ativos) recebem notificação in-app e e-mail.

---

## 6. Presença (Chamada)

- **Registro de Chamada:** Status por membro: Presente, Ausente ou Justificado.
- **Justificativa de Falta:** Campo de texto para registrar o motivo da ausência, com dialog automático.
- **RSVP (Confirmação Antecipada):** Membro confirma presença via portal antes do evento.
- **CTA WhatsApp para Ausentes:** Botão sempre visível para contatar membros ausentes diretamente pelo WhatsApp.
- **QR Code de Presença:**
  - Botão "QR" na chamada abre modal com QR Code.
  - Página `/checkin/[eventId]` mobile-first: mostra detalhes do evento, botão "Confirmar Presença".
  - Registro automático da presença ao escanear; vincula membro por userId ou e-mail.
  - Funciona sem congregação selecionada (rota pública, não redireciona para `/entrar`).

---

## 7. Portal do Membro

- **Área Pessoal Exclusiva:** Acesso ao histórico de presença, eventos futuros e notificações.
- **RSVP via Portal:** Confirmação de presença antecipada em eventos futuros.
- **Atualização de Perfil:** Edição de dados pessoais pelo próprio membro.
- **Tour de Boas-Vindas:** Modal 3 steps exibido apenas na primeira visita.

---

## 8. Comunicados (Broadcasts)

- **Composição de Mensagem:** Título, corpo da mensagem e seleção de destinatários.
- **Entrega Multicanal:** Envio simultâneo via e-mail (Resend) e notificação in-app.
- **Histórico de Comunicados:** Lista de todos os comunicados enviados pelo estabelecimento.
- **Acesso Restrito:** Visível apenas para role ADMIN na sidebar.

---

## 9. Aniversariantes

- **Página Dedicada `/aniversarios`:** Lista de membros com aniversário no mês/dia.
- **Cron Diário Automático (08h BRT):** Detecta aniversariantes do dia e envia e-mail de parabenização + notificação in-app.

---

## 10. Gestão Financeira

- **Ofertas e Entradas:** Registro vinculado a membro, evento ou ministério específico.
- **Despesas Categorizadas:** Alimentação, Transporte, Material, etc.
- **Contas Bancárias:** Gestão de múltiplos saldos (banco, caixa interno, PIX); cada oferta e despesa associada a uma conta.
- **Métodos de Pagamento:** Dinheiro e PIX.
- **DRE Anual/Mensal:** Relatório visual de entradas vs. saídas para fechamento de caixa.

---

## 11. Módulo de Camisetas (Congressos)

> Disponível apenas no plano PRO.

- **Gestão de Pedidos:** Controle de tamanhos (PP ao XXG), cores e quantidades.
- **Fluxo de Produção:** Pendente → Pago → Em Produção → Pronto para Entrega → Entregue.
- **Comprovação de Pagamento:** Upload de comprovante e validação pelo administrador.
- **Precificação por Congresso:** Valor específico por lote.

---

## 12. Relatórios

> Disponível apenas no plano PRO.

- Exportação de dados de presença, membros e financeiro.

---

## 13. Notificações

- **Sino In-App:** Centro de notificações em tempo real no header.
- **E-mails Transacionais (Resend):** Aniversários, eventos criados, promoção de role, convites, comunicados.
- **Sequência de Nurturing (Automática):**
  - Day 1, Day 3 e Day 7 pós-cadastro da congregação.
  - Cron diário (13h UTC) verifica e avança o step do estabelecimento.
  - Templates personalizados por etapa incentivando o uso do sistema.

---

## 14. Configurações do Estabelecimento

- **Dados da Congregação:** Nome e logo (upload via Vercel Blob).
- **Join Code:** Geração e revogação do código de convite.
- **Gestão de Usuários:** Listar, promover e remover usuários do estabelecimento.
- **Permissões Customizáveis:** O Admin define quem pode Ver, Criar, Editar ou Exportar em cada módulo (Membros, Financeiro, Relatórios, Eventos, Ministérios, Presença).

---

## 15. Planos e Assinaturas

- **Plano FREE:** Até 50 membros; acesso ao core (dashboard, membros, eventos, presença, financeiro básico).
- **Plano PRO (R$ 29,99/mês):** Membros ilimitados + Relatórios + Ministérios + Camisetas.
- **Stripe Customer Portal:** Gerenciamento de plano, cartão e histórico de cobranças pelo próprio usuário.
- **Banner de Trial/Upgrade:** Indicador visual do status do plano no dashboard.
- **PlanGate:** Bloqueio automático de módulos PRO para contas FREE.

---

## 16. Acesso, Segurança e Multi-Tenant

- **Autenticação:** Google OAuth com NextAuth v5 (JWT strategy).
- **Multi-Tenant Isolado:** Cada congregação tem dados completamente separados; tenant resolvido via `UserEstablishment`.
- **Roles:** `ADMIN` > `LEADER` > `MEMBER` — cada role com permissões padrão por módulo.
- **Troca de Estabelecimento:** Admin pode gerenciar múltiplas congregações pela sidebar.
- **Páginas LGPD:** `/termos` e `/privacidade`.

---

## 17. PWA (Progressive Web App)

- **Instalável no Celular:** Manifest + ícones gerados automaticamente no build Vercel.
- **Service Worker:** Cache offline via `next-pwa`.
- **Experiência Nativa:** Abre em tela cheia sem barra do navegador.

---

## 18. Dashboard

- **Stat Cards:** Resumo de membros, eventos e financeiro.
- **Calendário Interativo:** Visualização mensal com eventos destacados e ações contextuais por dia.
- **Radar de Liderança:** Gráfico expansível dos líderes mais ativos ("Ver todos / Recolher").
- **Checklist de Configuração (Onboarding Admin):** Card de primeiros passos visível até concluir todas as etapas.

---

## 19. Painel Super Admin

> Exclusivo para Edson / equipe Ovile. Não visível para clientes.

- **Listagem de Todos os Estabelecimentos:** Status, plano, data de criação.
- **Suspend / Reativar:** Bloqueio de acesso a um estabelecimento com um clique.
- **Impersonação:** Acessar qualquer estabelecimento como se fosse o admin daquele tenant (banner laranja de alerta).
- **AuditLog:** Registro de todas as ações de impersonação.
- **Painel de Métricas:**
  - MRR e ARR em tempo real.
  - Taxa de conversão Trial → PRO.
  - Churn (cancelamentos).
  - Gráfico de crescimento semanal (últimas 8 semanas).
  - Funil de nurturing (step 0→3).
  - Funil de conversão completo.

---

## 20. Landing Page e Cadastro

- **Landing Page:** Animações skeuomórficas com anime.js; copy orientado a conversão (Framework PAS).
- **Fluxo de Cadastro:** Criação de congregação com e-mail de boas-vindas automático.
- **Pós-Cadastro:** Tela de sucesso com 4 próximos passos claros.
