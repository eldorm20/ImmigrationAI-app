import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import { error as logError } from "@/lib/logger";
import { LiveButton, AnimatedCard } from "@/components/ui/live-elements";
import { Loader2, ArrowRight, CheckCircle, Circle, Zap, Sparkles, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type ToastHandler = ReturnType<typeof import('@/hooks/use-toast').toast>;

interface RoadmapItem {
    id?: string;
    title: string;
    status?: string;
    description?: string;
    desc?: string;
}

interface ApplicationSummary {
    id: string;
    status?: string;
    visaType?: string;
    country?: string;
}

export const RoadmapView = ({ setActiveTab }: { setActiveTab: (tab: string) => void }) => {
    const { user } = useAuth();
    const { t } = useI18n();
    const { toast } = useToast();
    const [application, setApplication] = useState<ApplicationSummary | null>(null);
    const [roadmapItems, setRoadmapItems] = useState<RoadmapItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const loadRoadmapData = async () => {
            try {
                setError(null);
                setLoading(true);

                const appsResp: any = await apiRequest('/applications');
                const appArray = Array.isArray(appsResp) ? appsResp : appsResp.applications || [];

                if (appArray && appArray.length > 0) {
                    const activeApp = appArray[0];
                    setApplication(activeApp);

                    const items = await apiRequest<RoadmapItem[]>(`/roadmap/application/${activeApp.id}`);
                    setRoadmapItems(items || []);

                    const completed = (items || []).filter((i) => i.status === 'completed' || i.status === 'done').length;
                    const total = (items || []).length || 1;
                    setProgress(Math.round((completed / total) * 100));
                } else {
                    setRoadmapItems([]);
                    setProgress(0);
                }
            } catch (err) {
                logError('Failed to load roadmap:', err);
                const msg = err instanceof Error ? err.message : 'Failed to load roadmap data';
                setError(msg);
            } finally {
                setLoading(false);
            }
        };

        loadRoadmapData();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 min-h-[400px]">
                <div className="relative">
                    <Loader2 className="animate-spin text-brand-600" size={48} />
                    <div className="absolute inset-0 bg-brand-500/10 blur-xl rounded-full" />
                </div>
            </div>
        );
    }

    const items = roadmapItems.length > 0 ? roadmapItems : [
        { title: t.roadmap?.assessment || 'Assessment Complete', status: 'done', description: t.roadmap?.defaults?.assessmentDesc || 'Eligibility score calculated' },
        { title: t.simulator?.title || 'Visa Simulator', status: 'done', description: t.simulator?.desc || 'Success probability check' },
        { title: t.roadmap?.documents || 'Documents Uploaded', status: 'done', description: t.roadmap?.defaults?.documentsDesc || 'Essential documentation' },
        { title: t.review?.title || 'AI Document Review', status: 'current', description: t.review?.desc || 'Automated compliance check' },
        { title: t.gov?.title || 'Gov Checks', status: 'pending', description: t.gov?.desc || 'Official status verification' },
        { title: t.voice?.title || 'Interview Prep', status: 'pending', description: t.voice?.desc || 'AI-guided mock interviews' },
        { title: t.roadmap?.lawyerReview || 'Lawyer Review', status: 'pending', description: t.roadmap?.defaults?.lawyerReviewDesc || 'Professional case review' },
        { title: t.roadmap?.submission || 'Application Submission', status: 'pending', description: t.roadmap?.defaults?.submissionDesc || 'Final submission' }
    ];

    const currentStep = items.find(i => i.status === 'current') || items[0];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-10 pb-12"
        >
            {/* Main Progress Card */}
            <AnimatedCard className="glass-premium border-none p-10 shadow-2xl rounded-[3rem] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-brand-500/5 rounded-full blur-3xl -mr-40 -mt-40"></div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 relative z-10">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 font-black text-[10px] uppercase tracking-widest mb-2 border border-brand-500/10">
                            <Sparkles size={14} /> {application?.status || t.dashStatus.active}
                        </div>
                        <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                            {application?.visaType || 'Skilled Worker Visa'}
                            <span className="text-slate-300 dark:text-slate-700 font-light translate-y-0.5">/</span>
                            <span className="text-brand-600 dark:text-brand-400">{application?.country || 'UK'}</span>
                        </h3>
                        <p className="text-slate-500 font-black text-xs uppercase tracking-widest">
                            {t.roadmap?.applicationReference} <span className="text-slate-900 dark:text-white ml-1">#{application?.id?.slice(0, 8).toUpperCase() || 'REF-8842'}</span>
                        </p>
                    </div>

                    <div className="bg-white/40 dark:bg-slate-900/40 p-6 rounded-[2rem] border border-white/20 text-center min-w-[140px] shadow-sm">
                        <div className="text-5xl font-black text-brand-600 dark:text-brand-400 tracking-tighter leading-none mb-1">{progress || 40}%</div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.roadmap?.completionLabel}</div>
                    </div>
                </div>

                <div className="relative mb-10">
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-4 overflow-hidden shadow-inner">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress || 40}%` }}
                            transition={{ duration: 1.5, ease: "circOut" }}
                            className="bg-gradient-to-r from-brand-600 to-indigo-600 h-full rounded-full relative"
                        >
                            <div className="absolute inset-0 bg-white/20 animate-pulse pointer-events-none"></div>
                        </motion.div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6 bg-brand-500/5 dark:bg-brand-500/10 rounded-[2rem] border border-brand-500/10 relative z-10 w-full group">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:rotate-12 transition-transform">
                            <Zap size={22} className="text-white fill-white" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-500 mb-1">{t.roadmap?.nextStepLabel}</p>
                            <h4 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                                {currentStep.title}
                            </h4>
                        </div>
                    </div>
                    <LiveButton
                        size="sm"
                        className="py-6 px-10 rounded-2xl font-black text-lg bg-brand-600 group-hover:scale-105 active:scale-95 transition-all shadow-xl shadow-brand-500/20"
                        onClick={() => {
                            if (currentStep.title.includes('Document') && currentStep.title.includes('Review')) setActiveTab('docs');
                            else setActiveTab('upload');
                        }}
                    >
                        {t.tools.next} <ArrowRight size={20} className="ml-3" />
                    </LiveButton>
                </div>
            </AnimatedCard>

            {/* List of Steps */}
            <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-6 mb-6 flex items-center gap-3">
                    <TrendingUp size={16} className="text-brand-500" />
                    {t.dash.roadmap}
                </h4>

                <div className="grid grid-cols-1 gap-4">
                    {items.map((step: RoadmapItem, i: number) => (
                        <AnimatedCard
                            key={i}
                            delay={i * 0.05}
                            className={`group relative p-0 overflow-hidden transition-all rounded-[2.5rem] border-none shadow-sm hover:shadow-xl ${step.status === 'current'
                                ? 'bg-white dark:bg-slate-800 ring-2 ring-brand-500 ring-offset-4 dark:ring-offset-slate-950 scale-105 z-10'
                                : 'bg-white/40 dark:bg-slate-900/40 opacity-70 hover:opacity-100 hover:scale-[1.01]'
                                }`}
                            onClick={() => {
                                if (step.title.includes('Document') && step.title.includes('Review')) setActiveTab('docs');
                                else if (step.title.includes('Document') && step.title.includes('Uploaded')) setActiveTab('upload');
                                else if (step.title.includes('AI Document Review')) setActiveTab('docs');
                                else if (step.title.includes('Translation')) setActiveTab('translate');
                                else if (step.title.includes('Simulator')) setActiveTab('simulator');
                                else if (step.title.includes('Gov Checks') || step.title.includes('Employer')) setActiveTab('gov');
                                else if (step.title.includes('Interview')) setActiveTab('trainer');
                                else if (step.title.includes('Lawyer')) setActiveTab('lawyer');
                            }}
                        >
                            <div className="flex items-center gap-6 p-6">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${step.status === 'done' || step.status === 'completed'
                                    ? 'bg-green-500 text-white shadow-green-500/20'
                                    : step.status === 'current'
                                        ? 'bg-brand-600 text-white shadow-brand-500/20 relative'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                    }`}>
                                    {step.status === 'done' || step.status === 'completed' ? (
                                        <CheckCircle size={24} />
                                    ) : step.status === 'current' ? (
                                        <>
                                            <div className="absolute inset-0 bg-brand-500 rounded-2xl animate-ping opacity-20"></div>
                                            <Loader2 size={24} className="animate-spin" />
                                        </>
                                    ) : (
                                        <Circle size={24} strokeWidth={3} />
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <h4 className={`text-xl font-black tracking-tight ${step.status === 'pending' ? 'text-slate-400' : 'text-slate-900 dark:text-white'
                                        }`}>
                                        {step.title}
                                    </h4>
                                    <p className="text-sm text-slate-500 font-medium truncate italic">{step.description || step.desc}</p>
                                </div>

                                {(step.status === 'current' || step.status === 'done') && (
                                    <div className="hidden sm:flex w-10 h-10 rounded-full bg-brand-50 dark:bg-brand-900/20 items-center justify-center text-brand-600 dark:text-brand-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ArrowRight size={20} />
                                    </div>
                                )}
                            </div>
                        </AnimatedCard>
                    ))}
                </div>
            </div>
        </motion.div>
    );
};
