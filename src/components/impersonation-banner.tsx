"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Eye, X } from "lucide-react";

export function ImpersonationBanner() {
  const { data: session, update } = useSession();
  const router = useRouter();

  if (!session?.user?.isImpersonating) return null;

  async function handleExit() {
    await update({ impersonateId: null });
    router.push("/super-admin");
    router.refresh();
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] bg-amber-500 text-black text-sm flex items-center justify-center gap-3 px-4 py-2">
      <Eye className="w-4 h-4 flex-shrink-0" />
      <span>
        Você está visualizando como <strong>{session.user.establishmentId}</strong>
      </span>
      <button
        onClick={handleExit}
        className="ml-2 flex items-center gap-1 bg-black/15 hover:bg-black/25 px-2 py-0.5 rounded font-medium transition-colors"
      >
        <X className="w-3 h-3" />
        Sair
      </button>
    </div>
  );
}
