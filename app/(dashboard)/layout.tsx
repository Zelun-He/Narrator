import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import DashboardShell from "@/components/dashboard-shell";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await (
    await getAuth()
  ).api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  return (
    <DashboardShell
      user={{ name: session.user.name, email: session.user.email }}
    >
      {children}
    </DashboardShell>
  );
}
