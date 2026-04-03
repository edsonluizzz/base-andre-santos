import { NextResponse } from "next/server";

// Onboarding multi-tenant não disponível nesta instância (single-tenant UMADC)
export async function POST() {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
