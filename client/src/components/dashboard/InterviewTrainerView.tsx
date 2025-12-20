import React, { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { apiRequest } from "@/lib/api";
import { LiveButton, AnimatedCard } from "@/components/ui/live-elements";
import { Sparkles, MessageSquare, CheckCircle, RefreshCw, Send, BrainCircuit } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

interface Question {
    id: string;
    text: string;
    category: string;
}

export const InterviewTrainerView = () => {
    const { t, lang } = useI18n();
    const { toast } = useToast();
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answer, setAnswer] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [evaluation, setEvaluation] = useState<string | null>(null);
    const [visaType, setVisaType] = useState("Skilled Worker Visa");

    const fetchQuestions = async () => {
        setIsGenerating(true);
        setEvaluation(null);
        setAnswer("");
        try {
            const resp = await apiRequest<{ questions: Question[] }>("/ai/interview/questions", {
                method: "POST",
                body: JSON.stringify({ visaType, language: lang }),
            });
            setQuestions(resp.questions || []);
            setCurrentQuestionIndex(0);
        } catch (err: any) {
            toast({ title: "Error", description: err.message || "Failed to fetch questions", variant: "destructive" });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleEvaluate = async () => {
        if (!answer.trim()) return;

        setIsEvaluating(true);
        try {
            const resp = await apiRequest<{ evaluation: string }>("/ai/interview/evaluate", {
                method: "POST",
                body: JSON.stringify({
                    question: questions[currentQuestionIndex].text,
                    answer,
                    language: lang
                }),
            });
            setEvaluation(resp.evaluation);
        } catch (err: any) {
            toast({ title: "Error", description: err.message || "Failed to evaluate answer", variant: "destructive" });
        } finally {
            setIsEvaluating(false);
        }
    };

    const nextQuestion = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setEvaluation(null);
            setAnswer("");
        } else {
            toast({ title: "Session Complete", description: "You've answered all questions. Start a new session for more!" });
            setQuestions([]);
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white shadow-lg">
                    <BrainCircuit size={24} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">AI Interview Prep</h2>
                    <p className="text-slate-600 dark:text-slate-400">Practice your visa interview with our AI trainer</p>
                </div>
            </div>

            {questions.length === 0 ? (
                <AnimatedCard className="text-center py-12">
                    <Sparkles className="w-16 h-16 mx-auto mb-4 text-brand-500 opacity-20" />
                    <h3 className="text-xl font-bold mb-4">Ready to Practice?</h3>
                    <p className="text-slate-500 mb-8 max-w-md mx-auto">
                        Select your visa type and our AI will generate realistic interview questions for you to practice with.
                    </p>
                    <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
                        <select
                            value={visaType}
                            onChange={(e) => setVisaType(e.target.value)}
                            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white min-w-[200px]"
                        >
                            <option value="Skilled Worker Visa">Skilled Worker Visa</option>
                            <option value="Student Visa">Student Visa</option>
                            <option value="Family Visa">Family Visa</option>
                            <option value="Germany Opportunity Card">Germany Opportunity Card</option>
                            <option value="Tourist Visa">Tourist Visa</option>
                        </select>
                        <LiveButton onClick={fetchQuestions} loading={isGenerating} icon={Sparkles}>
                            Start Practice Session
                        </LiveButton>
                    </div>
                </AnimatedCard>
            ) : (
                <div className="grid md:grid-cols-12 gap-6">
                    <div className="md:col-span-8 flex flex-col gap-6">
                        <AnimatedCard className="flex-1">
                            <div className="flex justify-between items-center mb-6">
                                <span className="text-xs font-bold uppercase text-brand-500 bg-brand-50 px-3 py-1 rounded-full">
                                    Question {currentQuestionIndex + 1} of {questions.length}
                                </span>
                                <span className="text-xs text-slate-400 font-medium">
                                    Category: {questions[currentQuestionIndex].category}
                                </span>
                            </div>

                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-8 leading-relaxed">
                                "{questions[currentQuestionIndex].text}"
                            </h3>

                            <div className="space-y-4">
                                <label className="text-xs font-bold uppercase text-slate-500 block">Your Answer</label>
                                <textarea
                                    value={answer}
                                    onChange={(e) => setAnswer(e.target.value)}
                                    placeholder="Type your answer here..."
                                    className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 min-h-[150px] text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                                />
                                <div className="flex gap-2 justify-end">
                                    <LiveButton variant="secondary" onClick={fetchQuestions} icon={RefreshCw}>Restart</LiveButton>
                                    <LiveButton variant="primary" onClick={handleEvaluate} disabled={!answer.trim() || isEvaluating} loading={isEvaluating} icon={Send}>
                                        Evaluate Answer
                                    </LiveButton>
                                </div>
                            </div>
                        </AnimatedCard>

                        <AnimatePresence>
                            {evaluation && (
                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                                    <AnimatedCard className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30">
                                        <h4 className="font-bold text-blue-900 dark:text-blue-300 mb-3 flex items-center gap-2">
                                            <BrainCircuit size={18} /> AI Feedback
                                        </h4>
                                        <div className="text-slate-700 dark:text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">
                                            {evaluation}
                                        </div>
                                        <div className="mt-6 flex justify-end">
                                            <LiveButton variant="primary" onClick={nextQuestion} icon={CheckCircle}>
                                                Next Question
                                            </LiveButton>
                                        </div>
                                    </AnimatedCard>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="md:col-span-4">
                        <AnimatedCard>
                            <h4 className="font-bold mb-4 flex items-center gap-2">
                                <MessageSquare size={18} className="text-brand-500" /> Session Progress
                            </h4>
                            <div className="space-y-3">
                                {questions.map((q, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${i === currentQuestionIndex ? "bg-brand-600 text-white shadow-lg shadow-brand-500/30" : i < currentQuestionIndex ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-400"}`}>
                                            {i < currentQuestionIndex ? <CheckCircle size={14} /> : i + 1}
                                        </div>
                                        <span className={`text-sm truncate flex-1 ${i === currentQuestionIndex ? "font-bold text-slate-900 dark:text-white" : "text-slate-500"}`}>
                                            {q.text}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </AnimatedCard>
                    </div>
                </div>
            )}
        </motion.div>
    );
};
