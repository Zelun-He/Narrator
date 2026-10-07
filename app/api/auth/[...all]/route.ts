import { getAuth } from "@/lib/auth";
export const runtime = "nodejs";
async function handle(request: Request) {
  return (await getAuth()).handler(request);
}
export const GET = handle;
export const POST = handle;
