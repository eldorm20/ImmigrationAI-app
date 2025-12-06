import React from "react";
import { useLocation } from "wouter";
import { useI18n } from "@/lib/i18n";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center gap-4">
          <button
            onClick={() => setLocation("/")}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="prose dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-bold mb-4">Privacy Policy</h2>
            <p className="text-slate-600 dark:text-slate-400">Last updated: December 2024</p>
          </section>

          <section>
            <h3 className="text-xl font-bold mb-3">1. Introduction</h3>
            <p className="text-slate-700 dark:text-slate-300">
              ImmigrationAI ("we", "us", "our", or "Company") operates the https://immigrationai.com website (the "Service"). This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service and the choices you have associated with that data.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-bold mb-3">2. Information Collection and Use</h3>
            <p className="text-slate-700 dark:text-slate-300">
              We collect several different types of information for various purposes to provide and improve our Service to you.
            </p>
            <ul className="list-disc list-inside text-slate-700 dark:text-slate-300 space-y-2 mt-3">
              <li>Personal Data: Name, email address, phone number, and any other information you voluntarily provide</li>
              <li>Usage Data: Browser type, pages visited, time spent, and interaction patterns</li>
              <li>Device Information: Device type, operating system, and unique device identifiers</li>
              <li>Cookies and Tracking: We use cookies for authentication and analytics</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-bold mb-3">3. Use of Data</h3>
            <p className="text-slate-700 dark:text-slate-300">
              ImmigrationAI uses the collected data for various purposes:
            </p>
            <ul className="list-disc list-inside text-slate-700 dark:text-slate-300 space-y-2 mt-3">
              <li>To provide and maintain our Service</li>
              <li>To notify you about changes to our Service</li>
              <li>To allow you to participate in interactive features of our Service</li>
              <li>To provide customer support</li>
              <li>To gather analysis or valuable information to improve our Service</li>
              <li>To monitor the usage of our Service</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-bold mb-3">4. Security of Data</h3>
            <p className="text-slate-700 dark:text-slate-300">
              The security of your data is important to us but remember that no method of transmission over the Internet or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your Personal Data, we cannot guarantee its absolute security.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-bold mb-3">5. Changes to This Privacy Policy</h3>
            <p className="text-slate-700 dark:text-slate-300">
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-bold mb-3">6. Contact Us</h3>
            <p className="text-slate-700 dark:text-slate-300">
              If you have any questions about this Privacy Policy, please contact us at:
            </p>
            <p className="text-slate-700 dark:text-slate-300 mt-2">
              Email: <span className="font-mono">privacy@immigrationai.com</span>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
