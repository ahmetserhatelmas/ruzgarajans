import { NextResponse } from "next/server";
import { handleEmailOtp } from "@/lib/email-otp";
import { clientIp, isOtpAppAuthorized } from "@/lib/otp-protect";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, x-ruzgar-otp-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

export async function POST(request: Request) {
  if (!isOtpAppAuthorized(request)) {
    return NextResponse.json({ ok: false, code: "unauthorized" }, { status: 401, headers: cors });
  }
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const result = await handleEmailOtp(body, { ip: clientIp(request) });
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
