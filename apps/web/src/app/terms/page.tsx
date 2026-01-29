"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function TermsPage() {
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
            Terms of Service
          </h1>
          <p className="mt-2 text-sm text-zinc-500">Last updated: January 2025</p>

          <div className="mt-10 space-y-8 text-zinc-300 leading-relaxed">
            <section>
              <h2 className="text-xl font-semibold text-white mb-3">1. Acceptance of Terms</h2>
              <p className="text-zinc-400">
                By accessing or using Tactix ("the Service"), you agree to be bound by these Terms of Service.
                If you do not agree to these terms, please do not use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">2. Description of Service</h2>
              <p className="text-zinc-400">
                Tactix is a cross-game performance tracking and coaching platform. We aggregate your gaming
                statistics from supported games (Marvel Rivals, Valorant, Clash Royale, Brawl Stars) and
                provide analytics, quests, and insights to help improve your gameplay.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">3. Account Registration</h2>
              <ul className="list-disc list-inside space-y-2 text-zinc-400">
                <li>You must provide accurate information when creating an account</li>
                <li>You are responsible for maintaining the security of your account</li>
                <li>You must be at least 13 years old to use Tactix</li>
                <li>One person may not maintain multiple accounts</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">4. Game Account Linking</h2>
              <p className="text-zinc-400">
                When you link game accounts, you authorize us to retrieve your publicly available game data
                through official and community APIs. You represent that you own or have permission to link
                the game accounts you provide.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">5. Subscriptions & Payments</h2>
              <ul className="list-disc list-inside space-y-2 text-zinc-400">
                <li><strong className="text-zinc-300">Free Tier:</strong> Basic access with 1 daily quest</li>
                <li><strong className="text-zinc-300">Pro Subscription:</strong> $4.99/month with 3 daily quests and priority features</li>
                <li>Subscriptions renew automatically unless cancelled</li>
                <li>You can cancel anytime from the Settings page</li>
                <li>Refunds are handled on a case-by-case basis</li>
                <li>Payments are processed securely by Stripe</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">6. Acceptable Use</h2>
              <p>You agree not to:</p>
              <ul className="mt-3 list-disc list-inside space-y-2 text-zinc-400">
                <li>Use the Service for any illegal purpose</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Interfere with or disrupt the Service</li>
                <li>Scrape or harvest data from the Service</li>
                <li>Share your account credentials with others</li>
                <li>Use bots or automated tools to access the Service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">7. Intellectual Property</h2>
              <p className="text-zinc-400">
                Tactix and its original content, features, and functionality are owned by Tactix and are
                protected by copyright and other intellectual property laws. Game logos and names are
                trademarks of their respective owners (Riot Games, Supercell, NetEase, etc.).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">8. Third-Party APIs</h2>
              <p className="text-zinc-400">
                We rely on third-party game APIs that may have their own terms and limitations. We cannot
                guarantee continuous availability of game data. API changes or outages may temporarily
                affect the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">9. Disclaimer of Warranties</h2>
              <p className="text-zinc-400">
                The Service is provided "as is" without warranties of any kind. We do not guarantee that
                the Service will be uninterrupted, secure, or error-free. Game statistics are provided
                for informational purposes and may not be 100% accurate.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">10. Limitation of Liability</h2>
              <p className="text-zinc-400">
                To the maximum extent permitted by law, Tactix shall not be liable for any indirect,
                incidental, special, consequential, or punitive damages resulting from your use of the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">11. Account Termination</h2>
              <p className="text-zinc-400">
                We may suspend or terminate your account if you violate these Terms. You may delete your
                account at any time. Upon termination, your right to use the Service will immediately cease.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">12. Changes to Terms</h2>
              <p className="text-zinc-400">
                We reserve the right to modify these Terms at any time. We will notify users of significant
                changes. Continued use of the Service after changes constitutes acceptance of the new Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">13. Governing Law</h2>
              <p className="text-zinc-400">
                These Terms are governed by the laws of the jurisdiction in which Tactix operates,
                without regard to conflict of law provisions.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">14. Contact</h2>
              <p className="text-zinc-400">
                Questions about these Terms? Contact us at{" "}
                <a href="mailto:support@tactix.gg" className="text-cyan-400 hover:text-cyan-300">
                  support@tactix.gg
                </a>
              </p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-zinc-800">
            <Link
              href="/privacy"
              className="text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              View Privacy Policy &rarr;
            </Link>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
