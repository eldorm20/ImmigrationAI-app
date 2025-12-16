import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import { LiveButton, AnimatedCard } from "@/components/ui/live-elements";
import {
    TrendingUp,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Sparkles,
    Target,
    FileText,
    Clock,
    ChevronDown,
    Loader2,
    Lightbulb,
    Shield,
    BadgeCheck
} from "lucide-react";

interface PredictionResult {
    probability: number;
    confidence: "low" | "medium" | "high";
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
    riskFactors: string[];
    estimatedProcessingTime: string;
    requiredDocuments: string[];
}

interface FormData {
    age: number;
    education: string;
    workExperience: number;
    languageProficiency: string;
    hasJobOffer: boolean;
    salary: number;
    visaType: string;
    country: string;
    hasFinancialProof: boolean;
    previousVisaRejections: number;
    criminalRecord: boolean;
}

const COUNTRIES = [
    { value: "uk", label: "🇬🇧 United Kingdom" },
    { value: "germany", label: "🇩🇪 Germany" },
    { value: "usa", label: "🇺🇸 United States" },
    { value: "canada", label: "🇨🇦 Canada" },
    { value: "australia", label: "🇦🇺 Australia" },
];

const VISA_TYPES: Record<string, { value: string; label: string }[]> = {
    uk: [
        { value: "skilled_worker", label: "Skilled Worker Visa" },
        { value: "student", label: "Student Visa" },
        { value: "family", label: "Family Visa" },
    ],
    germany: [
        { value: "work", label: "Work Permit" },
        { value: "opportunity_card", label: "Opportunity Card" },
        { value: "student", label: "Student Visa" },
        { value: "blue_card", label: "EU Blue Card" },
    ],
    usa: [
        { value: "h1b", label: "H-1B Work Visa" },
        { value: "f1", label: "F-1 Student Visa" },
        { value: "b1b2", label: "B1/B2 Visitor" },
    ],
    canada: [
        { value: "express_entry", label: "Express Entry" },
        { value: "study", label: "Study Permit" },
        { value: "provincial", label: "Provincial Nominee" },
    ],
    australia: [
        { value: "skilled", label: "Skilled Worker" },
        { value: "student", label: "Student Visa" },
        { value: "employer_sponsored", label: "Employer Sponsored" },
    ],
};

const EDUCATION_OPTIONS = [
    { value: "phd", label: "PhD/Doctorate" },
    { value: "masters", label: "Master's Degree" },
    { value: "bachelors", label: "Bachelor's Degree" },
    { value: "associate", label: "Associate Degree" },
    { value: "diploma", label: "Diploma/Vocational" },
    { value: "high_school", label: "High School" },
];

const LANGUAGE_OPTIONS = [
    { value: "c2", label: "C2 - Native/Fluent" },
    { value: "c1", label: "C1 - Advanced" },
    { value: "b2", label: "B2 - Upper Intermediate" },
    { value: "b1", label: "B1 - Intermediate" },
    { value: "a2", label: "A2 - Elementary" },
    { value: "a1", label: "A1 - Basic" },
];

export const VisaPredictorView: React.FC = () => {
    const { user } = useAuth();
    const { t } = useI18n();
    const { toast } = useToast();

    const [formData, setFormData] = useState<FormData>({
        age: 30,
        education: "bachelors",
        workExperience: 5,
        languageProficiency: "b2",
        hasJobOffer: false,
        salary: 0,
        visaType: "skilled_worker",
        country: "uk",
        hasFinancialProof: true,
        previousVisaRejections: 0,
        criminalRecord: false,
    });

    const [result, setResult] = useState<PredictionResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);

    const handlePredict = async () => {
        setLoading(true);
        try {
            const response = await apiRequest<{ success: boolean; prediction: PredictionResult }>("/predict/visa-success", {
                method: "POST",
                body: JSON.stringify(formData),
            });

            if (response.success) {
                setResult(response.prediction);
                toast({
                    title: "Prediction Complete",
                    description: `Success probability: ${response.prediction.probability}%`,
                    className: "bg-brand-50 text-brand-900 border-brand-200",
                });
            }
        } catch (err) {
            toast({
                title: "Prediction Failed",
                description: err instanceof Error ? err.message : "Unable to generate prediction",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const getProbabilityColor = (prob: number) => {
        if (prob >= 70) return "text-green-500";
        if (prob >= 50) return "text-yellow-500";
        return "text-red-500";
    };

    const getConfidenceBadge = (conf: string) => {
        const styles: Record<string, string> = {
            high: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",
            medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",
            low: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",
        };
        return styles[conf] || styles.medium;
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid md:grid-cols-2 gap-6"
        >
            {/* Input Form */}
            <AnimatedCard className="p-6">
                <h3 className="font-bold text-xl mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
                    <Target className="text-brand-500" />
                    Visa Success Predictor
                </h3>

                <div className="space-y-4">
                    {/* Country Selection */}
                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                            Destination Country
                        </label>
                        <select
                            value={formData.country}
                            onChange={(e) => setFormData({ ...formData, country: e.target.value, visaType: VISA_TYPES[e.target.value]?.[0]?.value || "" })}
                            className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
                        >
                            {COUNTRIES.map(c => (
                                <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Visa Type */}
                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                            Visa Type
                        </label>
                        <select
                            value={formData.visaType}
                            onChange={(e) => setFormData({ ...formData, visaType: e.target.value })}
                            className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
                        >
                            {(VISA_TYPES[formData.country] || []).map(v => (
                                <option key={v.value} value={v.value}>{v.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Age */}
                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                            Age
                        </label>
                        <input
                            type="number"
                            min={18}
                            max={80}
                            value={formData.age}
                            onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || 18 })}
                            className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
                        />
                    </div>

                    {/* Education */}
                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                            Highest Education
                        </label>
                        <select
                            value={formData.education}
                            onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                            className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
                        >
                            {EDUCATION_OPTIONS.map(e => (
                                <option key={e.value} value={e.value}>{e.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Work Experience */}
                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                            Years of Work Experience
                        </label>
                        <input
                            type="number"
                            min={0}
                            max={50}
                            value={formData.workExperience}
                            onChange={(e) => setFormData({ ...formData, workExperience: parseInt(e.target.value) || 0 })}
                            className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
                        />
                    </div>

                    {/* Language Proficiency */}
                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                            English/German Proficiency
                        </label>
                        <select
                            value={formData.languageProficiency}
                            onChange={(e) => setFormData({ ...formData, languageProficiency: e.target.value })}
                            className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
                        >
                            {LANGUAGE_OPTIONS.map(l => (
                                <option key={l.value} value={l.value}>{l.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Toggle buttons */}
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => setFormData({ ...formData, hasJobOffer: !formData.hasJobOffer })}
                            className={`p-3 rounded-xl text-sm font-bold border transition-all ${formData.hasJobOffer
                                    ? "bg-green-50 border-green-500 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                                    : "bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700"
                                }`}
                        >
                            {formData.hasJobOffer ? "✓ Has Job Offer" : "No Job Offer"}
                        </button>

                        <button
                            onClick={() => setFormData({ ...formData, hasFinancialProof: !formData.hasFinancialProof })}
                            className={`p-3 rounded-xl text-sm font-bold border transition-all ${formData.hasFinancialProof
                                    ? "bg-green-50 border-green-500 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                                    : "bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700"
                                }`}
                        >
                            {formData.hasFinancialProof ? "✓ Financial Proof" : "No Financial Proof"}
                        </button>
                    </div>

                    {/* Advanced Options */}
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="flex items-center gap-2 text-sm text-slate-500 hover:text-brand-500"
                    >
                        <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
                        Advanced Options
                    </button>

                    <AnimatePresence>
                        {showAdvanced && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="space-y-4 overflow-hidden"
                            >
                                {formData.hasJobOffer && (
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                                            Annual Salary (Local Currency)
                                        </label>
                                        <input
                                            type="number"
                                            min={0}
                                            value={formData.salary}
                                            onChange={(e) => setFormData({ ...formData, salary: parseInt(e.target.value) || 0 })}
                                            className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                                        Previous Visa Rejections
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        max={10}
                                        value={formData.previousVisaRejections}
                                        onChange={(e) => setFormData({ ...formData, previousVisaRejections: parseInt(e.target.value) || 0 })}
                                        className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
                                    />
                                </div>

                                <button
                                    onClick={() => setFormData({ ...formData, criminalRecord: !formData.criminalRecord })}
                                    className={`w-full p-3 rounded-xl text-sm font-bold border transition-all ${!formData.criminalRecord
                                            ? "bg-green-50 border-green-500 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                                            : "bg-red-50 border-red-500 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                                        }`}
                                >
                                    {formData.criminalRecord ? "⚠ Has Criminal Record" : "✓ No Criminal Record"}
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <LiveButton
                        onClick={handlePredict}
                        disabled={loading}
                        loading={loading}
                        icon={Sparkles}
                        className="w-full mt-4"
                    >
                        {loading ? "Analyzing..." : "Predict Success Rate"}
                    </LiveButton>
                </div>
            </AnimatedCard>

            {/* Results Panel */}
            <AnimatedCard className="p-6">
                <h3 className="font-bold text-xl mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
                    <TrendingUp className="text-brand-500" />
                    Prediction Results
                </h3>

                {!result ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                        <Target size={48} className="mb-4 opacity-30" />
                        <p className="text-center">Fill in your details and click<br />"Predict Success Rate" to see results</p>
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                        {/* Main Probability */}
                        <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700">
                            <div className={`text-6xl font-black ${getProbabilityColor(result.probability)}`}>
                                {result.probability}%
                            </div>
                            <div className="text-sm text-slate-500 mt-2">Success Probability</div>
                            <div className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold ${getConfidenceBadge(result.confidence)}`}>
                                {result.confidence.toUpperCase()} CONFIDENCE
                            </div>
                        </div>

                        {/* Processing Time */}
                        <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                            <Clock className="text-blue-500" />
                            <div>
                                <div className="text-sm font-bold text-slate-700 dark:text-slate-300">Estimated Processing</div>
                                <div className="text-blue-600 dark:text-blue-400">{result.estimatedProcessingTime}</div>
                            </div>
                        </div>

                        {/* Strengths */}
                        {result.strengths.length > 0 && (
                            <div>
                                <h4 className="font-bold text-sm text-green-600 flex items-center gap-2 mb-2">
                                    <CheckCircle size={16} /> Strengths
                                </h4>
                                <ul className="space-y-1">
                                    {result.strengths.map((s, i) => (
                                        <li key={i} className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2">
                                            <BadgeCheck size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                                            {s}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Weaknesses */}
                        {result.weaknesses.length > 0 && (
                            <div>
                                <h4 className="font-bold text-sm text-yellow-600 flex items-center gap-2 mb-2">
                                    <AlertTriangle size={16} /> Areas to Improve
                                </h4>
                                <ul className="space-y-1">
                                    {result.weaknesses.map((w, i) => (
                                        <li key={i} className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2">
                                            <XCircle size={14} className="text-yellow-500 mt-0.5 flex-shrink-0" />
                                            {w}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Risk Factors */}
                        {result.riskFactors.length > 0 && (
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                                <h4 className="font-bold text-sm text-red-600 flex items-center gap-2 mb-2">
                                    <Shield size={16} /> Risk Factors
                                </h4>
                                <ul className="space-y-1">
                                    {result.riskFactors.map((r, i) => (
                                        <li key={i} className="text-sm text-red-600 dark:text-red-400">• {r}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Recommendations */}
                        {result.recommendations.length > 0 && (
                            <div>
                                <h4 className="font-bold text-sm text-brand-600 flex items-center gap-2 mb-2">
                                    <Lightbulb size={16} /> Recommendations
                                </h4>
                                <ul className="space-y-1">
                                    {result.recommendations.map((r, i) => (
                                        <li key={i} className="text-sm text-slate-600 dark:text-slate-400">💡 {r}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Required Documents */}
                        <div>
                            <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-2">
                                <FileText size={16} /> Required Documents
                            </h4>
                            <ul className="grid gap-1">
                                {result.requiredDocuments.map((d, i) => (
                                    <li key={i} className="text-sm text-slate-500 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                                        {d}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </motion.div>
                )}
            </AnimatedCard>
        </motion.div>
    );
};

export default VisaPredictorView;
