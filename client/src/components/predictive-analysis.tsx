import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, ShieldAlert, ShieldCheck, RefreshCw, Sparkles, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { LiveButton } from "@/components/ui/live-elements";

interface CaseAnalysis {
    riskScore: number;
    successProbability: "High" | "Medium" | "Low";
    redFlags: string[];
    greenFlags: string[];
    summary: string;
    recommendations: string[];
    analyzedAt?: string;
}

interface PredictiveAnalysisProps {
    clientId: string;
    applicationId: string;
    currentAnalysis?: CaseAnalysis | null;
    onAnalysisUpdate: (analysis: CaseAnalysis) => void;
}

export default function PredictiveAnalysis({
    clientId,
    applicationId,
    currentAnalysis,
    onAnalysisUpdate
}: PredictiveAnalysisProps) {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const { toast } = useToast();
    const { t } = useI18n();

    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        try {
            const data = await apiRequest<CaseAnalysis>(`/api/predictive/cases/${applicationId}/analyze`, { method: "POST" });
            onAnalysisUpdate(data);
            toast({
                title: t.common.success,
                description: t.analytics.analyzedAt || "AI has successfully analyzed the case.",
            });
        } catch (error) {
            toast({
                title: t.common.error,
                description: t.error.message,
                variant: "destructive",
            });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return "text-green-500";
        if (score >= 60) return "text-yellow-500";
        return "text-red-500";
    };

    const getScoreBg = (score: number) => {
        if (score >= 80) return "bg-green-100 dark:bg-green-900/30";
        if (score >= 60) return "bg-yellow-100 dark:bg-yellow-900/30";
        return "bg-red-100 dark:bg-red-900/30";
    };

    if (!currentAnalysis && !isAnalyzing) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center glass-premium border-2 border-dashed border-slate-300 dark:border-slate-700/50 rounded-3xl">
                <Sparkles className="w-16 h-16 text-brand-500 mb-6 drop-shadow-glow" />
                <h3 className="text-2xl font-black mb-3 text-slate-900 dark:text-white">{t.analytics.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-lg leading-relaxed">
                    {t.analytics.desc}
                </p>
                <LiveButton
                    onClick={handleAnalyze}
                    icon={Sparkles}
                    className="bg-gradient-to-r from-brand-600 to-purple-600 px-10 py-4 scale-110"
                >
                    {t.analytics.generate}
                </LiveButton>
            </div>
        );
    }

    if (isAnalyzing) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-center glass-premium rounded-3xl">
                <motion.div
                    animate={{ rotate: 360, scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                    <RefreshCw className="w-16 h-16 text-brand-500 mb-6" />
                </motion.div>
                <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">{t.analytics.analyzing}</h3>
                <p className="text-slate-500 dark:text-slate-400">{t.tools.typing}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Score Card */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-premium p-8 rounded-3xl shadow-xl col-span-1 border-t-4 border-t-brand-500"
                >
                    <div className="flex justify-between items-start mb-6">
                        <h4 className="font-black text-slate-500 text-xs uppercase tracking-widest">{t.analytics.success}</h4>
                        <Shield className="text-brand-500" size={24} />
                    </div>
                    <div className="flex items-end gap-2 mb-2">
                        <span className={`text-5xl font-extrabold ${getScoreColor(currentAnalysis!.riskScore)}`}>
                            {currentAnalysis!.riskScore}%
                        </span>
                        <span className={`px-2 py-1 rounded-md text-xs font-bold mb-2 ${getScoreBg(currentAnalysis!.riskScore)} ${getScoreColor(currentAnalysis!.riskScore)}`}>
                            {currentAnalysis!.successProbability.toUpperCase()}
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Based on current data and documentation completeness.
                    </p>
                    <div className="mt-4 w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div
                            className={`h-full ${currentAnalysis!.riskScore >= 80 ? 'bg-green-500' : currentAnalysis!.riskScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${currentAnalysis!.riskScore}%` }}
                        />
                    </div>
                </motion.div>

                {/* Summary Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass-premium p-8 rounded-3xl shadow-xl col-span-1 md:col-span-2"
                >
                    <div className="flex justify-between items-start mb-6">
                        <h4 className="font-black text-slate-500 text-xs uppercase tracking-widest">{t.analytics.summary}</h4>
                        <div className="flex gap-4 items-center">
                            <span className="text-xs font-bold text-slate-400 capitalize">{t.common.date}: {currentAnalysis?.analyzedAt ? new Date(currentAnalysis.analyzedAt).toLocaleDateString() : t.common.view}</span>
                            <button onClick={handleAnalyze} className="w-8 h-8 rounded-full bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 hover:rotate-180 transition-all duration-500" title="Re-analyze">
                                <RefreshCw size={16} />
                            </button>
                        </div>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                        {currentAnalysis!.summary}
                    </p>

                    {/* Recommendations */}
                    <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700/50">
                        <h5 className="font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2"><TrendingUp size={16} className="text-brand-500" /> {t.analytics.recommendations}</h5>
                        <ul className="space-y-2">
                            {currentAnalysis!.recommendations.map((rec, i) => (
                                <li key={i} className="text-sm text-slate-600 dark:text-slate-400 flex gap-2">
                                    <span className="text-blue-500">•</span> {rec}
                                </li>
                            ))}
                        </ul>
                    </div>
                </motion.div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Red Flags */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="glass-premium p-8 rounded-3xl border-l-4 border-l-red-500"
                >
                    <h4 className="font-black text-red-600 dark:text-red-400 mb-6 flex items-center gap-3 text-sm uppercase tracking-widest">
                        <AlertTriangle size={20} /> {t.analytics.risks} ({currentAnalysis!.redFlags.length})
                    </h4>
                    <ul className="space-y-3">
                        {currentAnalysis!.redFlags.map((item, i) => (
                            <li key={i} className="flex items-start gap-3 text-red-800 dark:text-red-300 text-sm">
                                <div className="min-w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5" />
                                {item}
                            </li>
                        ))}
                        {currentAnalysis!.redFlags.length === 0 && (
                            <li className="text-slate-500 text-sm italic">{t.analytics.noRisks}</li>
                        )}
                    </ul>
                </motion.div>

                {/* Green Flags */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="glass-premium p-8 rounded-3xl border-l-4 border-l-green-500"
                >
                    <h4 className="font-black text-green-600 dark:text-green-400 mb-6 flex items-center gap-3 text-sm uppercase tracking-widest">
                        <CheckCircle size={20} /> {t.analytics.strengths} ({currentAnalysis!.greenFlags.length})
                    </h4>
                    <ul className="space-y-3">
                        {currentAnalysis!.greenFlags.map((item, i) => (
                            <li key={i} className="flex items-start gap-3 text-green-800 dark:text-green-300 text-sm">
                                <div className="min-w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5" />
                                {item}
                            </li>
                        ))}
                    </ul>
                </motion.div>
            </div>
        </div>
    );
}
