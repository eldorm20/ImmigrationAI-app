import { useState } from "react";
import { apiRequest } from "../lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronRight, Sparkles } from "lucide-react";
import { LiveButton } from "./ui/live-elements";
import { useLocation } from "wouter";

interface QuizQuestion {
  id: string;
  label: string;
  options: { value: string; label: string }[];
  weight: number; // How much this affects approval score
}

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "age",
    label: "What is your age range?",
    options: [
      { value: "18-25", label: "18-25 years" },
      { value: "26-35", label: "26-35 years" },
      { value: "36-50", label: "36-50 years" },
      { value: "50+", label: "50+ years" }
    ],
    weight: 0.15
  },
  {
    id: "education",
    label: "What is your highest education level?",
    options: [
      { value: "high-school", label: "High School Diploma" },
      { value: "bachelors", label: "Bachelor's Degree" },
      { value: "masters", label: "Master's Degree" },
      { value: "doctorate", label: "Doctorate/PhD" }
    ],
    weight: 0.25
  },
  {
    id: "experience",
    label: "Years of professional experience?",
    options: [
      { value: "0-2", label: "0-2 years" },
      { value: "2-5", label: "2-5 years" },
      { value: "5-10", label: "5-10 years" },
      { value: "10+", label: "10+ years" }
    ],
    weight: 0.25
  },
  {
    id: "country",
    label: "Which country are you interested in?",
    options: [
      { value: "canada", label: "Canada 🇨🇦" },
      { value: "uk", label: "United Kingdom 🇬🇧" },
      { value: "usa", label: "United States 🇺🇸" },
      { value: "australia", label: "Australia 🇦🇺" },
      { value: "europe", label: "EU Countries 🇪🇺" },
      { value: "other", label: "Other Country" }
    ],
    weight: 0.2
  },
  {
    id: "language",
    label: "English language proficiency?",
    options: [
      { value: "basic", label: "Basic (A1-A2)" },
      { value: "intermediate", label: "Intermediate (B1-B2)" },
      { value: "fluent", label: "Fluent (C1-C2)" },
      { value: "native", label: "Native Speaker" }
    ],
    weight: 0.15
  }
];

const APPROVAL_SCORES: Record<string, number> = {
  // Age (weight 0.15)
  "18-25": 0.70,
  "26-35": 0.85,
  "36-50": 0.75,
  "50+": 0.60,
  
  // Education (weight 0.25)
  "high-school": 0.65,
  "bachelors": 0.80,
  "masters": 0.90,
  "doctorate": 0.95,
  
  // Experience (weight 0.25)
  "0-2": 0.60,
  "2-5": 0.75,
  "5-10": 0.85,
  "10+": 0.90,
  
  // Country (weight 0.20)
  "canada": 0.88,
  "uk": 0.85,
  "usa": 0.80,
  "australia": 0.87,
  "europe": 0.82,
  "other": 0.70,
  
  // Language (weight 0.15)
  "basic": 0.50,
  "intermediate": 0.70,
  "fluent": 0.90,
  "native": 0.95
};

interface EligibilityQuizProps {
  onComplete?: (score: number, answers: Record<string, string>, application?: any) => void;
  compact?: boolean; // Show as compact inline version
}

export function EligibilityQuiz({ onComplete, compact = false }: EligibilityQuizProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [_, navigate] = useLocation();

  const calculateApprovalScore = (finalAnswers: Record<string, string>): number => {
    let totalScore = 0;
    let totalWeight = 0;

    QUIZ_QUESTIONS.forEach(question => {
      const answer = finalAnswers[question.id];
      const score = APPROVAL_SCORES[answer] || 0.5;
      totalScore += score * question.weight;
      totalWeight += question.weight;
    });

    return Math.round((totalScore / totalWeight) * 100);
  };

  const handleSelect = (questionId: string, value: string) => {
    const newAnswers = { ...answers, [questionId]: value };
    setAnswers(newAnswers);

    if (currentStep < QUIZ_QUESTIONS.length - 1) {
      setTimeout(() => setCurrentStep(currentStep + 1), 300);
    } else {
      setTimeout(() => setShowResults(true), 300);
    }
  };

  const approvalScore = calculateApprovalScore(answers);
  const isComplete = Object.keys(answers).length === QUIZ_QUESTIONS.length;

  const getApprovalMessage = (score: number) => {
    if (score >= 85) return { text: "Excellent Candidate!", color: "text-green-600 dark:text-green-400" };
    if (score >= 70) return { text: "Good Potential", color: "text-blue-600 dark:text-blue-400" };
    if (score >= 55) return { text: "Possible Path Forward", color: "text-amber-600 dark:text-amber-400" };
    return { text: "Consult with Expert", color: "text-slate-600 dark:text-slate-400" };
  };

  const getMessage = getApprovalMessage(approvalScore);

  if (compact && !showResults) {
    // Compact inline version for homepage
    return (
      <div className="w-full max-w-md">
        <div className="space-y-6">
          {QUIZ_QUESTIONS.slice(0, 3).map((question, idx) => (
            <motion.div
              key={question.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-3">
                {question.label}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {question.options.map(option => (
                  <button
                    key={option.value}
                    onClick={() => setAnswers({ ...answers, [question.id]: option.value })}
                    className={`p-3 text-sm font-medium rounded-lg border-2 transition-all ${
                      answers[question.id] === option.value
                        ? "bg-brand-500 text-white border-brand-500"
                        : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-brand-300"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </motion.div>
          ))}
          
          {answers["age"] && answers["education"] && answers["experience"] && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => navigate("/assessment")}
              className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              Complete Full Assessment <ChevronRight size={18} />
            </motion.button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <AnimatePresence mode="wait">
        {!showResults ? (
          // Quiz Screen
          <motion.div
            key="quiz"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            {/* Progress */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {QUIZ_QUESTIONS[currentStep].label}
                </h2>
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                  {currentStep + 1}/{QUIZ_QUESTIONS.length}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-brand-500 to-purple-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${((currentStep + 1) / QUIZ_QUESTIONS.length) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            {/* Options */}
            <div className="grid gap-3">
              {QUIZ_QUESTIONS[currentStep].options.map((option) => (
                <motion.button
                  key={option.value}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelect(QUIZ_QUESTIONS[currentStep].id, option.value)}
                  className={`p-4 text-left font-medium rounded-2xl border-2 transition-all ${
                    answers[QUIZ_QUESTIONS[currentStep].id] === option.value
                      ? "bg-gradient-to-r from-brand-500 to-purple-500 text-white border-brand-500 shadow-lg shadow-brand-500/20"
                      : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-brand-300 dark:hover:border-brand-600 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{option.label}</span>
                    {answers[QUIZ_QUESTIONS[currentStep].id] === option.value && (
                      <Check className="w-5 h-5" />
                    )}
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Navigation */}
            <div className="flex gap-4">
              {currentStep > 0 && (
                <LiveButton
                  variant="secondary"
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="flex-1"
                >
                  Back
                </LiveButton>
              )}
              {currentStep === QUIZ_QUESTIONS.length - 1 && isComplete && (
                <LiveButton
                  onClick={() => setShowResults(true)}
                  className="flex-1"
                >
                  See Your Results
                </LiveButton>
              )}
            </div>
          </motion.div>
        ) : (
          // Results Screen
          <motion.div
            key="results"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-8 text-center"
          >
            <div className="space-y-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="relative w-40 h-40 mx-auto"
              >
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                  <circle
                    cx="60"
                    cy="60"
                    r="54"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-slate-200 dark:text-slate-800"
                  />
                  <motion.circle
                    cx="60"
                    cy="60"
                    r="54"
                    fill="none"
                    stroke="url(#gradient)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    initial={{ strokeDasharray: "0 339" }}
                    animate={{ strokeDasharray: `${(approvalScore / 100) * 339} 339` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="rgb(59, 130, 246)" />
                      <stop offset="100%" stopColor="rgb(168, 85, 247)" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="text-center"
                  >
                    <div className="text-4xl font-extrabold text-slate-900 dark:text-white">
                      {approvalScore}%
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">Approval Score</div>
                  </motion.div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
                className="space-y-2"
              >
                <h2 className={`text-3xl font-bold ${getMessage.color}`}>
                  {getMessage.text}
                </h2>
                <p className="text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
                  {approvalScore >= 85
                    ? "You're an excellent candidate for immigration. Our AI has identified you as highly likely to succeed."
                    : approvalScore >= 70
                    ? "You have good potential for immigration. Let's work on strengthening your application."
                    : approvalScore >= 55
                    ? "There's a possible path forward. An expert consultation can help identify opportunities."
                    : "We recommend consulting with an immigration expert to explore your options."}
                </p>
              </motion.div>
            </div>

            {/* Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
              className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 space-y-4"
            >
              <h3 className="font-bold text-slate-900 dark:text-white">Your Profile</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {QUIZ_QUESTIONS.map(q => (
                  <div key={q.id} className="space-y-1">
                    <div className="text-slate-500 dark:text-slate-400 capitalize">{q.label}</div>
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {q.options.find(o => o.value === answers[q.id])?.label}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4 }}
              className="space-y-3"
            >
              <LiveButton
                onClick={async () => {
                  let createdApp: any = undefined;
                  try {
                    const countryMap: Record<string, string> = { canada: "CA", uk: "GB", usa: "US", australia: "AU", europe: "EU", other: "OT" };
                    const visaMap: Record<string, string> = { canada: "Skilled Worker", uk: "Skilled Worker", usa: "Work Permit", australia: "Skilled Worker", europe: "Residence Permit", other: "General" };
                    const country = countryMap[answers["country"]] || "OT";
                    const visaType = visaMap[answers["country"]] || "General";
                    createdApp = await apiRequest("/applications", {
                      method: "POST",
                      body: JSON.stringify({ visaType, country }),
                    });
                  } catch (err) {
                    // if not logged in or error, navigate to login
                  }
                  onComplete?.(approvalScore, answers, createdApp);
                  navigate("/auth?plan=professional");
                }}
                className="w-full"
              >
                <Sparkles size={18} /> Get Detailed Assessment
              </LiveButton>
              <button
                onClick={() => {
                  setCurrentStep(0);
                  setAnswers({});
                  setShowResults(false);
                }}
                className="w-full py-3 px-4 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300 font-semibold transition-colors"
              >
                Retake Quiz
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
