import { Suspense } from "react";
import { AccountForm } from "@/components/account-form";
export default function SignupPage() {
  return (
    <Suspense fallback={<main className="p-10">Opening your studio…</main>}>
      <AccountForm signup />
    </Suspense>
  );
}
