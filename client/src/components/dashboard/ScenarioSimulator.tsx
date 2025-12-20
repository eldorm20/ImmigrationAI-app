import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest } from "@/lib/api";
import { LiveButton, AnimatedCard } from "@/components/ui/live-elements";
import {
    FlaskConical,
    TrendingUp,
    RefreshCw,
    Sparkles,
    ArrowRight,
    ChevronDown,
    AlertCircle,
    CheckCircle
} from "lucide-react";

interface ScenarioResult {
    visaType: string;
    eligibilityScore: number;
    improvementTips: string[];
    estimatedProcessingTime: string;
    successLikelihood: 'low' | 'medium' | 'high';
}

const SCENARIO_OPTIONS = {
    destinationCountry: [
        { value: 'uk', label: 'United Kingdom' },
        { value: 'de', label: 'Germany' },
        { value: 'ca', label: 'Canada' },
        { value: 'au', label: 'Australia' },
    ],
    visaType: [
        { value: 'skilled_worker', label: 'Skilled Worker' },
        { value: 'job_seeker', label: 'Job Seeker' },
        { value: 'student', label: 'Student Visa' },
        { value: 'family', label: 'Family Reunion' },
    ],
    education: [
        { value: 'high_school', label: 'High School', score: 10 },
        { value: 'bachelors', label: "Bachelor's Degree", score: 20 },
        { value: 'masters', label: "Master's Degree", score: 30 },
        { value: 'phd', label: 'PhD / Doctorate', score: 40 },
    ],
    experience: [
        { value: '0-2', label: '0-2 years', score: 5 },
        { value: '3-5', label: '3-5 years', score: 15 },
        { value: '5-10', label: '5-10 years', score: 25 },
        { value: '10+', label: '10+ years', score: 30 },
    ],
    language: [
        { value: 'none', label: 'No English', score: 0 },
        { value: 'basic', label: 'Basic (A1-A2)', score: 5 },
        { value: 'intermediate', label: 'Intermediate (B1-B2)', score: 15 },
        { value: 'advanced', label: 'Advanced (C1-C2)', score: 25 },
    ],
    salary: [
        { value: 'under_50k', label: 'Under $50,000', score: 5 },
        { value: '50k_80k', label: '$50,000 - $80,000', score: 15 },
        { value: '80k_120k', label: '$80,000 - $120,000', score: 20 },
        { value: '120k_plus', label: '$120,000+', score: 25 },
    ],
};

export const ScenarioSimulator = () => {
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

    const calculateScenario = async () => {
        setCalculating(true);
        try {
            const data = await apiRequest<any>("/ai/simulator/analyze", {
                method: "POST",
                body: JSON.stringify(scenario)
            });

            setResult({
                visaType: SCENARIO_OPTIONS.visaType.find(v => v.value === scenario.visaType)?.label || '',
                eligibilityScore: data.score,
                improvementTips: data.tips,
                estimatedProcessingTime: data.processingTime,
                successLikelihood: data.likelihood.toLowerCase() as any,
            });
        } catch (err) {
            // Fallback to original mock if backend fails
            const eduScore = SCENARIO_OPTIONS.education.find(e => e.value === scenario.education)?.score || 0;
            const expScore = SCENARIO_OPTIONS.experience.find(e => e.value === scenario.experience)?.score || 0;
            const langScore = SCENARIO_OPTIONS.language.find(e => e.value === scenario.language)?.score || 0;
            const salScore = SCENARIO_OPTIONS.salary.find(e => e.value === scenario.salary)?.score || 0;

            const totalScore = eduScore + expScore + langScore + salScore;
            const normalizedScore = Math.min(Math.round((totalScore / 120) * 100), 100);

            setResult({
                visaType: SCENARIO_OPTIONS.visaType.find(v => v.value === scenario.visaType)?.label || '',
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
        >
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
                    <FlaskConical size={24} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Scenario Simulator</h2>
                    <p className="text-slate-600 dark:text-slate-400">Explore "what-if" scenarios for your immigration options</p>
                </div>
            </div>

            {/* Simulator Form */}
            <AnimatedCard className="border-2 border-purple-200 dark:border-purple-800/50">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Sparkles className="text-purple-500" size={20} />
                    Configure Your Scenario
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {/* Destination Country */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                            Destination Country
                        </label>
                        <select
                            value={scenario.destinationCountry}
                            onChange={(e) => setScenario({ ...scenario, destinationCountry: e.target.value })}
                            className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        >
                            {SCENARIO_OPTIONS.destinationCountry.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Visa Type */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                            Visa Type
                        </label>
                        <select
                            value={scenario.visaType}
                            onChange={(e) => setScenario({ ...scenario, visaType: e.target.value })}
                            className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        >
                            {SCENARIO_OPTIONS.visaType.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Education */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                            Education Level
                        </label>
                        <select
                            value={scenario.education}
                            onChange={(e) => setScenario({ ...scenario, education: e.target.value })}
                            className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        >
                            {SCENARIO_OPTIONS.education.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Experience */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                            Work Experience
                        </label>
                        <select
                            value={scenario.experience}
                            onChange={(e) => setScenario({ ...scenario, experience: e.target.value })}
                            className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        >
                            {SCENARIO_OPTIONS.experience.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Language */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                            English Proficiency
                        </label>
                        <select
                            value={scenario.language}
                            onChange={(e) => setScenario({ ...scenario, language: e.target.value })}
                            className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        >
                            {SCENARIO_OPTIONS.language.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Salary */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                            Expected Salary
                        </label>
                        <select
                            value={scenario.salary}
                            onChange={(e) => setScenario({ ...scenario, salary: e.target.value })}
                            className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        >
                            {SCENARIO_OPTIONS.salary.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <LiveButton
                    variant="primary"
                    onClick={calculateScenario}
                    loading={calculating}
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                >
                    {calculating ? 'Analyzing...' : (
                        <>
                            <FlaskConical size={16} /> Simulate Scenario
                        </>
                    )}
                </LiveButton>
            </AnimatedCard>

            {/* Results */}
            {result && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                >
                    <AnimatedCard className="border-2 border-green-200 dark:border-green-800/50">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                Simulation Results
                            </h3>
                            <span className={`px-3 py-1 rounded-full text-sm font-bold ${getLikelihoodColor(result.successLikelihood)}`}>
                                {result.successLikelihood.toUpperCase()} LIKELIHOOD
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                            {/* Score */}
                            <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                <div className={`text-4xl font-bold ${result.eligibilityScore >= 70 ? 'text-green-600' : result.eligibilityScore >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                                    {result.eligibilityScore}%
                                </div>
                                <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">Eligibility Score</div>
                            </div>

                            {/* Visa Type */}
                            <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                <div className="text-lg font-bold text-slate-900 dark:text-white">
                                    {result.visaType}
                                </div>
                                <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">Selected Visa</div>
                            </div>

                            {/* Processing Time */}
                            <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                <div className="text-lg font-bold text-slate-900 dark:text-white">
                                    {result.estimatedProcessingTime}
                                </div>
                                <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">Est. Processing</div>
                            </div>
                        </div>

                        {/* Improvement Tips */}
                        <div>
                            <h4 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                                <TrendingUp size={18} className="text-brand-600" />
                                AI Recommendations
                            </h4>
                            <ul className="space-y-2">
                                {result.improvementTips.map((tip, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm">
                                        {result.eligibilityScore >= 70 ? (
                                            <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                                        ) : (
                                            <AlertCircle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
                                        )}
                                        <span className="text-slate-700 dark:text-slate-300">{tip}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </AnimatedCard>

                    <div className="text-center">
                        <LiveButton
                            variant="ghost"
                            onClick={() => setResult(null)}
                        >
                            <RefreshCw size={16} /> Try Another Scenario
                        </LiveButton>
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
};
