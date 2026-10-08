import { getAuth } from "@/lib/auth";
export const runtime = "nodejs";
const publicRoutes = new Set([
  "/sign-up/email", "/sign-in/email", "/sign-out", "/get-session",
  "/update-user", "/change-password", "/list-sessions", "/revoke-session",
  "/revoke-sessions", "/revoke-other-sessions", "/ok", "/error",
]);
async function handle(request: Request) {
  // Operator actions are exposed only through our bounded, protected account API.
  // Keep the plugin's wider admin endpoint set unavailable over HTTP.
  const pathname = new URL(request.url).pathname;
  if (!publicRoutes.has(pathname.slice("/api/auth".length)))
    return Response.json({ error: "Not found." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  return (await getAuth()).handler(request);
}
export const GET = handle;
export const POST = handle;
