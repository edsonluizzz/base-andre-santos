# Novas Features — Roadmap V2+

## Priorização

Features ordenadas por impacto no valor do produto (vendabilidade) vs. esforço de desenvolvimento.

---

## Alta Prioridade (próximas versões)

### 1. Multi-Tenant / SaaS
**Impacto:** Permite vender o produto para múltiplas igrejas. De 1 cliente para N clientes.

**Modelo de dados:**
- Adicionar entidade `Organization` como raiz
- Todos os models recebem `organizationId`
- Cada organização tem seus próprios membros, eventos e dados isolados
- Admin da organização = "dono" do sistema para aquela igreja

**Planos sugeridos:**
- Free: até 30 membros, 1 admin, sem módulo de camisetas
- Pro (R$ 29/mês): membros ilimitados, múltiplos líderes, relatórios, camisetas
- Plus (R$ 59/mês): tudo do Pro + suporte prioritário, API access, exportação completa

---

### 2. Portal do Membro
**Impacto:** Transforma o app de "ferramenta de admin" para "plataforma comunitária". Alto engajamento.

**Funcionalidades:**
- Login separado para membros (email/senha, sem Google OAuth necessário)
- Cada membro vê: sua frequência histórica, ranking de presença, aniversários dos colegas
- Ver status do pedido de camiseta (tamanho, valor, se está pago)
- Confirmar presença em próximos eventos
- Visualizar eventos da agenda

---

### 3. Sistema de Ministérios e Células
**Impacto:** Essencial para igrejas maiores com ministérios de louvor, mídia, oração, etc.

**Funcionalidades:**
- Cadastro de ministérios (Louvor, Mídia, Teens, Oração, Células)
- Cada ministério tem um líder responsável
- Membros podem pertencer a múltiplos ministérios
- Chamada segmentada por ministério
- Relatórios de frequência por ministério

---

## Média Prioridade

### 4. Escalas de Ministério
**Para:** Grupos com ministério de louvor ativo.

**Funcionalidades:**
- Criar escala semanal/mensal por ministério
- Designar membros por função (vocal principal, violão, bateria, etc.)
- Membro escalado recebe notificação
- Pode confirmar ou solicitar substituição
- Histórico de participação no ministério

---

### 5. Metas e Campanhas Financeiras
**Para:** Grupos que organizam retiros, congressos, viagens missionárias.

**Funcionalidades:**
- Criar meta: "Retiro 2025 — R$ 3.000 em 60 dias"
- Barra de progresso em tempo real
- Vincular ofertas a uma campanha específica
- Dashboard com todas as campanhas ativas
- Histórico de campanhas concluídas com resultado

---

### 6. WhatsApp Integration
**Impacto:** Comunicação direta sem sair da plataforma.

**Implementação:** `wa.me` deeplinks (sem custo, sem API Key)

**Casos de uso:**
- Ausência detectada → botão "Enviar mensagem" com template pronto
- "Oi [Nome], sentimos sua falta no culto de ontem! Estamos orando por você. 🙏"
- Lembrete de evento: "Não esqueça: [Evento] amanhã às [hora] em [local]"
- Confirmação de pagamento de camiseta: "Pedido recebido! Tamanho [G] — R$ 45,00"
- Mensagem de aniversário (já existe, expandir)

---

### 7. Calendário Integrado
**Para:** Melhorar visibilidade da agenda do grupo.

**Funcionalidades:**
- View mensal com todos os eventos cadastrados
- Badges coloridos: Culto (azul), Ensaio (verde), Retiro (ouro), Congresso (roxo)
- Aniversários aparecem como marcadores
- Datas de entrega de camisetas
- Exportar como `.ics` (compatible com Google Calendar, Apple Calendar)

---

## Baixa Prioridade (visão de longo prazo)

### 8. Notificações In-App + PWA Push
**Funcionalidades:**
- Centro de notificações no header (sino com badge)
- Notificações automáticas: aniversariante do dia, evento amanhã, membro com baixa frequência
- PWA (Progressive Web App) para instalação no celular sem app store
- Web Push API para notificações push (sem custo)

---

### 9. Controle de Patrimônio / Instrumentos
**Para:** Grupos com ministério de louvor com instrumentos próprios.

**Funcionalidades:**
- Cadastro de instrumentos (guitarra, bateria, teclado, etc.)
- Responsável atual (quem está com o instrumento)
- Histórico de comodato
- Registro de manutenção
- Agendamento de uso por evento

---

### 10. Documentos e Galeria
**Via Vercel Blob (já na stack):**
- Upload e armazenamento de atas de reunião (PDF)
- Galeria de fotos de eventos
- Materiais de estudo/devocionais
- Documentos de membros (ex: autorização de viagem para menores)

---

## Impacto no Preço de Venda

Com Multi-Tenant + Portal do Membro + Ministérios, o produto deixa de ser uma "planilha sofisticada" e se torna uma **plataforma de gestão de comunidade jovem**, podendo ser precificado a:

- **R$ 29-49/mês por grupo** com plano Pro
- Potencial de **R$ 5.000-15.000 MRR** com 200-500 grupos ativos
- Baixo custo marginal (Neon PostgreSQL + Vercel serverless)
