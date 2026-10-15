import { NextRequest, NextResponse } from "next/server";

const rateMap = new Map<string, number[]>();
function rateLimit(key: string, limit = 30, windowMs = 60_000): boolean {
  const now = Date.now();
  const hits = (rateMap.get(key) ?? []).filter((t) => now - t < windowMs);
  hits.push(now);
  rateMap.set(key, hits);
  return hits.length <= limit;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(`verify:${ip}`)) {
    return NextResponse.json({ ok: false, error: "Too many requests." }, { status: 429 });
  }
  if (!token || token.length < 8) {
    return NextResponse.json({ ok: false, error: "Invalid credential." }, { status: 400 });
  }
  return NextResponse.json({ ok: false, error: "Credential not found." }, { status: 404 });
}
