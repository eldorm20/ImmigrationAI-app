/**
 * Visa Simulator View
 * Calculate visa success probability with detailed breakdown
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Calculator, TrendingUp, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { GradientButton } from '@/components/ui/gradient-button';

interface SimulatorInputs {
    visaType: string;
    age: number;
    education: 'high_school' | 'bachelors' | 'masters' | 'phd';
    englishLevel: 'none' | 'basic' | 'intermediate' | 'advanced' | 'native';
    workExperience: number;
    jobOffer: boolean;
    salary?: number;
    funds: number;
    country: string;
}

interface SimulatorResult {
    score: number;
    probability: number;
    factors: Array<{ factor: string; points: number; weight: number }>;
    recommendations: string[];
    strengths: string[];
    weaknesses: string[];
    message: string;
}

export const VisaSimulatorView: React.FC = () => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<SimulatorResult | null>(null);

    const [inputs, setInputs] = useState<SimulatorInputs>({
        visaType: 'Skilled Worker',
        age: 30,
        education: 'bachelors',
        englishLevel: 'intermediate',
        workExperience: 3,
        jobOffer: false,
        funds: 10000,
        country: 'UK',
    });

    const handleCalculate = async () => {
        try {
            setLoading(true);
            const data = await apiRequest<SimulatorResult>('/simulator/calculate', {
                method: 'POST',
                body: JSON.stringify(inputs),
            });
            setResult(data);
        } catch (error) {
            toast({
                title: 'Calculation Failed',
                description: 'Could not calculate visa probability. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="text-center">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 mb-4"
                >
                    <Calculator size={24} />
                    <span className="font-black text-sm uppercase tracking-wider">Visa Success Calculator</span>
                </motion.div>
                <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-4">
                    Calculate Your Chances
                </h1>
                <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
                    Get an accurate probability score based on official visa requirements and your profile
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Input Form */}
                <GlassCard className="p-8">
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Your Profile</h2>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                Visa Type
                            </label>
                            <select
                                value={inputs.visaType}
                                onChange={(e) => setInputs({ ...inputs, visaType: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-brand-500 outline-none"
                            >
                                <option value="Skilled Worker">UK Skilled Worker</option>
                                <option value="Student">Student Visa</option>
                                <option value="Family">Family Visa</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                Age: {inputs.age}
                            </label>
                            <input
                                type="range"
                                min="18"
                                max="65"
                                value={inputs.age}
                                onChange={(e) => setInputs({ ...inputs, age: parseInt(e.target.value) })}
                                className="w-full"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                Education Level
                            </label>
                            <select
                                value={inputs.education}
                                onChange={(e) => setInputs({ ...inputs, education: e.target.value as any })}
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-brand-500 outline-none"
                            >
                                <option value="high_school">High School</option>
                                <option value="bachelors">Bachelor's Degree</option>
                                <option value="masters">Master's Degree</option>
                                <option value="phd">PhD/Doctorate</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                English Level
                            </label>
                            <select
                                value={inputs.englishLevel}
                                onChange={(e) => setInputs({ ...inputs, englishLevel: e.target.value as any })}
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-brand-500 outline-none"
                            >
                                <option value="none">None</option>
                                <option value="basic">Basic (A1-A2)</option>
                                <option value="intermediate">Intermediate (B1-B2)</option>
                                <option value="advanced">Advanced (C1)</option>
                                <option value="native">Native (C2)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                Work Experience (years): {inputs.workExperience}
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="20"
                                value={inputs.workExperience}
                                onChange={(e) => setInputs({ ...inputs, workExperience: parseInt(e.target.value) })}
                                className="w-full"
                            />
                        </div>

                        <div>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={inputs.jobOffer}
                                    onChange={(e) => setInputs({ ...inputs, jobOffer: e.target.checked })}
                                    className="w-5 h-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                />
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                    I have a job offer with Certificate of Sponsorship
                                </span>
                            </label>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                Available Funds ($)
                            </label>
                            <input
                                type="number"
                                value={inputs.funds}
                                onChange={(e) => setInputs({ ...inputs, funds: parseInt(e.target.value) || 0 })}
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-brand-500 outline-none"
                                placeholder="15000"
                            />
                        </div>

                        <GradientButton
                            onClick={handleCalculate}
                            disabled={loading}
                            className="w-full py-4 text-lg"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin mr-2" size={20} />
                                    Calculating...
                                </>
                            ) : (
                                <>
                                    <Calculator className="mr-2" size={20} />
                                    Calculate Probability
                                </>
                            )}
                        </GradientButton>
                    </div>
                </GlassCard>

                {/* Results */}
                {result && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-6"
                    >
                        {/* Score Card */}
                        <GlassCard className="p-8 text-center">
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-4">
                                Success Probability
                            </h3>
                            <div className="relative w-48 h-48 mx-auto mb-6">
                                <svg className="transform -rotate-90 w-48 h-48">
                                    <circle
                                        cx="96"
                                        cy="96"
                                        r="88"
                                        stroke="currentColor"
                                        strokeWidth="12"
                                        fill="none"
                                        className="text-slate-100 dark:text-slate-800"
                                    />
                                    <circle
                                        cx="96"
                                        cy="96"
                                        r="88"
                                        stroke="currentColor"
                                        strokeWidth="12"
                                        fill="none"
                                        strokeDasharray={`${2 * Math.PI * 88}`}
                                        strokeDashoffset={`${2 * Math.PI * 88 * (1 - result.probability / 100)}`}
                                        className={`${result.probability >= 70
                                                ? 'text-green-500'
                                                : result.probability >= 50
                                                    ? 'text-yellow-500'
                                                    : 'text-red-500'
                                            } transition-all duration-1000`}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div>
                                        <div className="text-5xl font-black text-slate-900 dark:text-white">
                                            {Math.round(result.probability)}%
                                        </div>
                                        <div className="text-xs font-bold text-slate-500">SCORE</div>
                                    </div>
                                </div>
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 font-medium">{result.message}</p>
                        </GlassCard>

                        {/* Strengths */}
                        {result.strengths.length > 0 && (
                            <GlassCard className="p-6">
                                <h4 className="flex items-center gap-2 text-lg font-black text-green-600 mb-4">
                                    <CheckCircle size={20} />
                                    Your Strengths
                                </h4>
                                <ul className="space-y-2">
                                    {result.strengths.map((strength, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                                            <span className="text-green-500 mt-0.5">✓</span>
                                            {strength}
                                        </li>
                                    ))}
                                </ul>
                            </GlassCard>
                        )}

                        {/* Weaknesses */}
                        {result.weaknesses.length > 0 && (
                            <GlassCard className="p-6">
                                <h4 className="flex items-center gap-2 text-lg font-black text-amber-600 mb-4">
                                    <AlertCircle size={20} />
                                    Areas to Improve
                                </h4>
                                <ul className="space-y-2">
                                    {result.weaknesses.map((weakness, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                                            <span className="text-amber-500 mt-0.5">!</span>
                                            {weakness}
                                        </li>
                                    ))}
                                </ul>
                            </GlassCard>
                        )}

                        {/* Recommendations */}
                        {result.recommendations.length > 0 && (
                            <GlassCard className="p-6">
                                <h4 className="flex items-center gap-2 text-lg font-black text-brand-600 mb-4">
                                    <TrendingUp size={20} />
                                    Recommendations
                                </h4>
                                <ul className="space-y-3">
                                    {result.recommendations.map((rec, i) => (
                                        <li key={i} className="flex items-start gap-3 p-3 rounded-xl bg-brand-50 dark:bg-brand-900/20">
                                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs font-bold">
                                                {i + 1}
                                            </span>
                                            <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">{rec}</span>
                                        </li>
                                    ))}
                                </ul>
                            </GlassCard>
                        )}
                    </motion.div>
                )}

                {!result && !loading && (
                    <div className="flex items-center justify-center">
                        <div className="text-center text-slate-400">
                            <Calculator size={64} className="mx-auto mb-4 opacity-20" />
                            <p className="text-lg font-bold">Enter your details and calculate</p>
                            <p className="text-sm">Results will appear here</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VisaSimulatorView;
