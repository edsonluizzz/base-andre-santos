"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogIn, Loader2 } from "lucide-react";

export function SwitchCampaignButton({ campaignId }: { campaignId: string }) {
  const { update } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    await update({ selectedCampaignId: campaignId });
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Button size="sm" variant="outline" className="gap-2" onClick={handleClick} disabled={loading}>
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogIn className="h-3.5 w-3.5" />}
      Acessar
    </Button>
  );
}
