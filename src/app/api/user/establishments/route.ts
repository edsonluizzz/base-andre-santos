import { NextResponse } from "next/server";

// UserEstablishment model não existe neste schema — funcionalidade não disponível
export async function GET() {
  return NextResponse.json([], { status: 200 });
}
