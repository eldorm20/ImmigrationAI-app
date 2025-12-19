import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import { error as logError } from "@/lib/logger";
import { LiveButton, AnimatedCard } from "@/components/ui/live-elements";
import { Loader2, ArrowRight, CheckCircle, Circle, Zap } from "lucide-react";
import { motion } from "framer-motion";

type ToastHandler = ReturnType<typeof import('@/hooks/use-toast').toast>;

interface RoadmapItem {
    id?: string;
    title: string;
    status?: string;
    description?: string;
    desc?: string; // For compatibility
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

                // Fetch user's applications (supports paginated response or array)
                const appsResp: any = await apiRequest('/applications');
                const appArray = Array.isArray(appsResp) ? appsResp : appsResp.applications || [];

                if (appArray && appArray.length > 0) {
                    const activeApp = appArray[0]; // Get first application
                    setApplication(activeApp);

                    // Fetch roadmap items for this application
                    const items = await apiRequest<RoadmapItem[]>(`/roadmap/application/${activeApp.id}`);
                    setRoadmapItems(items || []);

                    // Calculate progress
                    const completed = (items || []).filter((i) => i.status === 'completed').length;
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
                <AnimatedCard>
                    <div className="flex items-center justify-center p-12">
                        <Loader2 className="animate-spin" />
                    </div>
                </AnimatedCard>
            </motion.div>
        );
    }

    const items = roadmapItems.length > 0 ? roadmapItems : [

        { title: t.roadmap?.assessment || 'Assessment Complete', status: 'done', description: t.roadmap?.defaults?.assessmentDesc || 'Eligibility score calculated, visa route identified' },
        { title: t.roadmap?.documents || 'Documents Uploaded', status: 'current', description: t.roadmap?.defaults?.documentsDesc || 'Upload passport, degree, work experience proof' },
        { title: t.roadmap?.aiReview || 'AI Document Review', status: 'pending', description: t.roadmap?.defaults?.aiReviewDesc || 'Automated verification and compliance check' },
        { title: t.roadmap?.lawyerReview || 'Lawyer Review', status: 'pending', description: t.roadmap?.defaults?.lawyerReviewDesc || 'Professional consultation and case review' },
        { title: t.roadmap?.employerVerification || 'Employer Verification', status: 'pending', description: t.roadmap?.defaults?.employerDesc || 'Sponsor company registry validation' },
        { title: t.roadmap?.submission || 'Application Submission', status: 'pending', description: t.roadmap?.defaults?.submissionDesc || 'Final submission to immigration authority' }
    ];

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="space-y-8"
        >
            <AnimatedCard className="border-l-4 border-brand-500 bg-gradient-to-r from-white to-brand-50/30 dark:from-slate-900 dark:to-brand-900/10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h3 className="font-bold text-xl flex items-center gap-2 text-slate-900 dark:text-white">
                            {application?.visaType || 'Skilled Worker Visa'} ({application?.country || 'UK'})
                            <span className="bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">{application?.status || 'In Progress'}</span>
                        </h3>
                        <p className="text-slate-500 mt-1">{t.roadmap?.applicationReference || 'Application Reference:'} #{application?.id?.slice(0, 8).toUpperCase() || 'UK-SW-2025-8842'}</p>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-extrabold text-brand-600 dark:text-brand-400">{progress}%</div>
                        <div className="text-xs font-bold text-slate-400 uppercase">{t.roadmap?.completionLabel || 'Completion'}</div>
                    </div>
                </div>

                <div className="w-full bg-slate-200/50 dark:bg-slate-700/50 rounded-full h-3 mb-6 overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1.5, ease: "easeOut" }}
                        className="bg-gradient-to-r from-brand-500 to-purple-500 h-full rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)] relative"
                    >
                        <div className="absolute inset-0 bg-white/30 animate-[shimmer_2s_infinite] skew-x-12"></div>
                    </motion.div>
                </div>

                <p className="text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2">
                    <Zap size={16} className="text-yellow-500 fill-yellow-500" />
                    {t.roadmap?.nextStepLabel || 'Next Step:'} <span className="font-bold">{items.find(i => i.status === 'current')?.title || (t.roadmap?.defaults?.submissionDesc || 'Complete Application')}</span>
                </p>
            </AnimatedCard>

            <div className="grid gap-4">
                {items.map((step: RoadmapItem, i: number) => (
                    <AnimatedCard
                        key={i}
                        delay={i * 0.1}
                        className={`p-0 overflow-hidden transition-all cursor-pointer ${step.status === 'current' ? 'ring-2 ring-brand-500 ring-offset-2 dark:ring-offset-slate-950' : 'opacity-80 hover:opacity-100'} ${step.status !== 'pending' ? 'hover:shadow-lg' : ''}`}
                        onClick={() => step.status !== 'pending' && (
                            step.title.includes('Document') ? setActiveTab('upload') :
                                step.title.includes('Translation') ? setActiveTab('translate') : null
                        )}
                    >
                        <div className={`p-5 flex items-center gap-5 ${step.status === 'current' ? 'bg-white dark:bg-slate-800' : 'bg-slate-50/50 dark:bg-slate-900/50'}`}>
                            {step.status === 'done' || step.status === 'completed' ? (
                                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 flex items-center justify-center shadow-sm">
                                    <CheckCircle size={20} />
                                </div>
                            ) : step.status === 'current' ? (
                                <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 flex items-center justify-center shadow-sm relative">
                                    <div className="absolute inset-0 bg-brand-500 rounded-full opacity-20 animate-ping"></div>
                                    <Loader2 size={20} className="animate-spin" />
                                </div>
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
                                    <Circle size={20} />
                                </div>
                            )}

                            <div className="flex-1">
                                <h4 className={`font-bold text-lg ${step.status === 'pending' ? 'text-slate-500' : 'text-slate-900 dark:text-white'}`}>{step.title}</h4>
                                <p className="text-sm text-slate-500">{step.description || step.desc}</p>
                            </div>

                            {step.status === 'current' && (
                                <LiveButton size="sm" className="h-10 px-6 text-sm" onClick={() => {
                                    toast({
                                        title: t.tools?.nextStep || "Next Step",
                                        description: `${t.roadmap?.starting || 'Starting'} ${step.title}...`,
                                        className: "bg-blue-50 text-blue-900 border-blue-200"
                                    });
                                }}>
                                    {t.tools?.next || 'Next'} <ArrowRight size={16} />
                                </LiveButton>
                            )}
                        </div>
                    </AnimatedCard>
                ))}
            </div>
        </motion.div>
    );
};
