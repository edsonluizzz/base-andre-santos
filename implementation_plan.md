# Roadmap Mestre do SaaS: Ovile Gestão

Este plano unifica as suas solicitações arquiteturais recentes (Seletor de Congregação e Financeiro Avançado) com o checklist do **"O que falta para o SaaS funcionar de verdade"**.

---

## 🛑 User Review Required
> [!IMPORTANT]
> - O roteiro foi remodelado em Fases. A **Fase 1** destrava o sistema para o público (SaaS). A **Fase 2** entrega o peso do produto final.
> - As duas perguntas críticas: 
>   1. O acesso da igreja será via URL tipo subdomínio (`igreja.ovile.com.br`) ou continuaremos via login unificado (o usuário acessa `ovile.com.br`, loga e cai no **Seletor** caso seja de mais de um lugar)?
>   2. O módulo de Contas Bancárias/Caixas para o Financeiro Avançado pode ser incluso na Fase 2? 

---

## Estratégia e Fases de Lançamento

### Fase 1: Núcleo Crítico (Liberação pro Público)
*Sem isso, não tem como plugar igrejas blindadas e autônomas.*

1. **Refatoração do Login Multi-Congregação (Seletor de Contexto)**
   - **Banco:** Trocar para relação N:N (`UserEstablishment`) onde o email pode ser membro na igreja A e admin na B.
   - **Fluxo UX:** Após passar o Auth do Google, se o e-mail tiver +1 vínculo, congela numa tela de Seletor (`/select-church`). Se tiver um só, vai direto para o sistema.
2. **Onboarding Self-Service (SaaS Flow)**
   - Landing page com funil de contratação `/cadastro`.
   - Automação via API (`/api/onboarding`) que cria o `Establishment`, vincula o primeiro Admin e aplica as RolePermissions na hora.
3. **E-mails Transacionais (Resend)**
   - Ao dono cadastrar a Igreja no passo anterior, ou ao convidar um membro novo, dispara e-mail com magic link de acesso para o Portal.
4. **Domínio/Subdomínio do Estabelecimento**
   - Definir se vamos controlar via cookie global de sessão (`?church=ID` no link de convite que injeta o cookie) para sabermos qual o contexto do visitante logado.

---

### Fase 2: Robustez & Produto Completo
*O grande salto de qualidade.*

1. **Financeiro 2.0 (Aprofundado)**
   - Criação de `BankAccount` (Ex: "Caixa Bradesco", "Espécie").
   - Transições de Ofertas e Despesas com base no **Plano de Contas** (customizável) focado no destino do dinheiro para criar fluxo de caixa rastreável.
2. **Templates Dinâmicos de WhatsApp**
   - Criar na aba de Configurações (Settings) um campo de texto rico para o pastor mudar as regras das mensagens automáticas de aniversário (sem depender do código fixo).
3. **Escalas e Ministérios**
   - Adicionar modulo `Ministry` para criar grupos menores (Louvor, Diaconato) e designar líder.
4. **RSVP Invertido**
   - Portal do membro ganha opção "Quero ir" em Eventos próximos, pra gerar previsibilidade do culto e lista de chamada pré-preenchida.

---

### Fase 3: Empresa e Escala
*Faturar e Gerenciar de cima.*

1. **Monetização via Stripe**
   - Checkout atrelado ao Onboarding (Limitações Free de 50 membros; Acima disso, trava botões até aderir ao Pro).
2. **Painel Super Admin**
   - Visão master (Apenas pro Edson) para ver MRR, total de igrejas ativas e uso orgânico do server central.
3. **PWA Mobile**
   - Manifesto e Service Workers pra o usuário "Baixar o App" via Vercel Edge.

---

## Open Questions Adicionais
> [!CAUTION]
> Para o Onboarding: a Igreja vai apenas digitar do zero e gerar do ar, ou vamos forçá-las a logar com um Google Oauth pra associarmos o e-mail do pastor instantaneamente ao novo banco?
