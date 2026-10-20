import { NextResponse } from "next/server";
import { checkAIProvider } from "@/lib/ai/providers";

export const runtime = "nodejs";

export async function GET() {
  const result = await checkAIProvider();
  return NextResponse.json(result, { status: result.ok ? 200 : 503 });
}
