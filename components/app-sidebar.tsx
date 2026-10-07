"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Library,
  Plus,
  Mic2,
  HelpCircle,
  ArrowUpRight,
  Heart,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const navigation = [
  { title: "Your library", href: "/library", icon: Library },
  { title: "New audiobook", href: "/upload", icon: Plus },
  { title: "Voice studio", href: "/voices", icon: Mic2 },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const closeMobile = () => {
    if (isMobile) setOpenMobile(false);
  };
  return (
    <Sidebar className="studio-sidebar" collapsible="offcanvas">
      <SidebarHeader className="p-7">
        <Link
          href="/"
          onClick={closeMobile}
          className="flex items-center gap-3"
        >
          <Image
            src="/brand/narrator-mark.svg"
            width={40}
            height={40}
            alt=""
            aria-hidden="true"
            className="brand-mark"
          />
          <div>
            <span className="brand-name">
              Narrator<span className="brand-period">.</span>
            </span>
            <p className="mt-1 text-[10px] uppercase tracking-[.2em] text-muted-foreground">
              An author’s studio
            </p>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="px-5 pt-6">
          <SidebarGroupLabel className="eyebrow mb-3 text-muted-foreground">
            Workspace
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              {navigation.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    className="h-11 rounded-lg px-3 text-sm data-[active=true]:bg-primary/10 data-[active=true]:text-primary"
                  >
                    <Link href={item.href} onClick={closeMobile}>
                      <item.icon size={18} />
                      <span>{item.title}</span>
                      {pathname === item.href && (
                        <span className="ml-auto size-1.5 rounded-full bg-primary" />
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="px-5 mt-6">
          <SidebarGroupLabel className="eyebrow mb-3 text-muted-foreground">
            Resources
          </SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild className="h-11">
                <Link href="/guide" onClick={closeMobile}>
                  <HelpCircle size={18} />
                  Getting started
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild className="h-11">
                <a
                  href="https://github.com/Zelun-He/Narrator"
                  target="_blank"
                  rel="noreferrer"
                >
                  <ArrowUpRight size={18} />
                  View on GitHub
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-5">
        <div className="rounded-xl border border-primary/15 bg-primary/5 p-4">
          <Heart size={18} className="mb-3 text-primary" />
          <p className="text-sm font-medium">Made for your stories.</p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Free audiobook creation. More room for your imagination.
          </p>
          <Link
            href="/upload"
            onClick={closeMobile}
            className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-primary"
          >
            Bring a book to life <ArrowUpRight size={14} />
          </Link>
        </div>
        <p className="pt-4 text-center text-[10px] tracking-wider text-muted-foreground">
          WORDS DESERVE TO BE HEARD
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
