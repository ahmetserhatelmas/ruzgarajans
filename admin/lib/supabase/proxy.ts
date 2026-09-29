import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const path = request.nextUrl.pathname;
  const isLogin = path === "/login" || path.startsWith("/login/");
  const isAuth = path.startsWith("/auth/");
  const isPublicShare = path.startsWith("/p/");
  const isEmailOtp = path === "/api/email-otp";
  const isPasswordUpdate = path === "/login/update-password";

  if (isPublicShare || isAuth || isEmailOtp) {
    return supabaseResponse;
  }

  const hasAuthCookie = request.cookies
    .getAll()
    .some((cookie) => cookie.name.includes("-auth-token"));

  if (!hasAuthCookie) {
    if (isLogin || isPasswordUpdate) return supabaseResponse;
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Local JWT verify (getClaims) — avoids a round-trip to Auth on every navigation.
  const { data: claimsData, error } = await supabase.auth.getClaims();
  const loggedIn = Boolean(claimsData?.claims?.sub) && !error;

  if (!loggedIn && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (loggedIn && isLogin && !isPasswordUpdate) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
