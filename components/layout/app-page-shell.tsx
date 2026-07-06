"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ModeToggle } from "@/components/toggle-theme";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface AppPageShellProps {
  title: string;
  children: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  hidePageTitle?: boolean;
}

export function AppPageShell({
  title,
  children,
  breadcrumbs = [],
  actions,
  hidePageTitle = false,
}: AppPageShellProps) {
  const trilha = breadcrumbs.length > 0 ? breadcrumbs : [{ label: title }];

  return (
    <div className="-mx-4 flex min-h-[calc(100dvh-4.5rem)] flex-col bg-[#F6F8FB] text-[#0F172A] antialiased [-webkit-font-smoothing:antialiased]">
      <header className="sticky top-0 z-20 border-b border-[#E5EAF2] bg-[rgba(255,255,255,0.85)] backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-3 px-4 py-3.5 sm:px-7">
          <nav
            className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-[13px] text-[#64748B]"
            aria-label="Localização no sistema"
          >
            {trilha.map((item, index) => {
              const isLast = index === trilha.length - 1;
              return (
                <div key={`${item.label}-${index}`} className="flex items-center gap-2">
                  {item.href && !isLast ? (
                    <Link href={item.href} className="font-medium hover:text-[#0A328D]">
                      {item.label}
                    </Link>
                  ) : (
                    <span className={isLast ? "font-semibold text-[#0F172A]" : "font-medium"}>
                      {item.label}
                    </span>
                  )}
                  {!isLast ? (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#94A3B8]" aria-hidden />
                  ) : null}
                </div>
              );
            })}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            {actions}
            <ModeToggle />
          </div>
        </div>
      </header>

      <div className="mx-auto flex min-h-0 w-full max-w-[1400px] flex-1 flex-col px-4 pb-8 pt-5 sm:px-7 sm:pb-10">
        {!hidePageTitle ? (
          <div className="mb-5">
            <h1 className="text-[22px] font-bold tracking-tight text-[#0F172A]">{title}</h1>
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}
