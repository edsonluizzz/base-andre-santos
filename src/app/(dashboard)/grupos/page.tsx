import { redirect } from "next/navigation";

/**
 * O antigo menu "Grupos WhatsApp" foi unificado na Central de WhatsApp.
 * A gestão de grupos agora vive na aba "Grupos" de /whatsapp.
 */
export default function GruposPage() {
  redirect("/whatsapp");
}
