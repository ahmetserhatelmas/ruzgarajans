import { NextResponse } from "next/server";
import { handleEmailOtp } from "@/lib/email-otp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const result = await handleEmailOtp(body);
    return NextResponse.json(result, { headers: cors });
  } catch (error) {
    const message = error instanceof Error ? error.message : "server_error";
    if (message === "resend_not_configured" || message === "email_send_failed") {
      return NextResponse.json({ ok: false, code: message }, { headers: cors });
    }
    console.error(error);
    return NextResponse.json({ ok: false, code: "server_error" }, { headers: cors });
  }
}
