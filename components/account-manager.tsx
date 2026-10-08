"use client";
import { useState } from "react";
import { usePagedResource } from "@/lib/use-paged-resource";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
type User = { id: string; name: string; email: string; role: string | null; banned: number; books: number; sessions: number };
type Accounts = { users: User[]; total: number; pages: number };
export function AccountManager() {
  const list = usePagedResource<Accounts>("/api/admin/accounts");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<{ user: User; action: "suspend" | "restore" | "revoke" } | null>(null);
  async function apply() {
    if (!pending) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      const response = await fetch("/api/admin/accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: pending.user.id, action: pending.action }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Couldn’t update this account.");
      setNotice(`Account updated: ${pending.user.email}.`); setPending(null); list.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Please try again."); }
    finally { setBusy(false); }
  }
  return <section className="studio-panel space-y-5" aria-label="Account management" aria-busy={list.loading || busy}>
    <label className="block space-y-2 text-sm" htmlFor="account-search"><span>Search by email or name</span><Input id="account-search" type="search" maxLength={100} value={list.search} onChange={e => list.searchFor(e.target.value)} /></label>
    <p role="status" className="text-sm text-muted-foreground">{list.loading ? "Loading accounts…" : `${list.data?.total ?? 0} accounts`}</p>
    {(error || list.error) && <p role="alert" className="text-sm text-destructive">{error || list.error}</p>}
    {notice && <p role="status" className="text-sm">{notice}</p>}
    {pending && <div className="rounded-xl border p-5 space-y-4">
      <h2 className="font-semibold text-sm">Confirm account change</h2>
      <p className="panel-description break-words">{pending.action === "suspend" ? "Suspend access and log out all devices for" : pending.action === "restore" ? "Restore sign-in access for" : "Log out all devices for"} {pending.user.email}? Saved manuscripts and audiobooks will be retained.</p>
      <div className="flex flex-wrap gap-3"><Button disabled={busy} onClick={() => void apply()}>Confirm {pending.action === "revoke" ? "log out" : pending.action}</Button><Button disabled={busy} variant="outline" onClick={() => setPending(null)}>Cancel</Button></div>
    </div>}
    {!list.loading && !list.error && <ul className="divide-y">{list.data?.users.map(user => {
      const admin = user.role?.split(",").includes("admin");
      return <li key={user.id} className="flex flex-wrap items-center justify-between gap-4 py-5">
        <div className="min-w-0"><h2 className="break-words font-semibold text-sm">{user.name}</h2><p className="break-all text-xs text-muted-foreground mt-1">{user.email}</p><p className="text-xs text-muted-foreground mt-2">{admin ? "Administrator" : user.banned ? "Suspended" : "Active"} · {user.books} books · {user.sessions} signed-in devices</p></div>
        {admin ? <span className="text-xs text-muted-foreground">Managed on server</span> : <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy || !!pending} onClick={() => setPending({ user, action: user.banned ? "restore" : "suspend" })}>{user.banned ? "Restore access" : "Suspend account"}</Button><Button variant="outline" disabled={busy || !!pending || !user.sessions} onClick={() => setPending({ user, action: "revoke" })}>Log out devices</Button></div>}
      </li>;
    })}</ul>}
    {!list.loading && !list.error && list.data?.users.length === 0 && <p className="panel-description">No matching accounts.</p>}
    <div className="flex items-center justify-between gap-3"><Button variant="outline" disabled={list.loading || busy || list.page === 1} onClick={() => list.setPage(p => p - 1)}>Previous</Button><span className="text-xs">Page {list.page} of {list.data?.pages ?? 1}</span><Button variant="outline" disabled={list.loading || busy || list.page >= (list.data?.pages ?? 1)} onClick={() => list.setPage(p => p + 1)}>Next</Button></div>
  </section>;
}
