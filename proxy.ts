import { NextResponse, type NextRequest } from "next/server";
export function proxy(request:NextRequest) {
  if(request.nextUrl.pathname.startsWith("/audio/")) return new NextResponse(null,{status:404});
  const cookie=request.cookies.get("better-auth.session_token")||request.cookies.get("__Secure-better-auth.session_token");
  if(!cookie) {
    const login=new URL("/login",request.url);
    login.searchParams.set("next",request.nextUrl.pathname+request.nextUrl.search);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}
export const config={matcher:["/library","/upload","/voices","/processing","/player","/guide","/account","/requests","/admin","/audio/:path*"]};
