import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const ALLOWED_DOMAINS = ["cdninstagram.com", "fbcdn.net", "metricool.com", "instagram.com"];

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const raw = req.nextUrl.searchParams.get("url");
  if (!raw) return new NextResponse("Missing url param", { status: 400 });

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return new NextResponse("Invalid url", { status: 400 });
  }

  if (!ALLOWED_DOMAINS.some((d) => url.hostname === d || url.hostname.endsWith(`.${d}`))) {
    return new NextResponse("Forbidden domain", { status: 403 });
  }

  try {
    const res = await fetch(raw, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "image/*,*/*;q=0.8",
      },
    });

    if (!res.ok) return new NextResponse("Upstream error", { status: res.status });

    const buffer = await res.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": res.headers.get("Content-Type") ?? "image/jpeg",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=300",
      },
    });
  } catch {
    return new NextResponse("Fetch failed", { status: 502 });
  }
}
