import React, { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { apiRequest } from "@/lib/api";
import { LiveButton, AnimatedCard } from "@/components/ui/live-elements";
import { Sparkles, MessageSquare, CheckCircle, RefreshCw, Send, BrainCircuit, TrendingUp, AlertTriangle, Lightbulb, ThumbsUp, Mic } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import VoiceInterviewer from "../interview/VoiceInterviewer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Question {
    id: string;
    text: string;
    category: string;
    expectedAnswer?: string;
}

interface Evaluation {
    score: number;
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
    overallAssessment: string;
}

export const InterviewTrainerView = ({ defaultTab = "text" }: { defaultTab?: "text" | "voice" }) => {
    const { t, lang } = useI18n();
    const { toast } = useToast();
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answer, setAnswer] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
    const [visaType, setVisaType] = useState(t.interview.options.visaTypes[0]);
    const [country, setCountry] = useState(t.interview.options.countries[0]);

    const fetchQuestions = async () => {
        setIsGenerating(true);
        setEvaluation(null);
        setAnswer("");
        try {
            const resp = await apiRequest<{ questions: Question[] }>("/ai/interview/questions", {
                method: "POST",
                body: JSON.stringify({
                    visaType,
                    country,
                    language: lang || "en"
                }),
                timeout: 120000,
            });
            const qs = resp.questions || [];
            if (!qs.length) {
                // Fallback for demo if API returns nothing
                qs.push({ id: 'q1', text: `Why do you want to move to ${country}?`, category: 'Motivation' });
                qs.push({ id: 'q2', text: `How does your background fit the ${visaType}?`, category: 'Eligibility' });
            }
            setQuestions(qs.map((q, i) => ({ ...q, id: q.id || `q-${i}` })));
            setCurrentQuestionIndex(0);
        } catch (err: any) {
            toast({ title: t.common.error, description: err.message || t.error.message, variant: "destructive" });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleEvaluate = async () => {
        if (!answer.trim()) return;

        setIsEvaluating(true);
        try {
            const resp = await apiRequest<Evaluation>("/ai/interview/evaluate", {
                method: "POST",
                body: JSON.stringify({
                    question: questions[currentQuestionIndex].text,
                    answer,
                }),
                timeout: 60000,
            });
            setEvaluation(resp);
        } catch (err: any) {
            toast({ title: t.common.error, description: err.message || t.error.message, variant: "destructive" });
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
            toast({ title: t.interview.sessionComplete, description: t.interview.allQuestions });
            setQuestions([]);
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return "text-green-500";
        if (score >= 60) return "text-blue-500";
        if (score >= 40) return "text-amber-500";
        return "text-red-500";
    };

    const getScoreLabel = (score: number) => {
        if (score >= 80) return t.common.success;
        if (score >= 60) return t.dashStatus.active;
        if (score >= 40) return t.interview.weaknesses;
        return t.interview.finish;
    };

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-10 pb-12 max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center gap-6 mb-4">
                <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-2xl shadow-brand-500/30 shrink-0">
                    <BrainCircuit size={40} />
                </div>
                <div>
                    <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">{t.interview.title}</h2>
                    <p className="text-xl text-slate-500 dark:text-slate-400 font-medium italic">{t.interview.desc}</p>
                </div>
            </div>

            <Tabs defaultValue={defaultTab} className="w-full">
                <div className="flex justify-center mb-10">
                    <TabsList className="p-1.5 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl w-fit">
                        <TabsTrigger value="text" className="px-10 py-3 rounded-xl data-[state=active]:bg-brand-600 data-[state=active]:text-white font-black text-xs uppercase tracking-[0.2em] transition-all">
                            <MessageSquare size={16} className="mr-2" /> {t.interview.textPractice}
                        </TabsTrigger>
                        <TabsTrigger value="voice" className="px-10 py-3 rounded-xl data-[state=active]:bg-brand-600 data-[state=active]:text-white font-black text-xs uppercase tracking-[0.2em] transition-all">
                            <Mic size={16} className="mr-2" /> {t.interview.voiceMode}
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="voice">
                    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
                        <VoiceInterviewer visaType={visaType} />
                    </motion.div>
                </TabsContent>

                <TabsContent value="text">
                    {questions.length === 0 ? (
                        <AnimatedCard className="text-center py-20 glass-premium border-none shadow-2xl rounded-[3rem] relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/5 rounded-full blur-3xl -mr-48 -mt-48"></div>

                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.5 }}
                            >
                                <div className="w-24 h-24 mx-auto mb-10 rounded-[2rem] bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center shadow-inner">
                                    <Sparkles className="w-12 h-12 text-brand-600 animate-pulse" />
                                </div>
                                <h3 className="text-3xl font-black mb-4 text-slate-900 dark:text-white tracking-tight">{t.interview.ready}</h3>
                                <p className="text-lg text-slate-500 dark:text-slate-400 mb-12 max-w-xl mx-auto leading-relaxed font-medium">
                                    {t.interview.readyDesc}
                                </p>

                                <div className="flex flex-wrap gap-6 justify-center items-end max-w-2xl mx-auto p-10 bg-white/40 dark:bg-slate-900/40 rounded-[2.5rem] border border-white/20 shadow-sm relative z-10">
                                    <div className="flex-1 min-w-[240px] text-left">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 block ml-1">{t.gov.visaType}</label>
                                        <select
                                            value={visaType}
                                            onChange={(e) => setVisaType(e.target.value)}
                                            className="w-full p-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white font-bold focus:ring-4 focus:ring-brand-500/10 outline-none transition-all appearance-none cursor-pointer"
                                        >
                                            {t.interview.options.visaTypes.map((v: string) => (
                                                <option key={v} value={v}>{v}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex-1 min-w-[200px] text-left">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 block ml-1">{t.simulator.country}</label>
                                        <select
                                            value={country}
                                            onChange={(e) => setCountry(e.target.value)}
                                            className="w-full p-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white font-bold focus:ring-4 focus:ring-brand-500/10 outline-none transition-all appearance-none cursor-pointer"
                                        >
                                            {t.interview.options.countries.map((c: string) => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <LiveButton
                                        onClick={fetchQuestions}
                                        loading={isGenerating}
                                        className="w-full md:w-auto px-10 py-4 h-14 rounded-2xl text-lg font-black bg-brand-600 shadow-xl shadow-brand-500/20"
                                    >
                                        {isGenerating ? t.common.loading : t.interview.startSession}
                                    </LiveButton>
                                </div>
                            </motion.div>
                        </AnimatedCard>
                    ) : (
                        <div className="grid md:grid-cols-12 gap-8 items-start">
                            <div className="md:col-span-8 space-y-8">
                                <AnimatedCard className="glass-premium p-10 rounded-[2.5rem] border-none shadow-2xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-48 h-48 bg-brand-500/5 rounded-full blur-3xl -mr-24 -mt-24"></div>

                                    <div className="flex justify-between items-center mb-10 relative z-10">
                                        <div className="px-5 py-2 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-600 dark:text-brand-400 font-black text-[10px] uppercase tracking-widest">
                                            {t.interview.question} {currentQuestionIndex + 1} / {questions.length}
                                        </div>
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            {t.interview.category}: <span className="text-slate-900 dark:text-white ml-1">{questions[currentQuestionIndex].category}</span>
                                        </div>
                                    </div>

                                    <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-10 leading-tight italic relative z-10">
                                        "{questions[currentQuestionIndex].text}"
                                    </h3>

                                    <div className="space-y-6 relative z-10">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block ml-1">{t.interview.answerPlaceholder}</label>
                                        <textarea
                                            value={answer}
                                            onChange={(e) => setAnswer(e.target.value)}
                                            placeholder={t.interview.answerPlaceholder}
                                            className="w-full p-8 rounded-[2rem] bg-white/50 dark:bg-slate-950/50 border-2 border-slate-100 dark:border-slate-800 min-h-[220px] text-slate-900 dark:text-white placeholder-slate-400 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all shadow-inner font-bold text-lg leading-relaxed"
                                        />
                                        <div className="flex flex-col sm:flex-row gap-4 justify-between pt-4">
                                            <LiveButton
                                                variant="ghost"
                                                onClick={() => setQuestions([])}
                                                className="font-black text-xs uppercase tracking-widest text-slate-500 hover:text-red-500 h-14 px-8 rounded-2xl"
                                            >
                                                <RefreshCw size={16} className="mr-2" /> {t.common.cancel}
                                            </LiveButton>
                                            <LiveButton
                                                onClick={handleEvaluate}
                                                disabled={!answer.trim() || isEvaluating}
                                                loading={isEvaluating}
                                                className="bg-brand-600 px-12 h-14 rounded-2xl font-black text-lg shadow-xl shadow-brand-500/20 active:scale-95"
                                            >
                                                {isEvaluating ? t.common.loading : t.interview.evaluate} <Send size={20} className="ml-3" />
                                            </LiveButton>
                                        </div>
                                    </div>
                                </AnimatedCard>

                                <AnimatePresence>
                                    {evaluation && (
                                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                                            <AnimatedCard className="glass-premium p-10 rounded-[2.5rem] border-l-[6px] border-l-brand-600 shadow-2xl overflow-hidden relative">
                                                <div className="flex items-center justify-between mb-10 relative z-10">
                                                    <h4 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 flex items-center gap-3">
                                                        <BrainCircuit size={20} className="text-brand-500" /> {t.interview.feedback}
                                                    </h4>
                                                    <div className="flex items-end gap-3 bg-white/40 dark:bg-slate-900/40 px-6 py-3 rounded-2xl border border-white/20">
                                                        <TrendingUp size={20} className={getScoreColor(evaluation.score)} />
                                                        <span className={`text-4xl font-black leading-none ${getScoreColor(evaluation.score)}`}>
                                                            {evaluation.score}%
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="mb-10 p-8 rounded-[2rem] bg-brand-500/5 border border-brand-500/10 italic font-medium leading-relaxed text-slate-700 dark:text-slate-300 relative z-10 text-lg">
                                                    "{evaluation.overallAssessment}"
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 relative z-10">
                                                    <div className="p-6 rounded-[2rem] bg-green-500/5 border border-green-500/10">
                                                        <div className="flex items-center gap-3 mb-6">
                                                            <ThumbsUp size={18} className="text-green-500" />
                                                            <h5 className="font-black text-[10px] uppercase tracking-widest text-green-600">{t.interview.strengths}</h5>
                                                        </div>
                                                        <ul className="space-y-3">
                                                            {evaluation.strengths.map((s, i) => (
                                                                <li key={i} className="text-sm font-bold text-slate-600 dark:text-slate-400 flex items-start gap-3 leading-tight">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                                                                    {s}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>

                                                    <div className="p-6 rounded-[2rem] bg-amber-500/5 border border-amber-500/10">
                                                        <div className="flex items-center gap-3 mb-6">
                                                            <AlertTriangle size={18} className="text-amber-500" />
                                                            <h5 className="font-black text-[10px] uppercase tracking-widest text-amber-600">{t.interview.weaknesses}</h5>
                                                        </div>
                                                        <ul className="space-y-3">
                                                            {evaluation.weaknesses.map((w, i) => (
                                                                <li key={i} className="text-sm font-bold text-slate-600 dark:text-slate-400 flex items-start gap-3 leading-tight">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                                                                    {w}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>

                                                    <div className="p-6 rounded-[2rem] bg-brand-500/5 border border-brand-500/10">
                                                        <div className="flex items-center gap-3 mb-6">
                                                            <Lightbulb size={18} className="text-brand-500" />
                                                            <h5 className="font-black text-[10px] uppercase tracking-widest text-brand-600">{t.interview.suggestions}</h5>
                                                        </div>
                                                        <ul className="space-y-3">
                                                            {evaluation.suggestions.map((s, i) => (
                                                                <li key={i} className="text-sm font-bold text-slate-600 dark:text-slate-400 flex items-start gap-3 leading-tight">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 shrink-0" />
                                                                    {s}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </div>

                                                <div className="relative z-10">
                                                    <LiveButton
                                                        onClick={nextQuestion}
                                                        className="w-full py-6 rounded-2xl font-black text-xl shadow-2xl shadow-brand-500/20 hover:scale-[1.01] active:scale-95 transition-all bg-gradient-to-r from-brand-600 to-indigo-600"
                                                    >
                                                        {currentQuestionIndex < questions.length - 1 ? t.interview.next : t.interview.finish} <CheckCircle size={24} className="ml-3" />
                                                    </LiveButton>
                                                </div>
                                            </AnimatedCard>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <div className="md:col-span-4">
                                <AnimatedCard className="glass-premium p-8 rounded-[2.5rem] border-none shadow-xl">
                                    <h4 className="font-black text-[10px] uppercase tracking-[0.2em] mb-10 flex items-center gap-3 text-slate-400">
                                        <div className="w-1.5 h-8 bg-brand-500 rounded-full shrink-0" />
                                        {t.interview.progress}
                                    </h4>
                                    <div className="space-y-6">
                                        {questions.map((q, i) => (
                                            <div key={q.id} className="flex items-center gap-4 group">
                                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black shadow-sm transition-all ${i === currentQuestionIndex ? "bg-brand-600 text-white shadow-brand-500/30 scale-110" : i < currentQuestionIndex ? "bg-green-500/20 text-green-600 border border-green-500/30" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>
                                                    {i < currentQuestionIndex ? <CheckCircle size={16} /> : i + 1}
                                                </div>
                                                <span className={`text-sm line-clamp-2 leading-tight flex-1 transition-colors ${i === currentQuestionIndex ? "font-black text-slate-900 dark:text-white" : "font-bold text-slate-400"}`}>
                                                    {q.text}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </AnimatedCard>
                            </div>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </motion.div>
    );
};
