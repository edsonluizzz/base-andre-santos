import { NextRequest, NextResponse } from "next/server";

const SRC_TO_CHANNEL: Record<string, string> = {
  instagram: "INSTAGRAM",
  whatsapp:  "WHATSAPP",
  evento:    "EVENTO",
  link:      "LINK",
  outro:     "OUTRO",
};

export async function GET(req: NextRequest) {
  const src = req.nextUrl.searchParams.get("src")?.toLowerCase() ?? "";
  const ref = req.nextUrl.searchParams.get("ref") ?? "";

  const channel = SRC_TO_CHANNEL[src] ?? "OUTRO";

  const base = process.env.APP_URL ?? req.nextUrl.origin;
  const dest = new URL("/cadastro", base);
  if (ref) dest.searchParams.set("ref", ref);
  dest.searchParams.set("ch", channel);

  return NextResponse.redirect(dest.toString(), { status: 302 });
}
