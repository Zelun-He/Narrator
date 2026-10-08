import { getAuth } from "@/lib/auth";
import { withUser, isAdministrator, ApiError, consumeQuota } from "@/lib/server/api";
import { accountList } from "@/lib/server/account-management";
import { getDatabase } from "@/lib/server/database";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return withUser(request, user => {
    if (!isAdministrator(user)) throw new ApiError(403, "Administrator access is required.");
    return Response.json(accountList(request));
  });
}
export async function POST(request: Request) {
  return withUser(request, async user => {
    if (!isAdministrator(user)) throw new ApiError(403, "Administrator access is required.");
    consumeQuota(`admin:${user.id}`, 30, 60_000);
    if (Number(request.headers.get("content-length") ?? 0) > 2048)
      throw new ApiError(413, "The account request is too large.");
    if (!request.body) throw new ApiError(400, "Invalid account request.");
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    try {
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        bytes += part.value.length;
        if (bytes > 2048) { await reader.cancel(); throw new ApiError(413, "The account request is too large."); }
        chunks.push(part.value);
      }
    } finally { reader.releaseLock(); }
    const text = Buffer.concat(chunks).toString("utf8");
    let body: { userId?: unknown; action?: unknown };
    try { body = JSON.parse(text); } catch { throw new ApiError(400, "Invalid account request."); }
    if (!body || typeof body.userId !== "string" || body.userId.length > 100 ||
      typeof body.action !== "string" || !["suspend", "restore", "revoke"].includes(body.action))
      throw new ApiError(400, "Select a valid account action.");
    const target = getDatabase().prepare("SELECT id,role FROM user WHERE id=?").get(body.userId) as { id: string; role: string | null } | undefined;
    if (!target) throw new ApiError(404, "Account not found.");
    if (target.id === user.id || isAdministrator(target))
      throw new ApiError(409, "Administrator accounts are managed from the server command line.");
    const auth = await getAuth();
    const params = { headers: request.headers, body: { userId: target.id } };
    if (body.action === "suspend") await auth.api.banUser({ ...params, body: { userId: target.id, banReason: "Suspended by the server operator." } });
    if (body.action === "restore") await auth.api.unbanUser(params);
    if (body.action === "revoke") await auth.api.revokeUserSessions(params);
    return Response.json({ ok: true });
  });
}
