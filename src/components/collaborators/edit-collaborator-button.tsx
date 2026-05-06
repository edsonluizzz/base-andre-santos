"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CollaboratorDialog } from "./collaborator-dialog";
import { toast } from "sonner";

type Props = {
  collaborator: {
    id: string; name: string; email: string | null; phone: string | null;
    city: string | null; neighborhood: string | null; campaignRole: string;
    status: string; notes: string | null; birthday: string | null;
    profile: string; supportStatus: string; contributionTypes: string[];
    registeredBy: { name: string | null; email: string | null } | null;
  };
};

export function EditCollaboratorButton({ collaborator }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  function handleSuccess() {
    setOpen(false);
    toast.success("Colaborador atualizado");
    router.refresh();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="bg-primary text-primary-foreground gap-2">
        <Pencil className="w-4 h-4" /> Editar
      </Button>
      <CollaboratorDialog
        open={open}
        onOpenChange={setOpen}
        collaborator={collaborator}
        onSuccess={handleSuccess}
      />
    </>
  );
}
