import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { PageHeading } from "@/components/studio-elements";
import { AccountSettings } from "@/components/account-settings";
export default async function AccountPage() {
  const session = await (await getAuth()).api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  return <div className="studio-container studio-container-narrow">
    <PageHeading eyebrow="YOUR ACCOUNT" title="Make yourself at home." description="Manage your author profile, password, and signed-in devices." />
    <AccountSettings name={session.user.name} email={session.user.email} />
  </div>;
}
