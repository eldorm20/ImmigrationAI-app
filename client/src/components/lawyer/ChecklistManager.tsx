import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import {
    CheckSquare, Square, FileText, Upload, RefreshCw,
    ChevronRight, AlertCircle, CheckCircle, Sparkles, Zap, ShieldCheck
} from 'lucide-react';
import { LiveButton, AnimatedCard } from '@/components/ui/live-elements';
import { motion, AnimatePresence } from 'framer-motion';

interface ChecklistItem {
    id: string;
    name: string;
    category: string;
    isRequired: boolean;
    isCompleted: boolean;
    documentId?: string;
    notes?: string;
}

interface ChecklistData {
    items: ChecklistItem[];
    progress: number;
    stats: {
        total: number;
        completed: number;
        required: number;
        requiredCompleted: number;
    };
}

interface Props {
    applicationId: string;
    refreshTrigger?: number;
}

export default function ChecklistManager({ applicationId, refreshTrigger }: Props) {
    const { toast } = useToast();
    const [data, setData] = useState<ChecklistData | null>(null);
    const [loading, setLoading] = useState(true);
    const [initLoading, setInitLoading] = useState(false);
    const [autoCheckLoading, setAutoCheckLoading] = useState(false);

    useEffect(() => {
        fetchChecklist();
    }, [applicationId, refreshTrigger]);

    const fetchChecklist = async () => {
        setLoading(true);
        try {
            const res = await apiRequest<ChecklistData>(`/checklists/application/${applicationId}`);
            setData(res);
        } catch (err: any) {
            setData(null);
        } finally {
            setLoading(false);
        }
    };

    const handleInitChecklist = async () => {
        setInitLoading(true);
        try {
            await apiRequest(`/checklists/application/${applicationId}/init`, {
                method: 'POST',
                body: JSON.stringify({})
            });
            toast({ title: "Checklist Generated", description: "Audit framework initialized for this application.", className: "bg-green-50 text-green-900" });
            fetchChecklist();
        } catch (err) {
            toast({ title: "Generation failed", variant: "destructive" });
        } finally {
            setInitLoading(false);
        }
    };

    const handleToggleItem = async (itemId: string, currentStatus: boolean) => {
        try {
            await apiRequest(`/checklists/items/${itemId}`, {
                method: 'PATCH',
                body: JSON.stringify({ isCompleted: !currentStatus })
            });
            if (data) {
                setData({
                    ...data,
                    items: data.items.map(i => i.id === itemId ? { ...i, isCompleted: !currentStatus } : i)
                });
            }
        } catch (err) {
            toast({ title: "State transition failed", variant: "destructive" });
            fetchChecklist();
        }
    };

    const handleAutoCheck = async () => {
        setAutoCheckLoading(true);
        try {
            const res = await apiRequest<{ matchedCount: number }>(`/checklists/application/${applicationId}/auto-check`, {
                method: 'POST'
            });
            toast({
                title: "AI Audit Complete",
                description: `Synchronized ${res.matchedCount} items via document recognition.`,
                className: "bg-blue-50 text-blue-900"
            });
            fetchChecklist();
        } catch (err) {
            toast({ title: "Audit synchronization failed", variant: "destructive" });
        } finally {
            setAutoCheckLoading(false);
        }
    };

    const groupedItems = data?.items.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
    }, {} as Record<string, ChecklistItem[]>) || {};

    if (loading && !data) return (
        <div className="p-12 text-center">
            <RefreshCw className="w-10 h-10 text-brand-500 animate-spin mx-auto mb-4" />
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Synchronizing Audit Records...</p>
        </div>
    );

    if (!data) {
        return (
            <AnimatedCard className="bg-white/30 dark:bg-slate-900/30 backdrop-blur-xl border-dashed border-2 border-white/20 p-12 text-center rounded-[40px]">
                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-400">
                    <FileText size={40} />
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Audit Framework Missing</h3>
                <p className="text-sm text-slate-500 font-medium mb-8 max-w-xs mx-auto">Initialize a document checklist to track compliance and required artifacts for this case.</p>
                <LiveButton onClick={handleInitChecklist} disabled={initLoading} icon={initLoading ? RefreshCw : Sparkles} className="px-10">
                    {initLoading ? 'Initializing...' : 'Generate Audit Hub'}
                </LiveButton>
            </AnimatedCard>
        );
    }

    return (
        <AnimatedCard className="p-0 border-none bg-white/40 dark:bg-slate-950/40 backdrop-blur-2xl shadow-2xl overflow-hidden rounded-[32px]">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow-lg shadow-brand-500/20">
                        <ShieldCheck size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                            Compliance Audit Master
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-black text-brand-600 uppercase tracking-widest">{data.progress}% COMPLIANCE</span>
                            <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{data.stats.completed} / {data.stats.total} ARTIFACTS</span>
                        </div>
                    </div>
                </div>
                <LiveButton
                    size="sm"
                    variant="ghost"
                    onClick={handleAutoCheck}
                    disabled={autoCheckLoading}
                    className="bg-brand-50 dark:bg-brand-900/20 text-brand-600 font-black text-[10px] uppercase tracking-widest px-6"
                    icon={autoCheckLoading ? RefreshCw : Zap}
                >
                    {autoCheckLoading ? 'Syncing...' : 'AI Synchronize'}
                </LiveButton>
            </div>

            {/* Progress Bar Container */}
            <div className="px-6 py-4 bg-slate-50/30 dark:bg-slate-900/10">
                <div className="h-2 bg-slate-100 dark:bg-slate-800 w-full rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${data.progress}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-brand-600 to-indigo-500 shadow-[0_0_10px_rgba(37,99,235,0.4)]"
                    />
                </div>
            </div>

            {/* Items List */}
            <div className="p-6 space-y-8 max-h-[600px] overflow-y-auto scrollbar-thin">
                {Object.entries(groupedItems).map(([category, items], catIdx) => (
                    <motion.div
                        key={category}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: catIdx * 0.1 }}
                    >
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                            <span className="w-6 h-[1px] bg-slate-200 dark:bg-slate-800"></span>
                            {category}
                        </h4>
                        <div className="space-y-3">
                            {items.map((item, idx) => (
                                <motion.div
                                    key={item.id}
                                    whileHover={{ x: 5 }}
                                    className={`flex items-start gap-4 p-4 rounded-3xl transition-all border ${item.isCompleted
                                            ? 'bg-green-50/30 dark:bg-green-900/10 border-green-100/50 dark:border-green-900/30'
                                            : 'bg-white/50 dark:bg-slate-900/50 border-white/20 dark:border-white/5 hover:border-brand-500/30'
                                        }`}
                                >
                                    <button
                                        onClick={() => handleToggleItem(item.id, item.isCompleted)}
                                        className={`mt-0.5 w-6 h-6 rounded-xl flex items-center justify-center border-2 transition-all ${item.isCompleted
                                                ? 'bg-brand-600 border-brand-600 text-white shadow-lg shadow-brand-500/20'
                                                : 'border-slate-200 dark:border-slate-800 hover:border-brand-500'
                                            }`}
                                    >
                                        {item.isCompleted ? <CheckCircle size={14} strokeWidth={3} /> : <div className="w-1.5 h-1.5 rounded-sm bg-slate-200" />}
                                    </button>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <p className={`text-sm font-extrabold ${item.isCompleted ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-white'}`}>
                                                {item.name}
                                            </p>
                                            {item.isRequired && !item.isCompleted && (
                                                <span className="text-[8px] font-black text-rose-600 bg-rose-50 dark:bg-rose-900/30 px-2 py-1 rounded-lg uppercase tracking-widest">Mandatory</span>
                                            )}
                                        </div>
                                        {item.documentId && (
                                            <div className="mt-2 flex items-center gap-2 text-[10px] font-black text-brand-600 uppercase tracking-tighter">
                                                <div className="w-5 h-5 rounded-lg bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
                                                    <ShieldCheck size={12} />
                                                </div>
                                                Verified Node Attached
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                ))}
            </div>
        </AnimatedCard>
    );
}
