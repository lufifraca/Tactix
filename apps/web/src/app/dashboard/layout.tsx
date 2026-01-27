"use client";

import { SidebarProvider } from "@/components/SidebarContext";
import { Sidebar } from "@/components/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
        {/* Ambient glow effects */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 -left-40 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl" />
        </div>

        <Sidebar />

        {/* Main content */}
        <div className="lg:ml-56 relative">
          {children}
        </div>
      </div>
    </SidebarProvider>
  );
}
