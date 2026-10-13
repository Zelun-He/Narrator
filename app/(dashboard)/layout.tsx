import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authorSession } from "@/lib/server/session";
import DashboardShell from "@/components/dashboard-shell";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await authorSession(await headers());
  if (!session) redirect("/login");
  return (
    <DashboardShell
      user={{ name: session.user.name, email: session.user.email, role: session.user.role }}
    >
      {children}
    </DashboardShell>
  );
}
