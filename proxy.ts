import { NextResponse, type NextRequest } from "next/server";
import { backendOrigin } from "@/lib/backend-config.mjs";
export function proxy(request:NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const upstream = backendOrigin();
    if (upstream) {
      if (upstream === request.nextUrl.origin) return NextResponse.json({ error: "Invalid backend configuration." }, { status: 503 });
      const target = new URL(upstream);
      target.pathname = request.nextUrl.pathname;
      target.search = request.nextUrl.search;
      return NextResponse.rewrite(target);
    }
    return NextResponse.next();
  }
  if(request.nextUrl.pathname.startsWith("/audio/")) return new NextResponse(null,{status:404});
  const cookie=request.cookies.get("better-auth.session_token")||request.cookies.get("__Secure-better-auth.session_token");
  if(!cookie) {
    const login=new URL("/login",request.url);
    login.searchParams.set("next",request.nextUrl.pathname+request.nextUrl.search);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}
export const config={matcher:["/api/:path*","/library","/upload","/voices","/processing","/player","/guide","/account","/requests","/admin","/audio/:path*"]};
