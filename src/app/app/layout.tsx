"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Loader2, Search } from "lucide-react";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { usePathname, useRouter } from "next/navigation";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useConvexAuth } from "convex/react";
import { Fragment, useEffect } from "react";

function getBreadcrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs: { label: string; href: string; isCurrentPage: boolean }[] =
    [];

  segments.forEach((segment, index) => {
    if (segment === "app") return;

    const href = "/" + segments.slice(0, index + 1).join("/");
    const isCurrentPage = index === segments.length - 1;

    let label = segment.charAt(0).toUpperCase() + segment.slice(1);

    if (segment.match(/^[a-z0-9]+$/i) && segment.length > 10) {
      label = "Details";
    }

    breadcrumbs.push({ label, href, isCurrentPage });
  });

  return breadcrumbs;
}

function DashboardHeader() {
  const pathname = usePathname();
  const breadcrumbs = getBreadcrumbs(pathname);
  return (
    <header
      className={cn(
        "sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2",
        "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        "px-4 transition-all duration-200 ease-linear",
        // Rounded top corners for inset look
        "rounded-t-xl border-b",
      )}
    >
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="/app/jobs">
                <Search className="h-3.5 w-3.5" />
              </BreadcrumbLink>
            </BreadcrumbItem>
            {breadcrumbs.length > 0 && (
              <BreadcrumbSeparator className="hidden md:block" />
            )}
            {breadcrumbs.map((crumb, index) => (
              <Fragment key={crumb.href}>
                {index > 0 && (
                  <BreadcrumbSeparator className="hidden md:block" />
                )}
                <BreadcrumbItem>
                  {crumb.isCurrentPage ? (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={crumb.href}>
                      {crumb.label}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:flex">
          <span className="text-xs">⌘</span>B
        </kbd>
      </div>
    </header>
  );
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { state } = useSidebar();

  return (
    <SidebarInset
      className={cn(
        "min-h-screen bg-sidebar",
        "transition-all duration-200 ease-linear",
      )}
    >
      <div
        className={cn(
          "flex min-h-screen flex-col",
          "bg-background rounded-xl shadow-sm",
          "ml-0",
          state === "collapsed" && "ml-2",
        )}
      >
        <DashboardHeader />
        <main className="flex-1 overflow-auto">
          <div className="container max-w-6xl py-6 px-4 md:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </SidebarInset>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sidebar">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <DashboardShell>{children}</DashboardShell>
    </SidebarProvider>
  );
}
