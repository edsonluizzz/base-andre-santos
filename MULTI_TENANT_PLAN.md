# Projeto SaaS: Migração Multi-Estabelecimento (Fases A e B)

O objetivo desta etapa é transformar o sistema, que hoje foi feito sob medida para uma única congregação (Porto Belo), em uma estrutura **Multi-Tenant** (SaaS), onde Múltiplos Estabelecimentos (Igrejas) podem utilizar rodando o mesmo código, mas de forma completamente cega aos dados uns dos outros.

Para isso vamos focar estritamente na Fase A (Estrutura do DB) e Fase B (Isolamento).

## Atenção aos Dados Existentes
> [!CAUTION]
> Como seu banco de dados já possui usuários, membros, eventos e encomendas reais da igreja de Porto Belo, se nós simplesmente adicionarmos a restrição `"Toda tabela agora obriga a ter o ID do Estabelecimento"`, o banco quebrará, pois os registros antigos estarão órfãos.
>
> **Abordagem de Migração Proposta:**
> 1. Eu criarei um Estabelecimento Matriz fixo dentro do código (*ID: `default-porto-belo`*).
> 2. Darei a todos os registros existentes este ID como valor padrão (`@default("default-porto-belo")`).
> 3. Assim, quando subirmos para produção, seu banco não quebra e Porto Belo se torna o *"Cliente nº 1"* do sistema automaticamente.

---

## Modificações Propostas

### Fase A: Adição da Estrutura Raiz (Banco de Dados)

#### Arquivo: `prisma/schema.prisma`
- **[NEW] Tabela `Establishment`:**
  - Terá campos `id`, `name`, `logoBase64` e `pixKey`.
- **Modificações em Cadeia:**
  - Adicionaremos a relação `establishmentId String @default("default-porto-belo")` nas tabelas principais:
    - `User` (Logins on-line)
    - `Member` (Cadastros físicos)
    - `Event` (Cultos/Ensaios)
    - `Offering` e `Expense` (Finanças)
    - `Congress` (Temporadas de Camisetas)
- A tabela genérica `Settings` será apagada/redirecionada futuramente, pois essas configurações globais (Nome da Igreja e Logo) vão morar dentro do próprio `Establishment`.

### Fase B: Isolamento de Dados (Filtro Anti-Vazamento)

#### Arquivos: `src/lib/auth.ts` e `types/next-auth.d.ts`
- Injetaremos a nova propriedade `establishmentId` no token de segurança JWT de todo usuário que logar. Esse Token será a "catraca" do sistema para barrar informações alheias.

#### Inúmeros arquivos de rotas API (`src/app/api/...`)
- Realizarei um grande pacote de intervenção nas rotas do banco.
- Exemplo: Ao invés de `db.member.findMany()`, todos os pontos do sistema serão blindados para consultar **exatamente**:
  `db.member.findMany({ where: { establishmentId: session.user.establishmentId } })`
- **Operações Críticas (Post/Patch/Delete):** Também travaremos a inserção. Ninguém conseguirá criar um evento se o estabelecimento dele for diferente da URL ou payload de envio.

## Modo Super Admin (Fase C)
> [!IMPORTANT]
> A Fase C (Modo Super Admin) não será feita por agora na retomada. Isso significa que, provisoriamente, se a gente cadastrar uma filial "Igreja Itapema", não haverá uma tela visual pra **você** trocar de contexto. Focaremos apenas na criação robusta por baixo dos panos (infraestrutura e proteção).

## Plano de Validação
1. Após a refatoração maciça das tabelas no Prisma, rodarei o comando para sincronizar (`npx prisma db push`).
2. Testarei localmente a inserção de um evento na congregação padrão para assegurar que a "catraca de segurança" com o Token JWT está funcionando.
3. Pedirei que você verifique as funcionalidades essenciais rodando no dashboard com as novas engrenagens ativadas antes do deploy final.
