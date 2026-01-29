import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only enable in production
  enabled: process.env.NODE_ENV === "production",

  // Performance monitoring
  tracesSampleRate: 0.1, // 10% of transactions

  // Session replay for debugging (captures user sessions on error)
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0, // Capture 100% of sessions with errors

  // Don't send errors in development
  beforeSend(event) {
    if (process.env.NODE_ENV === "development") {
      return null;
    }
    return event;
  },
});
