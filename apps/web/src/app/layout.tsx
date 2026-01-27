import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "tactix",
  description: "Cross-game tactical FPS coach dashboard",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
