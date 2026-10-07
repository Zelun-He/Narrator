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
};
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  return (
    <SidebarProvider className="author-studio">
      <AppSidebar />
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
              {pageTitles[pathname] || "Narrator"}
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
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
