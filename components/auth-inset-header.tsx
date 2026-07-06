/** @format */

"use client";

import { usePathname } from "next/navigation";
import Breadcrumbs from "@/components/breadcrumbs";
import { ModeToggle } from "@/components/toggle-theme";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { isPedidosPreProjetosArthurSaboyaAreaPath } from "@/lib/pedidos-arthur-saboya-route";

/** Barra superior do app; some na área Arthur Saboya (navbar própria nas páginas). */
export function AuthInsetHeader() {
  const pathname = usePathname();
  if (isPedidosPreProjetosArthurSaboyaAreaPath(pathname)) {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full shrink-0 items-center justify-between gap-2 border-b border-border/60 bg-muted/50 px-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 dark:bg-background sm:px-0">
      <div className="flex min-w-0 flex-1 items-center gap-2 px-2 sm:px-4">
        <SidebarTrigger className="-ml-1 shrink-0 md:hidden" />
        <Separator
          orientation="vertical"
          className="mr-2 hidden h-4 sm:block md:ml-[-16px]"
        />
        <div className="min-w-0 flex-1">
          <Breadcrumbs />
        </div>
      </div>
      <div className="flex shrink-0 items-center px-2 sm:px-4">
        <ModeToggle />
      </div>
    </header>
  );
}
