import "server-only";
import { backendOrigin } from "../backend-config.mjs";
import { z } from "zod";
const sessionSchema = z.object({ user: z.object({
  id: z.string(), name: z.string(), email: z.string(), role: z.string().nullable().optional(),
}) });
export async function authorSession(headers: Headers) {
  const upstream = backendOrigin();
  if (!upstream) {
    const { getAuth } = await import("../auth");
    return (await getAuth()).api.getSession({ headers });
  }
  // Forward only the author session cookie, not unrelated frontend cookies.
  const cookie = (headers.get("cookie") || "").split(";").filter(part =>
    /^(?:__Secure-)?better-auth\.session_token=/.test(part.trim()),
  ).join(";");
  if (!cookie) return null;
  const response = await fetch(`${upstream}/api/auth/get-session`, {
    headers: { cookie }, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15000),
  });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error("The Narrator account server is unavailable.");
  const data: unknown = await response.json();
  return data === null ? null : sessionSchema.parse(data);
}
