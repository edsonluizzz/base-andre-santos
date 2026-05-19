import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
      establishmentId?: string;  // legado — mantido para backward compat
      campaignId?: string;       // ISSACAR.IA: identificador da campanha
      dbUrl?: string;            // ISSACAR.IA: DATABASE_URL da campanha
      isSuperAdmin?: boolean;
      needsChurchSelection?: boolean;
      suspended?: boolean;
      isImpersonating?: boolean;
      originalEstablishmentId?: string;
      noEstablishment?: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    campaignId?: string;
    dbUrl?: string;              // ISSACAR.IA: DATABASE_URL da campanha
    isSuperAdmin?: boolean;
    isImpersonating?: boolean;
    originalEstablishmentId?: string;
  }
}
