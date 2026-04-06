import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      establishmentId: string;
      isSuperAdmin: boolean;
      needsChurchSelection: boolean;
      suspended: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    establishmentId?: string;
    isSuperAdmin?: boolean;
    needsChurchSelection?: boolean;
    suspended?: boolean;
  }
}
