"use client";

import type { ComponentType } from "react";
import type { IconProps } from "@/components/icons";

export function SectionHeader({
  title,
  subtitle,
  icon: Icon,
}: {
  title: string;
  subtitle?: string;
  icon?: ComponentType<IconProps>;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        {Icon ? (
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-800/70 text-steel-300 ring-1 ring-inset ring-white/5">
            <Icon size={16} />
          </span>
        ) : (
          <span className="h-0.5 w-6 rounded-full bg-gradient-to-r from-steel-300 to-steel-600" />
        )}
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-200">{title}</h2>
      </div>
      {subtitle && <span className="text-xs text-zinc-600">{subtitle}</span>}
    </div>
  );
}
