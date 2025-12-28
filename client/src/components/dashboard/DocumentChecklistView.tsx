import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import { error as logError } from "@/lib/logger";
import { LiveButton, AnimatedCard } from "@/components/ui/live-elements";
import {
    Loader2,
    CheckCircle,
    Circle,
    Upload,
    AlertTriangle,
    Info,
    FileText,
    Sparkles,
    ChevronRight,
    Search
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ChecklistItem {
    id: string;
    name: string;
    category: string;
    isRequired: boolean;
    isCompleted: boolean;
    status: 'pending' | 'completed' | 'correction_required';
    documentId?: string;
    description?: string;
    notes?: string;
}

interface ApplicationSummary {
    id: string;
    status: string;
    visaType: string;
    country: string;
}

export const DocumentChecklistView = ({
    onSelectChecklistItem,
    onSubmit
}: {
    onSelectChecklistItem?: (item: ChecklistItem) => void,
    onSubmit?: () => void
}) => {
    const { user } = useAuth();
    const { t } = useI18n();
    const { toast } = useToast();
    const [application, setApplication] = useState<ApplicationSummary | null>(null);
    const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState("all");

    const loadChecklistData = async () => {
        try {
            setError(null);
            setLoading(true);

            const appsResp: any = await apiRequest('/applications');
            const appArray = Array.isArray(appsResp) ? appsResp : appsResp.applications || [];

            if (appArray && appArray.length > 0) {
                const activeApp = appArray[0];
                setApplication(activeApp);

                const items = await apiRequest<ChecklistItem[]>(`/applications/${activeApp.id}/checklist`);
                setChecklistItems(items || []);
            }
        } catch (err) {
            logError('Failed to load checklist:', err);
            setError('Failed to load document checklist. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadChecklistData();
    }, []);

    const filteredItems = checklistItems.filter(item => {
        if (filter === "all") return true;
        if (filter === "required") return item.isRequired;
        if (filter === "completed") return item.status === 'completed';
        if (filter === "pending") return item.status === 'pending';
        if (filter === "correction") return item.status === 'correction_required';
        return true;
    });

    const completionRate = checklistItems.length > 0
        ? Math.round((checklistItems.filter(i => i.isCompleted).length / checklistItems.length) * 100)
        : 0;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 min-h-[400px]">
                <Loader2 className="animate-spin text-brand-600" size={48} />
                <p className="mt-4 text-slate-500 font-medium">Loading your checklist...</p>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8 pb-12"
        >
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <AnimatedCard className="glass-premium p-6 border-none rounded-[2rem] shadow-xl relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-brand-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform"></div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-500 mb-1">Total Progress</p>
                        <h4 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{completionRate}%</h4>
                        <div className="mt-4 w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${completionRate}%` }}
                                className="h-full bg-gradient-to-r from-brand-500 to-indigo-600"
                            />
                        </div>
                    </div>
                </AnimatedCard>

                <AnimatedCard className="glass-premium p-6 border-none rounded-[2rem] shadow-xl relative overflow-hidden group" delay={0.1}>
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-green-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform"></div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-green-500 mb-1">Verified Docs</p>
                        <h4 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                            {checklistItems.filter(i => i.isCompleted).length}
                            <span className="text-slate-300 dark:text-slate-700 text-2xl ml-1">/ {checklistItems.length}</span>
                        </h4>
                        <p className="mt-2 text-slate-500 text-xs font-bold">Successfully processed</p>
                    </div>
                </AnimatedCard>

                <AnimatedCard className="glass-premium p-6 border-none rounded-[2rem] shadow-xl relative overflow-hidden group" delay={0.2}>
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform"></div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500 mb-1">Attention Required</p>
                        <h4 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                            {checklistItems.filter(i => i.isRequired && !i.isCompleted).length}
                        </h4>
                        <p className="mt-2 text-slate-500 text-xs font-bold">Missing mandatory items</p>
                    </div>
                </AnimatedCard>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white/40 dark:bg-slate-900/40 p-2 rounded-3xl border border-white/20">
                <div className="flex p-1 gap-1">
                    {["all", "required", "pending", "correction", "completed"].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === f
                                ? "bg-brand-600 text-white shadow-lg shadow-brand-500/20"
                                : "text-slate-500 hover:bg-white/60 dark:hover:bg-slate-800/60"
                                }`}
                        >
                            {f === 'correction' ? 'Attention' : f}
                        </button>
                    ))}
                </div>
                <div className="px-6 flex items-center gap-2 text-slate-400">
                    <Search size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest italic">{application?.visaType || "Visa Application"}</span>
                </div>
            </div>

            {/* Checklist items */}
            <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                    {filteredItems.map((item, idx) => (
                        <AnimatedCard
                            key={item.id}
                            delay={idx * 0.05}
                            className={`group relative p-0 overflow-hidden rounded-[2.5rem] border-none shadow-sm transition-all hover:shadow-xl ${item.isCompleted
                                ? 'bg-white/60 dark:bg-slate-900/60 opacity-80'
                                : 'bg-white dark:bg-slate-800 ring-1 ring-slate-100 dark:ring-slate-800'
                                }`}
                        >
                            <div className="flex flex-col md:flex-row md:items-center gap-6 p-6">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${item.isCompleted
                                    ? 'bg-green-500 text-white shadow-green-500/20'
                                    : 'bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400'
                                    }`}>
                                    {item.isCompleted ? <CheckCircle size={24} /> : <FileText size={24} />}
                                </div>

                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center gap-3">
                                        <h4 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                                            {item.name}
                                        </h4>
                                        {item.isRequired && (
                                            <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-500 text-[8px] font-black uppercase tracking-widest border border-rose-500/10">Required</span>
                                        )}
                                        <span className="px-2 py-0.5 rounded-md bg-slate-500/10 text-slate-500 text-[8px] font-black uppercase tracking-widest border border-slate-500/10">{item.category}</span>
                                    </div>
                                    <p className="text-sm text-slate-500 font-medium italic underline decoration-slate-200 dark:decoration-slate-800 underline-offset-4 decoration-2">
                                        {item.description || "Upload this document to proceed with your application."}
                                    </p>
                                    {item.notes?.includes("Template available:") && (
                                        <div className="mt-2">
                                            <a
                                                href={item.notes.split("Template available: ")[1]}
                                                download
                                                className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand-600 hover:text-brand-700 bg-brand-50 px-3 py-1.5 rounded-xl border border-brand-200 shadow-sm transition-all hover:scale-105"
                                            >
                                                <FileText size={12} /> Download Template
                                            </a>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-4">
                                    {item.status === 'completed' ? (
                                        <div className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-green-500/10 text-green-600 dark:text-green-400 font-black text-[10px] uppercase tracking-widest border border-green-500/10">
                                            <CheckCircle size={14} /> Verified
                                        </div>
                                    ) : item.status === 'correction_required' ? (
                                        <LiveButton
                                            size="sm"
                                            className="rounded-2xl bg-amber-500 font-black shadow-lg shadow-amber-500/10 group-hover:scale-105 transition-transform"
                                            onClick={() => onSelectChecklistItem?.(item)}
                                        >
                                            <AlertTriangle size={16} className="mr-2" /> Re-upload
                                        </LiveButton>
                                    ) : (
                                        <LiveButton
                                            size="sm"
                                            className="rounded-2xl bg-brand-600 font-black shadow-lg shadow-brand-500/10 group-hover:scale-105 transition-transform"
                                            onClick={() => onSelectChecklistItem?.(item)}
                                        >
                                            <Upload size={16} className="mr-2" /> Upload
                                        </LiveButton>
                                    )}
                                    <button
                                        className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400 hover:text-brand-500 transition-colors"
                                        onClick={() => {
                                            toast({
                                                title: item.name,
                                                description: item.description || "Required for your visa application.",
                                            });
                                        }}
                                    >
                                        <Info size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* AI Correction Hint */}
                            {item.status === 'correction_required' && item.notes && (
                                <div className="bg-amber-500/10 p-4 border-t border-amber-500/10 flex items-start gap-3">
                                    <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Correction Required</p>
                                        <p className="text-xs text-amber-700/80 font-medium">{item.notes}</p>
                                    </div>
                                </div>
                            )}
                            {item.status !== 'correction_required' && !item.isCompleted && item.notes && (
                                <div className="bg-brand-500/5 p-4 border-t border-brand-500/10 flex items-start gap-3">
                                    <Sparkles size={16} className="text-brand-500 mt-0.5 shrink-0" />
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-brand-600">AI Recommendation</p>
                                        <p className="text-xs text-brand-700/80 font-medium">{item.notes}</p>
                                    </div>
                                </div>
                            )}
                        </AnimatedCard>
                    ))}
                </AnimatePresence>

                {filteredItems.length === 0 && (
                    <div className="text-center py-20 bg-slate-50/50 dark:bg-slate-900/50 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                        <FileText size={48} className="mx-auto text-slate-300 mb-4" />
                        <h3 className="text-2xl font-black text-slate-400 tracking-tighter">No items found</h3>
                        <p className="text-slate-500 font-medium mt-2 italic">Try changing your filters or searching for specific documents.</p>
                    </div>
                )}
            </div>

            {/* Submission Preview Card */}
            <AnimatedCard className="glass-premium p-10 border-none rounded-[3rem] shadow-2xl relative overflow-hidden mt-12">
                <div className="absolute top-0 right-0 w-80 h-80 bg-brand-500/5 rounded-full blur-3xl -mr-40 -mt-40"></div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                    <div className="space-y-2 text-center md:text-left">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 font-black text-[10px] uppercase tracking-widest mb-2">
                            <Sparkles size={14} /> Final Step
                        </div>
                        <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            Submit to Lawyer
                        </h3>
                        <p className="text-slate-500 font-medium max-w-md italic">
                            Once all required documents are uploaded and AI-vetted, you can formally submit your case for professional legal review.
                        </p>
                    </div>

                    <div className="text-center md:text-right space-y-4">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Readiness Score</p>
                            <div className="text-4xl font-black text-brand-600 dark:text-brand-400 tracking-tighter">{completionRate}%</div>
                        </div>

                        <LiveButton
                            className={`py-8 px-12 rounded-[2rem] text-xl font-black shadow-2xl transition-all ${completionRate === 100
                                ? 'bg-brand-600 hover:scale-105 active:scale-95'
                                : 'bg-slate-300 cursor-not-allowed opacity-50 grayscale'
                                }`}
                            onClick={onSubmit}
                            disabled={completionRate < 100}
                        >
                            Submit Case <ChevronRight size={24} className="ml-2" />
                        </LiveButton>

                        {completionRate < 100 && (
                            <p className="text-[10px] font-black uppercase tracking-widest text-rose-500 flex items-center justify-center md:justify-end gap-1">
                                <AlertTriangle size={12} /> Complete all required items to unlock
                            </p>
                        )}
                    </div>
                </div>
            </AnimatedCard>
        </motion.div>
    );
};
