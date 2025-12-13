import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useLocation } from "wouter";
import { EligibilityQuiz } from "../components/EligibilityQuiz";
import { useI18n } from "../lib/i18n";
import { LiveButton } from "../components/ui/live-elements";
import { trackEvent } from "../lib/analytics";

export function AssessmentPage() {
  const [location, setLocation] = useLocation();
  const { t } = useI18n();
  const [quizComplete, setQuizComplete] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [createdAppId, setCreatedAppId] = useState<string | null>(null);

  const handleQuizComplete = (score: number, answers: Record<string, string>, application?: any) => {
    setFinalScore(score);
    setQuizComplete(true);
    if (application && application.id) setCreatedAppId(application.id);
    try {
      trackEvent("assessment_completed", { score, answersCount: Object.keys(answers).length });
    } catch {}
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-6 py-6 flex items-center gap-4">
          <button
            onClick={() => setLocation("/")}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Free Immigration Assessment</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">5-minute personalized evaluation</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-16">
        {!quizComplete ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="mb-12 text-center space-y-3">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-50 dark:bg-brand-900/30 border border-brand-200 dark:border-brand-800">
                <Sparkles size={16} className="text-brand-600 dark:text-brand-400" />
                <span className="text-sm font-semibold text-brand-700 dark:text-brand-300">AI-Powered Assessment</span>
              </div>
              <h2 className="text-4xl font-bold text-slate-900 dark:text-white">
                What are your immigration prospects?
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                Answer 5 quick questions and get an instant evaluation of your visa eligibility and success rate.
              </p>
            </div>

            <EligibilityQuiz onComplete={handleQuizComplete} />

            {/* Trust Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-16 grid md:grid-cols-3 gap-6 pt-16 border-t border-slate-200 dark:border-slate-800"
            >
              <div className="text-center space-y-2">
                <div className="text-3xl font-bold text-brand-600 dark:text-brand-400">98%</div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Prediction Accuracy</p>
              </div>
              <div className="text-center space-y-2">
                <div className="text-3xl font-bold text-brand-600 dark:text-brand-400">50K+</div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Cases Analyzed</p>
              </div>
              <div className="text-center space-y-2">
                <div className="text-3xl font-bold text-brand-600 dark:text-brand-400">30+</div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Countries Covered</p>
              </div>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-12"
          >
            {/* Results Summary */}
            <div className="bg-gradient-to-r from-brand-50 to-purple-50 dark:from-slate-800 dark:to-slate-900 rounded-3xl p-8 border border-brand-200 dark:border-slate-700">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Assessment Complete</h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
                Your immigration success score is <span className="font-bold text-brand-600 dark:text-brand-400">{finalScore}%</span>. 
                Get the full detailed report with personalized recommendations.
              </p>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 space-y-3">
                  <h3 className="font-bold text-slate-900 dark:text-white">What's Included:</h3>
                  <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                    <li>✓ Personalized visa recommendations</li>
                    <li>✓ Document checklist for your situation</li>
                    <li>✓ Timeline and success probability</li>
                    <li>✓ Expert consultation options</li>
                    <li>✓ Next steps roadmap</li>
                  </ul>
                </div>
                
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 space-y-3">
                  <h3 className="font-bold text-slate-900 dark:text-white">Limited Time Offer:</h3>
                  <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                    <li>✓ Professional plan first month at 50% off</li>
                    <li>✓ Direct access to immigration experts</li>
                    <li>✓ Priority support and guidance</li>
                    <li>✓ Custom document templates</li>
                    <li>✓ Lifetime access to this assessment</li>
                  </ul>
                </div>
              </div>

              <div className="mt-8 space-y-3">
                <LiveButton
                  className="w-full md:w-auto"
                  onClick={() => setLocation("/auth?plan=professional&from=assessment")}
                >
                  Get Full Report - Special Offer
                </LiveButton>
                <button
                  onClick={() => setLocation("/")}
                  className="w-full md:w-auto px-6 py-3 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300 font-semibold transition-colors"
                >
                  Continue Browsing
                </button>
              </div>
            </div>

            {/* FAQ */}
            <div className="space-y-6">
              {createdAppId && (
                <div className="bg-slate-100 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700 text-sm">
                  <strong>Application Created:</strong> <a href={`/applications/${createdAppId}`} className="text-brand-600">View Application</a>
                </div>
              )}
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Frequently Asked Questions</h3>
              <div className="grid gap-4">
                {[
                  {
                    q: "How accurate is this assessment?",
                    a: "Our AI model is trained on 50,000+ real immigration cases with 98% prediction accuracy. However, this is a preliminary assessment and doesn't replace legal advice."
                  },
                  {
                    q: "What happens after I sign up?",
                    a: "You'll get access to your detailed report, personalized roadmap, expert consultations, and AI-powered document assistance tailored to your visa type."
                  },
                  {
                    q: "Can I get a refund?",
                    a: "Yes, we offer a 30-day money-back guarantee on all paid plans. If you're not satisfied, you'll get a full refund."
                  },
                  {
                    q: "Is my data private and secure?",
                    a: "Yes. We use military-grade encryption (AES-256) and comply with GDPR, CCPA, and all international privacy laws. Your data is never shared with third parties."
                  }
                ].map((faq, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                  >
                    <h4 className="font-bold text-slate-900 dark:text-white mb-2">{faq.q}</h4>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">{faq.a}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
