import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
      establishmentId?: string;
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
    isSuperAdmin?: boolean;
    isImpersonating?: boolean;
    originalEstablishmentId?: string;
  }
}
