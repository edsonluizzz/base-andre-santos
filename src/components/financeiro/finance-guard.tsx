"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

/**
 * Defesa em profundidade client-side — o middleware (auth.config.ts) já bloqueia
 * /financeiro no nível de rota, isso aqui só cobre o instante entre a navegação
 * client-side e a sessão carregar.
 */
export function FinanceGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isFinanceAdmin = Boolean((session?.user as { isFinanceAdmin?: boolean } | undefined)?.isFinanceAdmin);

  useEffect(() => {
    if (status === "authenticated" && !isFinanceAdmin) router.replace("/dashboard");
  }, [status, isFinanceAdmin, router]);

  if (status === "loading") return null;
  if (!isFinanceAdmin) return null;
  return <>{children}</>;
}
