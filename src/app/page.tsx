import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LandingContent } from "./LandingContent";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Ovile Eleitoral",
  description: "Plataforma de gestão de base eleitoral · Paraná 2026",
};

export default async function Home() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");
  return <LandingContent />;
}
