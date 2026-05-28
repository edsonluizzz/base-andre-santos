import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
      campaignId?: string;       // Ovile Eleitoral: identificador da campanha
      dbUrl?: string;            // Ovile Eleitoral: DATABASE_URL da campanha
      isSuperAdmin?: boolean;
      suspended?: boolean;
      isImpersonating?: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    campaignId?: string;
    dbUrl?: string;              // Ovile Eleitoral: DATABASE_URL da campanha
    isSuperAdmin?: boolean;
    isImpersonating?: boolean;
    impersonationExpiry?: number; // timestamp ms — TTL 2h
    selectedCampaignId?: string; // super-admin: troca de campanha ativa
  }
}
