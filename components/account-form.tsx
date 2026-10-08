"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { authClient } from "@/lib/auth-client";
import { safeReturnTo } from "@/lib/auth-redirect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRight } from "lucide-react";
import "@/app/studio.css";
export function AccountForm({ signup = false }: { signup?: boolean }) {
  const next = safeReturnTo(useSearchParams().get("next"));
  const [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      if (!signup && email.trim().toLowerCase() === "testuser") {
        if (password !== "123456") {
          setError("The demo password is 123456.");
          setBusy(false);
          return;
        }
        window.location.assign("/demo/library");
        return;
      }
      const result = signup
        ? await authClient.signUp.email({
            name: name.trim(),
            email: email.trim(),
            password,
          })
        : await authClient.signIn.email({ email: email.trim(), password });
      if (result.error) {
        setError(
          result.error.status === 429
            ? "Too many attempts. Please wait a minute and try again."
            : signup
              ? result.error.message ||
                "Your account couldn’t be created. Please try again."
              : "Your email or password wasn’t recognized. Please try again.",
        );
        setBusy(false);
        return;
      }
      window.location.assign(next);
    } catch {
      setError("Connection interrupted. Please try again.");
      setBusy(false);
    }
  }
  return (
    <main className="author-studio min-h-screen bg-background px-5 py-12">
      <div className="mx-auto max-w-md">
        <Link href="/" className="mb-10 inline-flex items-center gap-3">
          <Image src="/brand/narrator-mark.svg" width={42} height={42} alt="" />
          <span className="brand-name">Narrator.</span>
        </Link>
        <p className="eyebrow">YOUR AUTHOR’S STUDIO</p>
        <h1 className="mt-4 font-serif text-4xl">
          {signup ? "Your story starts here." : "Welcome back."}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          {signup
            ? "Create your free account. Upload a manuscript and give your words a voice."
            : "Log in to your private library and pick up where you left off."}
        </p>
        <form onSubmit={submit} className="studio-panel mt-8 space-y-5">
          {signup && (
            <div className="space-y-2">
              <Label htmlFor="name">Your name</Label>
              <Input
                id="name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={100}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">{signup ? "Email address" : "Email or demo username"}</Label>
            <Input
              id="email"
              type={signup ? "email" : "text"}
              autoComplete={signup ? "email" : "username"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              maxLength={254}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete={signup ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={signup ? 10 : undefined}
              maxLength={128}
              aria-describedby={signup ? "password-help" : undefined}
            />
            {signup && (
              <p id="password-help" className="text-xs text-muted-foreground">
                Use at least 10 characters.
              </p>
            )}
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <ArrowRight size={16} />
            )}{" "}
            {busy
              ? "Opening your studio…"
              : signup
                ? "Create free account"
                : "Log in"}
          </Button>
        </form>
        {!signup && (
          <p className="mt-5 text-center text-sm text-muted-foreground">
            Preview the dashboard: <strong>testuser</strong> / <strong>123456</strong>
          </p>
        )}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {signup ? "Already have an account? " : "New to Narrator? "}
          <Link
            className="font-medium text-primary underline"
            href={`${signup ? "/login" : "/signup"}?next=${encodeURIComponent(next)}`}
          >
            {signup ? "Log in" : "Create a free account"}
          </Link>
        </p>
        <p className="mt-8 text-center text-xs leading-relaxed text-muted-foreground">
          Your manuscripts and generated audio are visible only to your account.
          No subscription or payment details.
        </p>
      </div>
    </main>
  );
}
