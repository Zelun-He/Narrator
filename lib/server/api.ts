import { NextResponse } from "next/server";
import { getAuth, AUTH_ORIGIN } from "../auth";
import { ApiError } from "./errors";
import { getDatabase } from "./database";
export { ApiError } from "./errors";
export type AuthorUser = { id: string; name: string; email: string };

export async function withUser(
  request: Request,
  action: (user: AuthorUser) => Promise<Response> | Response,
) {
  try {
    if (!["GET", "HEAD"].includes(request.method)) {
      const origin = request.headers.get("origin");
      if (
        (origin && origin !== AUTH_ORIGIN) ||
        request.headers.get("sec-fetch-site") === "cross-site"
      )
        throw new ApiError(
          403,
          "This request must come from your Narrator studio.",
        );
    }
    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) throw new ApiError(401, "Please log in to your studio.");
    const response = await action(session.user);
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("X-Content-Type-Options", "nosniff");
    return response;
  } catch (error) {
    if (error instanceof ApiError)
      return NextResponse.json(
        { error: error.message },
        {
          status: error.status,
          headers: { "Cache-Control": "private, no-store" },
        },
      );
    console.error("Narrator request failed:", error);
    return NextResponse.json(
      {
        error: "Your studio couldn’t complete this request. Please try again.",
      },
      { status: 500, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}

export function consumeQuota(key: string, max: number, windowMs: number) {
  const db = getDatabase();
  db.transaction(() => {
    const now = Date.now();
    db.prepare("DELETE FROM usage_limits WHERE reset_at < ?").run(now);
    const row = db
      .prepare("SELECT count FROM usage_limits WHERE key = ?")
      .get(key) as { count: number } | undefined;
    if (row && row.count >= max)
      throw new ApiError(
        429,
        "You’ve reached the creation limit for now. Please try again in an hour.",
      );
    db.prepare(
      "INSERT INTO usage_limits(key,count,reset_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1",
    ).run(key, now + windowMs);
  }).immediate();
}
