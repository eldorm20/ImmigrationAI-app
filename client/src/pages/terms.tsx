import React from "react";
import { useLocation } from "wouter";
import { useI18n } from "@/lib/i18n";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
  const [, setLocation] = useLocation();
  const { t } = useI18n();

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
          <h1 className="text-3xl font-bold">{t.terms.title}</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="prose dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-bold mb-4">{t.terms.title}</h2>
            <p className="text-slate-600 dark:text-slate-400">{t.terms.lastUpdated} December 2024</p>
          </section>

          <section>
            <h3 className="text-xl font-bold mb-3">{t.terms.section1Title}</h3>
            <p className="text-slate-700 dark:text-slate-300">
              {t.terms.section1Body}
            </p>
          </section>

          <section>
            <h3 className="text-xl font-bold mb-3">{t.terms.section2Title}</h3>
            <p className="text-slate-700 dark:text-slate-300">
              {t.terms.section2Body}
            </p>
            <ul className="list-disc list-inside text-slate-700 dark:text-slate-300 space-y-2 mt-3">
              <li>{t.terms.section2Item1}</li>
              <li>{t.terms.section2Item2}</li>
              <li>{t.terms.section2Item3}</li>
              <li>{t.terms.section2Item4}</li>
              <li>{t.terms.section2Item5}</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-bold mb-3">{t.terms.section3Title}</h3>
            <p className="text-slate-700 dark:text-slate-300">
              {t.terms.section3Body}
            </p>
          </section>

          <section>
            <h3 className="text-xl font-bold mb-3">{t.terms.section4Title}</h3>
            <p className="text-slate-700 dark:text-slate-300">
              {t.terms.section4Body}
            </p>
          </section>

          <section>
            <h3 className="text-xl font-bold mb-3">{t.terms.section5Title}</h3>
            <p className="text-slate-700 dark:text-slate-300">
              {t.terms.section5Body}
            </p>
          </section>

          <section>
            <h3 className="text-xl font-bold mb-3">{t.terms.section6Title}</h3>
            <p className="text-slate-700 dark:text-slate-300">
              {t.terms.section6Body}
            </p>
          </section>

          <section>
            <h3 className="text-xl font-bold mb-3">{t.terms.section7Title}</h3>
            <p className="text-slate-700 dark:text-slate-300">
              {t.terms.section7Body}
            </p>
          </section>

          <section>
            <h3 className="text-xl font-bold mb-3">{t.terms.section8Title}</h3>
            <p className="text-slate-700 dark:text-slate-300">
              {t.terms.section8Body}
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
