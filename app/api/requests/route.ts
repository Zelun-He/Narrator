import { withUser } from "@/lib/server/api";
import { requestHistory } from "@/lib/server/account-management";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return withUser(request, user => Response.json(requestHistory(user.id, request)));
}
