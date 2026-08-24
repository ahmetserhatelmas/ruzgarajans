import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/queries";
import { synthesizeTurkish } from "@/lib/edge-tts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const { profile } = await requireAdmin();
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    text?: string;
    voice?: "female" | "male";
    rate?: number;
  } | null;
  const text = String(body?.text ?? "").trim();
  if (!text || text.length > 8000) {
    return NextResponse.json({ error: "Metin gerekli." }, { status: 400 });
  }

  try {
    const audio = await synthesizeTurkish(
      text,
      body?.voice === "male" ? "male" : "female",
      Number(body?.rate) || 1,
    );
    return new NextResponse(new Uint8Array(audio), {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ses üretilemedi.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
