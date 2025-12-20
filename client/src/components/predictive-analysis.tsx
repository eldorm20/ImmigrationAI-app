import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, ShieldAlert, ShieldCheck, RefreshCw, Sparkles, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

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

    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        try {
            const res = await apiRequest(`/api/predictive/cases/${applicationId}/analyze`, { method: "POST" });
            const data = await res.json();
            onAnalysisUpdate(data);
            toast({
                title: "Analysis Complete",
                description: "AI has successfully analyzed the case.",
            });
        } catch (error) {
            toast({
                title: "Analysis Failed",
                description: "Could not generate analysis. Please try again.",
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
            <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                <Sparkles className="w-12 h-12 text-brand-500 mb-4" />
                <h3 className="text-xl font-bold mb-2">AI Case Prediction</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md">
                    Generate an AI-powered risk assessment for this case. The AI will analyze the profile, documents, and application details to estimate success probability.
                </p>
                <button
                    onClick={handleAnalyze}
                    className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-full font-bold transition-all"
                >
                    <Sparkles size={18} /> Generate Analysis
                </button>
            </div>
        );
    }

    if (isAnalyzing) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                    <RefreshCw className="w-12 h-12 text-brand-500 mb-4" />
                </motion.div>
                <h3 className="text-lg font-bold mb-2">Analyzing Case Data...</h3>
                <p className="text-slate-500">Processing documents and application history</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Score Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm col-span-1"
                >
                    <div className="flex justify-between items-start mb-4">
                        <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm uppercase tracking-wider">Success Probability</h4>
                        <Shield className="text-brand-500" size={20} />
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
                    className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm col-span-1 md:col-span-2"
                >
                    <div className="flex justify-between items-start mb-4">
                        <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm uppercase tracking-wider">AI Summary</h4>
                        <div className="flex gap-2">
                            <span className="text-xs text-slate-400">Last analyzed: {currentAnalysis?.analyzedAt ? new Date(currentAnalysis.analyzedAt).toLocaleDateString() : 'Just now'}</span>
                            <button onClick={handleAnalyze} className="text-brand-600 hover:text-brand-700" title="Re-analyze">
                                <RefreshCw size={16} />
                            </button>
                        </div>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                        {currentAnalysis!.summary}
                    </p>

                    {/* Recommendations */}
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                        <h5 className="font-bold text-sm mb-2 flex items-center gap-2"><TrendingUp size={16} className="text-blue-500" /> Recommendations</h5>
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
                    className="bg-red-50 dark:bg-red-900/10 p-6 rounded-2xl border border-red-100 dark:border-red-900/30"
                >
                    <h4 className="font-bold text-red-700 dark:text-red-400 mb-4 flex items-center gap-2">
                        <AlertTriangle size={20} /> Risk Factors ({currentAnalysis!.redFlags.length})
                    </h4>
                    <ul className="space-y-3">
                        {currentAnalysis!.redFlags.map((item, i) => (
                            <li key={i} className="flex items-start gap-3 text-red-800 dark:text-red-300 text-sm">
                                <div className="min-w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5" />
                                {item}
                            </li>
                        ))}
                        {currentAnalysis!.redFlags.length === 0 && (
                            <li className="text-slate-500 text-sm italic">No significant risks identified.</li>
                        )}
                    </ul>
                </motion.div>

                {/* Green Flags */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-green-50 dark:bg-green-900/10 p-6 rounded-2xl border border-green-100 dark:border-green-900/30"
                >
                    <h4 className="font-bold text-green-700 dark:text-green-400 mb-4 flex items-center gap-2">
                        <CheckCircle size={20} /> Strengths ({currentAnalysis!.greenFlags.length})
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
