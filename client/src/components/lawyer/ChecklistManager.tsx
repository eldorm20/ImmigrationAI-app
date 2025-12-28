import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import {
    CheckSquare, Square, FileText, Upload, RefreshCw,
    ChevronRight, AlertCircle, CheckCircle
} from 'lucide-react';
import { LiveButton } from '@/components/ui/live-elements';

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
    refreshTrigger?: number; // To trigger refresh from parent
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
            // First try to get existing checklist
            const res = await apiRequest<ChecklistData>(`/checklists/application/${applicationId}`);
            setData(res);
        } catch (err: any) {
            // If 404, it means no checklist yet, which is fine
            if (err.message && !err.message.includes('404')) {
                console.error(err);
            }
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
                body: JSON.stringify({}) // Let backend auto-detect template
            });
            toast({ title: "Checklist created", className: "bg-green-50 text-green-900" });
            fetchChecklist();
        } catch (err) {
            toast({ title: "Failed to create checklist", variant: "destructive" });
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
            // Optimistic update
            if (data) {
                setData({
                    ...data,
                    items: data.items.map(i => i.id === itemId ? { ...i, isCompleted: !currentStatus } : i)
                });
            }
        } catch (err) {
            toast({ title: "Update failed", variant: "destructive" });
            fetchChecklist(); // Revert on failure
        }
    };

    const handleAutoCheck = async () => {
        setAutoCheckLoading(true);
        try {
            const res = await apiRequest<{ matchedCount: number }>(`/checklists/application/${applicationId}/auto-check`, {
                method: 'POST'
            });
            toast({
                title: "Auto-check Complete",
                description: `Marked ${res.matchedCount} items based on uploaded files.`,
                className: "bg-blue-50 text-blue-900"
            });
            fetchChecklist();
        } catch (err) {
            toast({ title: "Auto-check failed", variant: "destructive" });
        } finally {
            setAutoCheckLoading(false);
        }
    };

    // Group items by category
    const groupedItems = data?.items.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
    }, {} as Record<string, ChecklistItem[]>) || {};

    if (loading && !data) return <div className="p-4 text-center text-slate-400">Loading checklist...</div>;

    if (!data) {
        return (
            <div className="bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center">
                <FileText size={48} className="mx-auto text-slate-300 mb-4" />
                <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-2">No Document Checklist</h3>
                <p className="text-sm text-slate-500 mb-6">Create a checklist to track required documents for this case.</p>
                <LiveButton onClick={handleInitChecklist} disabled={initLoading} icon={initLoading ? RefreshCw : CheckSquare}>
                    {initLoading ? 'Creating...' : 'Generate Checklist'}
                </LiveButton>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50">
                <div>
                    <h3 className="font-bold flex items-center gap-2">
                        <CheckSquare className="text-brand-500" size={18} />
                        Document Checklist
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                        {data.progress}% Complete ({data.stats.completed}/{data.stats.total} items)
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleAutoCheck}
                        disabled={autoCheckLoading}
                        className="text-xs font-bold text-brand-600 hover:bg-brand-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                        {autoCheckLoading ? <RefreshCw className="animate-spin" size={14} /> : <Upload size={14} />} Auto-Verify
                    </button>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="h-1 bg-slate-100 dark:bg-slate-800 w-full">
                <div className="h-full bg-brand-500 transition-all duration-500" style={{ width: `${data.progress}%` }}></div>
            </div>

            {/* Items List */}
            <div className="p-4 space-y-6">
                {Object.entries(groupedItems).map(([category, items]) => (
                    <div key={category}>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <ChevronRight size={12} /> {category}
                        </h4>
                        <div className="space-y-2">
                            {items.map(item => (
                                <div key={item.id} className={`flex items-start gap-3 p-2 rounded-lg transition-colors ${item.isCompleted ? 'bg-green-50/50 dark:bg-green-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                                    <button
                                        onClick={() => handleToggleItem(item.id, item.isCompleted)}
                                        className={`mt-0.5 min-w-[20px] h-5 rounded flex items-center justify-center border transition-all ${item.isCompleted ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 dark:border-slate-600 hover:border-brand-400'}`}
                                    >
                                        {item.isCompleted && <CheckCircle size={14} />}
                                    </button>
                                    <div className="flex-1">
                                        <p className={`text-sm font-medium ${item.isCompleted ? 'text-slate-500 line-through' : 'text-slate-700 dark:text-slate-200'}`}>
                                            {item.name}
                                        </p>
                                        {item.isRequired && !item.isCompleted && (
                                            <span className="text-[10px] text-red-500 font-bold bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded ml-2">Required</span>
                                        )}
                                        {item.documentId && (
                                            <span className="block text-[10px] text-brand-600 mt-0.5 flex items-center gap-1">
                                                <FileText size={10} /> Document Linked
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
