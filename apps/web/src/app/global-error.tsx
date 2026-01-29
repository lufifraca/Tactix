"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body className="bg-zinc-950 text-white min-h-screen flex items-center justify-center">
        <div className="text-center px-6">
          <h1 className="text-4xl font-bold mb-4">Something went wrong</h1>
          <p className="text-zinc-400 mb-6">
            An unexpected error occurred. Our team has been notified.
          </p>
          <button
            onClick={reset}
            className="px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-medium hover:opacity-90 transition-opacity"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
