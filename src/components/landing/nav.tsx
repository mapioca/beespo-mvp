"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Templates", href: "/templates" },
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
  { label: "Support", href: "/support" },
  { label: "Docs", href: "/docs" },
  { label: "Sign In", href: "/login" },
] as const;
const GET_STARTED_ITEM = { label: "Get Started", href: "/signup" } as const;

function isNavItemActive(pathname: string, href: string) {
  if (pathname === href) return true;
  if (href === "/") return pathname === "/";
  return pathname.startsWith(`${href}/`);
}

type NavLinkItem = {
  label: string;
  href: string;
};

type LandingNavLinkVariant = "desktop" | "mobile";

interface LandingNavLinkProps {
  item: NavLinkItem;
  pathname: string;
  variant: LandingNavLinkVariant;
  cta?: boolean;
}

function LandingNavLink({
  item,
  pathname,
  variant,
  cta = false,
}: LandingNavLinkProps) {
  const active = isNavItemActive(pathname, item.href);
  const isDesktop = variant === "desktop";

  return (
    <Button
      asChild
      variant={cta ? "default" : "ghost"}
      size={isDesktop ? "sm" : undefined}
      className={cn(
        isDesktop
          ? "h-9 px-3 text-[length:var(--landing-nav-link-font-size)] transition-colors"
          : "h-11 justify-start px-3 text-[length:var(--landing-nav-link-font-size)] transition-colors",
        cta &&
          (isDesktop
            ? "ml-1 h-9 px-4 text-[length:var(--landing-nav-link-font-size)]"
            : "mt-2"),
        !cta &&
          (active
            ? "bg-foreground text-background hover:bg-foreground/90"
            : "hover:bg-accent hover:text-accent-foreground"),
        cta && active && "bg-foreground/90"
      )}
    >
      <Link href={item.href} aria-current={active ? "page" : undefined}>
        {item.label}
      </Link>
    </Button>
  );
}

export function Nav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed left-0 right-0 top-0 z-50 h-[var(--landing-nav-height)] border-b bg-background/90 backdrop-blur-sm"
    >
      <div className="container mx-auto flex h-full items-center justify-between px-[var(--landing-nav-horizontal-padding)]">
        <Link
          href="/"
          className="text-[length:var(--landing-nav-logo-font-size)] font-bold tracking-tight transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Beespo
        </Link>
        <div className="hidden items-center gap-1 sm:flex">
          {NAV_ITEMS.map((item) => {
            return (
              <LandingNavLink
                key={item.href}
                item={item}
                pathname={pathname}
                variant="desktop"
              />
            );
          })}
          <LandingNavLink item={GET_STARTED_ITEM} pathname={pathname} variant="desktop" cta />
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 sm:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="w-[var(--landing-nav-mobile-panel-width)] px-4 transition-none data-[state=open]:duration-0 data-[state=closed]:duration-0 data-[state=open]:animate-none data-[state=closed]:animate-none"
          >
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SheetDescription className="sr-only">
              Primary site navigation links
            </SheetDescription>
            <div className="mt-10 flex flex-col gap-2">
              {NAV_ITEMS.map((item) => {
                return (
                  <SheetClose key={item.href} asChild>
                    <LandingNavLink
                      item={item}
                      pathname={pathname}
                      variant="mobile"
                    />
                  </SheetClose>
                );
              })}
              <SheetClose asChild>
                <LandingNavLink
                  item={GET_STARTED_ITEM}
                  pathname={pathname}
                  variant="mobile"
                  cta
                />
              </SheetClose>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
