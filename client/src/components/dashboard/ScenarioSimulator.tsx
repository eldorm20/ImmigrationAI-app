import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { LiveButton, AnimatedCard } from "@/components/ui/live-elements";
import {
    FlaskConical,
    TrendingUp,
    RefreshCw,
    Sparkles,
    CheckCircle
} from "lucide-react";

interface ScenarioResult {
    visaType: string;
    eligibilityScore: number;
    improvementTips: string[];
    estimatedProcessingTime: string;
    successLikelihood: 'low' | 'medium' | 'high';
}

export const ScenarioSimulator = () => {
    const { t } = useI18n();
    const [scenario, setScenario] = useState({
        destinationCountry: 'uk',
        visaType: 'skilled_worker',
        education: 'bachelors',
        experience: '3-5',
        language: 'intermediate',
        salary: '50k_80k',
    });
    const [result, setResult] = useState<ScenarioResult | null>(null);
    const [calculating, setCalculating] = useState(false);

    // Dynamic options based on translations
    const options = {
        destinationCountry: Object.keys(t.simulator.options.countries).map(k => ({ value: k, label: t.simulator.options.countries[k] })),
        visaType: Object.keys(t.simulator.options.visaTypes).map(k => ({ value: k, label: t.simulator.options.visaTypes[k] })),
        education: [
            { value: 'high_school', label: t.simulator.options.education.high_school, score: 10 },
            { value: 'bachelors', label: t.simulator.options.education.bachelors, score: 20 },
            { value: 'masters', label: t.simulator.options.education.masters, score: 30 },
            { value: 'phd', label: t.simulator.options.education.phd, score: 40 },
        ],
        experience: [
            { value: '0-2', label: t.simulator.options.experience['0-2'], score: 5 },
            { value: '3-5', label: t.simulator.options.experience['3-5'], score: 15 },
            { value: '5-10', label: t.simulator.options.experience['5-10'], score: 25 },
            { value: '10+', label: t.simulator.options.experience['10+'], score: 30 },
        ],
        language: [
            { value: 'none', label: t.simulator.options.language.none, score: 0 },
            { value: 'basic', label: t.simulator.options.language.basic, score: 5 },
            { value: 'intermediate', label: t.simulator.options.language.intermediate, score: 15 },
            { value: 'advanced', label: t.simulator.options.language.advanced, score: 25 },
        ],
        salary: [
            { value: 'under_50k', label: t.simulator.options.salary.under_50k, score: 5 },
            { value: '50k_80k', label: t.simulator.options.salary['50k_80k'], score: 15 },
            { value: '80k_120k', label: t.simulator.options.salary['80k_120k'], score: 20 },
            { value: '120k_plus', label: t.simulator.options.salary['120k_plus'], score: 25 },
        ],
    };

    const calculateScenario = async () => {
        setCalculating(true);
        try {
            const data = await apiRequest<any>("/ai/simulator/analyze", {
                method: "POST",
                body: JSON.stringify(scenario)
            });

            setResult({
                visaType: t.simulator.options.visaTypes[scenario.visaType] || '',
                eligibilityScore: data.score,
                improvementTips: data.tips,
                estimatedProcessingTime: data.processingTime,
                successLikelihood: data.likelihood.toLowerCase() as any,
            });
        } catch (err) {
            const eduScore = options.education.find(e => e.value === scenario.education)?.score || 0;
            const expScore = options.experience.find(e => e.value === scenario.experience)?.score || 0;
            const langScore = options.language.find(e => e.value === scenario.language)?.score || 0;
            const salScore = options.salary.find(e => e.value === scenario.salary)?.score || 0;

            const totalScore = eduScore + expScore + langScore + salScore;
            const normalizedScore = Math.min(Math.round((totalScore / 120) * 100), 100);

            setResult({
                visaType: t.simulator.options.visaTypes[scenario.visaType] || '',
                eligibilityScore: normalizedScore,
                improvementTips: ["Consider providing more details for a deeper AI analysis."],
                estimatedProcessingTime: scenario.visaType === 'skilled_worker' ? '3-8 weeks' : '4-12 weeks',
                successLikelihood: normalizedScore >= 70 ? 'high' : normalizedScore >= 50 ? 'medium' : 'low',
            });
        } finally {
            setCalculating(false);
        }
    };

    const getLikelihoodColor = (likelihood: ScenarioResult['successLikelihood']) => {
        switch (likelihood) {
            case 'high': return 'text-green-600 bg-green-100 dark:bg-green-900/30';
            case 'medium': return 'text-amber-600 bg-amber-100 dark:bg-amber-900/30';
            case 'low': return 'text-red-600 bg-red-100 dark:bg-red-900/30';
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-5xl mx-auto space-y-10 pb-12"
        >
            <div className="text-center space-y-4">
                <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 font-black text-xs uppercase tracking-widest mb-2"
                >
                    <FlaskConical size={14} /> {t.simulator.title}
                </motion.div>
                <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                    {t.simulator.title}
                </h2>
                <p className="text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto font-medium italic">
                    {t.simulator.desc}
                </p>
            </div>

            <AnimatedCard className="glass-premium p-10 rounded-[2.5rem] border-none shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 rounded-full blur-3xl -mr-32 -mt-32"></div>

                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-10 flex items-center gap-3 relative z-10">
                    <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
                        <Sparkles className="text-white" size={20} />
                    </div>
                    {t.simulator.config}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-10 relative z-10">
                    {/* Destination Country */}
                    <div className="group">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 pl-1 group-focus-within:text-brand-500 transition-colors">
                            {t.simulator.country}
                        </label>
                        <select
                            value={scenario.destinationCountry}
                            onChange={(e) => setScenario({ ...scenario, destinationCountry: e.target.value })}
                            className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 text-slate-900 dark:text-white font-bold outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all appearance-none cursor-pointer"
                        >
                            {options.destinationCountry.map(opt => (
                                <option key={opt.value} value={opt.value} className="bg-white dark:bg-slate-900 font-bold">{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Visa Type */}
                    <div className="group">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 pl-1 group-focus-within:text-brand-500 transition-colors">
                            {t.gov.visaType}
                        </label>
                        <select
                            value={scenario.visaType}
                            onChange={(e) => setScenario({ ...scenario, visaType: e.target.value })}
                            className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 text-slate-900 dark:text-white font-bold outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all appearance-none cursor-pointer"
                        >
                            {options.visaType.map(opt => (
                                <option key={opt.value} value={opt.value} className="bg-white dark:bg-slate-900 font-bold">{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Education */}
                    <div className="group">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 pl-1 group-focus-within:text-brand-500 transition-colors">
                            {t.simulator.education}
                        </label>
                        <select
                            value={scenario.education}
                            onChange={(e) => setScenario({ ...scenario, education: e.target.value })}
                            className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 text-slate-900 dark:text-white font-bold outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all appearance-none cursor-pointer"
                        >
                            {options.education.map(opt => (
                                <option key={opt.value} value={opt.value} className="bg-white dark:bg-slate-900 font-bold">{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Experience */}
                    <div className="group">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 pl-1 group-focus-within:text-brand-500 transition-colors">
                            {t.simulator.experience}
                        </label>
                        <select
                            value={scenario.experience}
                            onChange={(e) => setScenario({ ...scenario, experience: e.target.value })}
                            className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 text-slate-900 dark:text-white font-bold outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all appearance-none cursor-pointer"
                        >
                            {options.experience.map(opt => (
                                <option key={opt.value} value={opt.value} className="bg-white dark:bg-slate-900 font-bold">{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Language */}
                    <div className="group">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 pl-1 group-focus-within:text-brand-500 transition-colors">
                            {t.simulator.language}
                        </label>
                        <select
                            value={scenario.language}
                            onChange={(e) => setScenario({ ...scenario, language: e.target.value })}
                            className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 text-slate-900 dark:text-white font-bold outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all appearance-none cursor-pointer"
                        >
                            {options.language.map(opt => (
                                <option key={opt.value} value={opt.value} className="bg-white dark:bg-slate-900 font-bold">{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Salary */}
                    <div className="group">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 pl-1 group-focus-within:text-brand-500 transition-colors">
                            {t.simulator.salary}
                        </label>
                        <select
                            value={scenario.salary}
                            onChange={(e) => setScenario({ ...scenario, salary: e.target.value })}
                            className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 text-slate-900 dark:text-white font-bold outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all appearance-none cursor-pointer"
                        >
                            {options.salary.map(opt => (
                                <option key={opt.value} value={opt.value} className="bg-white dark:bg-slate-900 font-bold">{opt.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="relative z-10">
                    <LiveButton
                        onClick={calculateScenario}
                        loading={calculating}
                        className="w-full py-5 rounded-2xl text-xl font-black shadow-xl shadow-brand-500/20 hover:scale-[1.01] active:scale-95 transition-all h-auto"
                    >
                        {calculating ? t.simulator.analyzing : (
                            <>
                                <FlaskConical size={24} className="mr-3" /> {t.simulator.simulate}
                            </>
                        )}
                    </LiveButton>
                </div>
            </AnimatedCard>

            <AnimatePresence>
                {result && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                    >
                        <AnimatedCard className="glass-premium border-l-[6px] border-l-brand-600 p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-brand-500/5 to-transparent pointer-events-none"></div>

                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-6 relative z-10">
                                <h3 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-4">
                                    {t.simulator.results}
                                    <div className="w-1.5 h-8 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                                </h3>
                                <div className={`px-6 py-3 rounded-2xl text-sm font-black uppercase tracking-[0.2em] shadow-lg ${getLikelihoodColor(result.successLikelihood)}`}>
                                    {result.successLikelihood} {t.simulator.likelihood}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10 relative z-10">
                                {/* Score */}
                                <div className="p-8 bg-white/40 dark:bg-slate-900/40 rounded-[2rem] border border-white/20 dark:border-slate-800 text-center shadow-sm hover:shadow-md transition-shadow group">
                                    <div className={`text-6xl font-black mb-3 transition-transform group-hover:scale-110 ${result.eligibilityScore >= 70 ? 'text-green-500' : result.eligibilityScore >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                                        {result.eligibilityScore}%
                                    </div>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t.simulator.score}</div>
                                </div>

                                {/* Visa Type */}
                                <div className="p-8 bg-white/40 dark:bg-slate-900/40 rounded-[2rem] border border-white/20 dark:border-slate-800 text-center flex flex-col justify-center shadow-sm hover:shadow-md transition-shadow">
                                    <div className="text-2xl font-black text-slate-900 dark:text-white leading-tight mb-2">
                                        {result.visaType}
                                    </div>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t.gov.visaType}</div>
                                </div>

                                {/* Processing Time */}
                                <div className="p-8 bg-white/40 dark:bg-slate-900/40 rounded-[2rem] border border-white/20 dark:border-slate-800 text-center flex flex-col justify-center shadow-sm hover:shadow-md transition-shadow">
                                    <div className="text-2xl font-black text-brand-600 dark:text-brand-400 mb-2">
                                        {result.estimatedProcessingTime}
                                    </div>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t.simulator.processing}</div>
                                </div>
                            </div>

                            <div className="space-y-6 mb-10 relative z-10">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-3">
                                    <TrendingUp size={16} className="text-brand-500" />
                                    {t.simulator.tips}
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {result.improvementTips.map((tip, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ x: -20, opacity: 0 }}
                                            animate={{ x: 0, opacity: 1 }}
                                            transition={{ delay: i * 0.1 }}
                                            className="flex items-start gap-4 p-5 bg-white/30 dark:bg-slate-900/30 rounded-2xl border border-white/10"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                                                <CheckCircle size={18} className="text-green-500" />
                                            </div>
                                            <span className="text-sm text-slate-700 dark:text-slate-300 font-bold leading-relaxed">{tip}</span>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>

                            <div className="relative z-10">
                                <LiveButton
                                    variant="ghost"
                                    onClick={() => setResult(null)}
                                    className="w-full py-4 rounded-xl border-slate-200 dark:border-slate-800 text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-all font-black text-xs uppercase tracking-widest"
                                >
                                    <RefreshCw size={18} className="mr-2" /> {t.simulator.tryAnother}
                                </LiveButton>
                            </div>
                        </AnimatedCard>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
