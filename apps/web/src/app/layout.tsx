import "./globals.css";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Inter, Chakra_Petch } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// Brand display font — Chakra Petch (matches the Tactix wordmark/lockup).
const chakraPetch = Chakra_Petch({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tactix",
  description: "Cross-game tactical FPS coach dashboard",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${chakraPetch.variable}`}>
      <body className="font-sans antialiased">
        <div className="min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
