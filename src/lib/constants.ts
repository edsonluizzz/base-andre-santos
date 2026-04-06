/** ID do estabelecimento legado (cliente original). Serve como fallback para dados
 *  migrados antes da estrutura multi-tenant existir. Não alterar sem migração no banco. */
export const DEFAULT_ESTABLISHMENT_ID = "default-porto-belo" as const;
