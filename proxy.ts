import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createProxyClient } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const { supabase, response } = createProxyClient(request);
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isSignIn = pathname === "/sign-in";

  if (!user && !isSignIn) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  if (user && isSignIn) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
