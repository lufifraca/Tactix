"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { BrandMark } from "./BrandMark";
import { LayoutGrid, History, Library, Sliders, type IconProps } from "@/components/icons";
import type { ComponentType } from "react";

type Tab = {
  href: string;
  label: string;
  icon: ComponentType<IconProps>;
  exact?: boolean;
};

const tabs: Tab[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid, exact: true },
  { href: "/dashboard/matches", label: "Matches", icon: History },
  { href: "/dashboard/library", label: "Library", icon: Library },
  { href: "/dashboard/settings", label: "Settings", icon: Sliders },
];

export function TopNav() {
  const pathname = usePathname();
  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800/60 bg-zinc-950/85 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-4">
        {/* Brand row */}
        <div className="flex h-14 items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
            <BrandMark size={30} />
            <span className="font-display text-xl font-bold tracking-tight text-zinc-50">
              Tacti<span className="bg-gradient-to-br from-steel-300 to-steel-200 bg-clip-text text-transparent">x</span>
            </span>
          </Link>
          <span className="font-display text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-600">
            Coach
          </span>
        </div>

        {/* Tab strip */}
        <nav className="no-scrollbar -mb-px flex items-center gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const active = isActive(tab.href, tab.exact);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`relative flex shrink-0 items-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? "text-white" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {/* Duotone icon: filled accent chip when active */}
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors ${
                    active
                      ? "bg-steel-400/15 text-steel-300 ring-1 ring-inset ring-steel-300/30"
                      : "text-zinc-500"
                  }`}
                >
                  <Icon size={15} strokeWidth={active ? 2.4 : 2} />
                </span>
                {tab.label}
                {active && (
                  <motion.span
                    layoutId="tx-tab-underline"
                    className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-steel-300 to-steel-200"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
