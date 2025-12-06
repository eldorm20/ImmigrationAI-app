import React from "react";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
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
          <h1 className="text-3xl font-bold">Terms of Service</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="prose dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-bold mb-4">Terms of Service</h2>
            <p className="text-slate-600 dark:text-slate-400">Last updated: December 2024</p>
          </section>

          <section>
            <h3 className="text-xl font-bold mb-3">1. Agreement to Terms</h3>
            <p className="text-slate-700 dark:text-slate-300">
              By accessing and using ImmigrationAI, you accept and agree to be bound by and comply with these Terms of Service and our Privacy Policy. If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-bold mb-3">2. Use License</h3>
            <p className="text-slate-700 dark:text-slate-300">
              Permission is granted to temporarily download one copy of the materials (information or software) on ImmigrationAI's website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
            </p>
            <ul className="list-disc list-inside text-slate-700 dark:text-slate-300 space-y-2 mt-3">
              <li>Modify or copy the materials</li>
              <li>Use the materials for any commercial purpose or for any public display</li>
              <li>Attempt to decompile or reverse engineer any software contained on the website</li>
              <li>Remove any copyright or other proprietary notations from the materials</li>
              <li>Transfer the materials to another person or "mirror" the materials on any other server</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-bold mb-3">3. Disclaimer</h3>
            <p className="text-slate-700 dark:text-slate-300">
              The materials on ImmigrationAI's website are provided on an 'as is' basis. ImmigrationAI makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-bold mb-3">4. Limitations</h3>
            <p className="text-slate-700 dark:text-slate-300">
              In no event shall ImmigrationAI or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on ImmigrationAI's website.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-bold mb-3">5. Accuracy of Materials</h3>
            <p className="text-slate-700 dark:text-slate-300">
              The materials appearing on ImmigrationAI's website could include technical, typographical, or photographic errors. ImmigrationAI does not warrant that any of the materials on its website are accurate, complete, or current.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-bold mb-3">6. Modifications</h3>
            <p className="text-slate-700 dark:text-slate-300">
              ImmigrationAI may revise these terms of service for its website at any time without notice. By using this website, you are agreeing to be bound by the then current version of these terms of service.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-bold mb-3">7. Governing Law</h3>
            <p className="text-slate-700 dark:text-slate-300">
              These terms and conditions are governed by and construed in accordance with the laws of the jurisdiction in which ImmigrationAI operates, and you irrevocably submit to the exclusive jurisdiction of the courts in that location.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-bold mb-3">8. Contact Information</h3>
            <p className="text-slate-700 dark:text-slate-300">
              If you have any questions about these Terms of Service, please contact us at:
            </p>
            <p className="text-slate-700 dark:text-slate-300 mt-2">
              Email: <span className="font-mono">legal@immigrationai.com</span>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
