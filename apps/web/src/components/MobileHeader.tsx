"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useSidebar } from "./SidebarContext";

// Map paths to page titles
const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/matches": "Matches",
  "/dashboard/library": "Library",
  "/dashboard/settings": "Settings",
};

// Pages that should show a back button (not main nav items)
const subPages = ["/dashboard/skill"];

export function MobileHeader() {
  const pathname = usePathname();
  const { setOpen } = useSidebar();

  // Determine if we're on a sub-page that needs a back button
  const isSubPage = subPages.some((path) => pathname.startsWith(path));

  // Get page title
  let title = pageTitles[pathname];
  if (!title && pathname.startsWith("/dashboard/skill/")) {
    const domain = pathname.split("/").pop();
    title = domain ? domain.charAt(0).toUpperCase() + domain.slice(1) : "Skill";
  }

  return (
    <header className="lg:hidden sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-800/50">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Left side: hamburger or back button */}
        <div className="flex items-center gap-3">
          {isSubPage ? (
            <Link
              href="/dashboard"
              className="flex items-center justify-center w-10 h-10 -ml-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </Link>
          ) : (
            <button
              onClick={() => setOpen(true)}
              className="flex items-center justify-center w-10 h-10 -ml-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
          )}

          {/* Page title */}
          <span className="text-sm font-medium text-white">
            {title || "Tactix"}
          </span>
        </div>

        {/* Right side: logo */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="Tactix"
            width={28}
            height={28}
            className="rounded-lg"
          />
        </Link>
      </div>
    </header>
  );
}
