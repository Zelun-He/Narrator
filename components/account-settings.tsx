"use client";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AccountSettings({ name, email }: { name: string; email: string }) {
  const [displayName, setDisplayName] = useState(name);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function run(action: () => Promise<{ error?: { message?: string } | null }>, message: string) {
    setBusy(true); setNotice(null); setError(null);
    try {
      const result = await action();
      if (result.error) throw new Error(result.error.message || "Please try again.");
      setNotice(message);
    } catch (err) { setError(err instanceof Error ? err.message : "Couldn’t save your changes."); }
    finally { setBusy(false); }
  }
  return (
    <div className="space-y-6">
      {notice && <p role="status" className="rounded-xl border p-4 text-sm">{notice}</p>}
      {error && <p role="alert" className="rounded-xl border p-4 text-sm text-destructive">{error}</p>}
      <form className="studio-panel space-y-5" onSubmit={e => {
        e.preventDefault();
        void run(() => authClient.updateUser({ name: displayName.trim() }), "Your name is saved.");
      }}>
        <h2 className="panel-title">Your author profile</h2>
        <p className="panel-description break-all">Signed in as {email}</p>
        <label className="block space-y-2 text-sm" htmlFor="author-name">
          <span>Display name</span>
          <Input id="author-name" autoComplete="name" value={displayName} required minLength={1} maxLength={100} onChange={e => setDisplayName(e.target.value)} />
        </label>
        <Button disabled={busy || !displayName.trim()} type="submit">Save profile</Button>
      </form>
      <form className="studio-panel space-y-5" onSubmit={e => {
        e.preventDefault();
        void run(async () => {
          const result = await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true });
          if (!result.error) { setCurrentPassword(""); setNewPassword(""); }
          return result;
        }, "Password changed. Your other devices have been logged out.");
      }}>
        <h2 className="panel-title">Change your password</h2>
        <p className="panel-description">Use at least 10 characters. Changing your password also logs out your other devices.</p>
        <label className="block space-y-2 text-sm" htmlFor="current-password">
          <span>Current password</span>
          <Input id="current-password" type="password" autoComplete="current-password" value={currentPassword} required maxLength={128} onChange={e => setCurrentPassword(e.target.value)} />
        </label>
        <label className="block space-y-2 text-sm" htmlFor="new-password">
          <span>New password</span>
          <Input id="new-password" type="password" autoComplete="new-password" value={newPassword} required minLength={10} maxLength={128} onChange={e => setNewPassword(e.target.value)} />
        </label>
        <Button disabled={busy} type="submit">Change password</Button>
      </form>
      <section className="studio-panel space-y-5" aria-labelledby="account-devices">
        <h2 id="account-devices" className="panel-title">Your devices</h2>
        <p className="panel-description">Keep this session and log out everywhere else.</p>
        <Button disabled={busy} variant="outline" onClick={() => void run(() => authClient.revokeOtherSessions(), "Your other devices have been logged out.")}>Log out other devices</Button>
      </section>
    </div>
  );
}
