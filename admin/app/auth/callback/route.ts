import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = url.searchParams.get("next") || "/login/update-password";
  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as "recovery" | "email" | "invite" | "magiclink" | "email_change",
      token_hash: tokenHash,
    });
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }

  return NextResponse.redirect(new URL("/login?error=reset", url.origin));
}
