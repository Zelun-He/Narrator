"use client";

import "@/app/studio.css";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { usePathname } from "next/navigation";
const pageTitles: Record<string, string> = {
  "/library": "Your library",
  "/upload": "New audiobook",
  "/voices": "Voice studio",
  "/processing": "Narration progress",
  "/player": "Listening room",
  "/guide": "Getting started",
  "/account": "Your account",
  "/requests": "Request history",
  "/admin": "Manage accounts",
};
export default function DashboardShell({
  children,
  user,
  demo = false,
}: {
  user: { name: string; email: string; role?: string | null };
  children: React.ReactNode;
  demo?: boolean;
}) {
  const pathname = usePathname();
  return (
    <SidebarProvider className="author-studio">
      <AppSidebar user={user} demo={demo} />
      <SidebarInset className="min-w-0">
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <header className="studio-header">
          <div className="flex items-center gap-3">
            <SidebarTrigger aria-label="Toggle navigation" />
            <span className="hidden text-xs text-muted-foreground sm:inline">
              Workspace
            </span>
            <span className="hidden text-border sm:inline">/</span>
            <span className="text-xs font-medium">
              {pageTitles[demo ? pathname.replace(/^\/demo/, "") : pathname] || "Narrator"}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="free-label">
              <span className="size-1.5 rounded-full bg-primary" />
              Free for authors
            </span>
            <ThemeToggle />
          </div>
        </header>
        <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
          {demo && <div role="note" className="border-b bg-primary/5 px-6 py-3 text-sm text-muted-foreground">Demo studio · Sample books only. Uploads and account changes are unavailable in this preview.</div>}
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
