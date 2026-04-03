import { NextResponse } from "next/server";

// EventRsvp model não existe neste schema — funcionalidade não disponível
export async function GET() {
  return NextResponse.json([], { status: 200 });
}

export async function POST() {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}

export async function DELETE() {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
