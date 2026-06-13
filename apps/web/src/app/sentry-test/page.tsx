"use client";

// TEMPORARY debug page to verify Sentry is capturing errors in production.
// Visit /sentry-test on the live site, click the button, then check your
// Sentry dashboard (Issues). Delete this folder once you've confirmed it works.
export default function SentryTestPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Sentry test</h1>
      <p className="mt-3 text-zinc-400">
        Click the button to throw an uncaught error. In production it should appear
        in your Sentry dashboard within a minute. (Does nothing useful in local dev —
        Sentry is production-only.)
      </p>
      <button
        onClick={() => {
          throw new Error("Sentry frontend test error — if you see this in Sentry, monitoring works.");
        }}
        className="mt-6 rounded-lg bg-red-600 px-5 py-2.5 font-medium text-white hover:bg-red-500"
      >
        Throw test error
      </button>
    </main>
  );
}
