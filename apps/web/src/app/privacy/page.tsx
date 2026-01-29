"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Link
            href="/login"
            className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            &larr; Back to Tactix
          </Link>

          <h1 className="mt-8 text-4xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-zinc-500">Last updated: January 2025</p>

          <div className="mt-10 space-y-8 text-zinc-300 leading-relaxed">
            <section>
              <h2 className="text-xl font-semibold text-white mb-3">1. Information We Collect</h2>
              <p>When you use Tactix, we collect:</p>
              <ul className="mt-3 list-disc list-inside space-y-2 text-zinc-400">
                <li><strong className="text-zinc-300">Account Information:</strong> Email address, display name, and avatar from your Google or Discord login</li>
                <li><strong className="text-zinc-300">Game Account Data:</strong> Player tags, usernames, and IDs you provide to link your game accounts</li>
                <li><strong className="text-zinc-300">Game Statistics:</strong> Match history, ranks, and performance data retrieved from game APIs (Marvel Rivals, Valorant, Clash Royale, Brawl Stars)</li>
                <li><strong className="text-zinc-300">Usage Data:</strong> How you interact with the dashboard, features used, and session information</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">2. How We Use Your Data</h2>
              <p>We use your information to:</p>
              <ul className="mt-3 list-disc list-inside space-y-2 text-zinc-400">
                <li>Display your game statistics and performance analytics</li>
                <li>Generate personalized quests and coaching insights</li>
                <li>Track your progress and skill development over time</li>
                <li>Process subscription payments (via Stripe)</li>
                <li>Send important account notifications</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">3. Data Sources</h2>
              <p className="text-zinc-400">
                We retrieve game data from official and community APIs including Supercell APIs (Clash Royale, Brawl Stars),
                community APIs for Marvel Rivals, and Henrik API for Valorant. We store raw API responses to ensure data
                accuracy and enable historical analysis.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">4. Data Storage & Security</h2>
              <p className="text-zinc-400">
                Your data is stored securely using industry-standard encryption. We use PostgreSQL for structured data
                and S3-compatible storage for raw API payloads. Authentication is handled via OAuth 2.0 with secure
                session management.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">5. Third-Party Services</h2>
              <p>We use the following third-party services:</p>
              <ul className="mt-3 list-disc list-inside space-y-2 text-zinc-400">
                <li><strong className="text-zinc-300">Stripe:</strong> Payment processing for Pro subscriptions</li>
                <li><strong className="text-zinc-300">Google/Discord:</strong> Authentication providers</li>
                <li><strong className="text-zinc-300">Vercel:</strong> Web hosting</li>
                <li><strong className="text-zinc-300">Game APIs:</strong> Supercell, community APIs for game data</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">6. Data Retention</h2>
              <p className="text-zinc-400">
                We retain your data for as long as your account is active. Match history and statistics are kept
                indefinitely to provide historical insights. You can request deletion of your account and associated
                data at any time by contacting us.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">7. Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="mt-3 list-disc list-inside space-y-2 text-zinc-400">
                <li>Access the personal data we hold about you</li>
                <li>Request correction of inaccurate data</li>
                <li>Request deletion of your account and data</li>
                <li>Unlink game accounts at any time</li>
                <li>Cancel your subscription without losing access to free features</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">8. Children's Privacy</h2>
              <p className="text-zinc-400">
                Tactix is not intended for children under 13. We do not knowingly collect personal information
                from children under 13. If you believe we have collected such information, please contact us.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">9. Changes to This Policy</h2>
              <p className="text-zinc-400">
                We may update this Privacy Policy from time to time. We will notify you of significant changes
                by posting the new policy on this page and updating the "Last updated" date.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">10. Contact Us</h2>
              <p className="text-zinc-400">
                If you have questions about this Privacy Policy or your data, please contact us at{" "}
                <a href="mailto:support@tactix.gg" className="text-cyan-400 hover:text-cyan-300">
                  support@tactix.gg
                </a>
              </p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-zinc-800">
            <Link
              href="/terms"
              className="text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              View Terms of Service &rarr;
            </Link>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
