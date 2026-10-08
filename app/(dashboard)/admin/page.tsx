import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { isAdministrator } from "@/lib/server/api";
import { PageHeading } from "@/components/studio-elements";
import { AccountManager } from "@/components/account-manager";
export default async function AdminPage() {
  const session = await (await getAuth()).api.getSession({ headers: await headers() });
  if (!session || !isAdministrator(session.user)) notFound();
  return <div className="studio-container studio-container-narrow">
    <PageHeading eyebrow="SERVER OPERATOR" title="A home for your authors." description="Manage the accounts stored on this Narrator server. Suspend access, restore it, or log out signed-in devices." />
    <AccountManager />
  </div>;
}
