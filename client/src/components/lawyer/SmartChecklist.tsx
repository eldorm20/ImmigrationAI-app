import React, { useState } from 'react';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ClipboardList, User, RefreshCw, Check, Plus, Bell, FileCheck, Upload,
    ChevronDown, ChevronRight, Folder, AlertCircle, CheckCircle2, Clock, Sparkles
} from 'lucide-react';
import { AnimatedCard, LiveButton, GlassSelect } from '@/components/ui/live-elements';
import { motion, AnimatePresence } from 'framer-motion';

interface ChecklistTemplate {
    visaType: string;
    totalItems: number;
    categories: number;
}

interface Checklist {
    id: string;
    title: string;
    description?: string;
    visaType?: string;
    isAIGenerated?: boolean;
    status: string;
    totalItems: number;
    completedItems: number;
    progress: number;
    createdAt: string;
}

interface ChecklistItem {
    id: string;
    title: string;
    category?: string;
    isRequired: boolean;
    validationRule?: string;
    status: string;
    documentUrl?: string;
    notes?: string;
}

export default function SmartChecklist() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [selectedClient, setSelectedClient] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [expandedChecklist, setExpandedChecklist] = useState<string | null>(null);
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

    // Fetch templates
    const { data: templatesData } = useQuery({
        queryKey: ['smart-checklist-templates'],
        queryFn: () => apiRequest<{ templates: ChecklistTemplate[] }>('/smart-checklists/templates'),
    });

    // Fetch clients
    const { data: clientsData } = useQuery({
        queryKey: ['clients-for-checklist'],
        queryFn: () => apiRequest<{ clients: any[] }>('/clients'),
    });

    // Fetch checklists for selected client
    const { data: checklistsData, refetch: refetchChecklists } = useQuery({
        queryKey: ['client-checklists', selectedClient],
        queryFn: () => apiRequest<{ checklists: Checklist[] }>(`/smart-checklists/client/${selectedClient}`),
        enabled: !!selectedClient,
    });

    // Fetch checklist details
    const { data: checklistDetails } = useQuery({
        queryKey: ['checklist-details', expandedChecklist],
        queryFn: () => apiRequest<{ checklist: any; items: ChecklistItem[]; groupedItems: Record<string, ChecklistItem[]> }>(
            `/smart-checklists/${expandedChecklist}`
        ),
        enabled: !!expandedChecklist,
    });

    // Generate checklist mutation
    const generateMutation = useMutation({
        mutationFn: (data: { clientId: string; visaType: string }) =>
            apiRequest('/smart-checklists/generate', { method: 'POST', body: JSON.stringify(data) }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['client-checklists', selectedClient] });
            toast({ title: 'Checklist Generated', description: 'AI has created a personalized document checklist.' });
            setSelectedTemplate('');
        },
        onError: (err: any) => {
            toast({ title: 'Error', description: err.message || 'Failed to generate checklist', variant: 'destructive' });
        }
    });

    // Update item status mutation
    const updateItemMutation = useMutation({
        mutationFn: ({ itemId, status }: { itemId: string; status: string }) =>
            apiRequest(`/smart-checklists/item/${itemId}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['checklist-details', expandedChecklist] });
            queryClient.invalidateQueries({ queryKey: ['client-checklists', selectedClient] });
        }
    });

    // Send reminder mutation
    const remindMutation = useMutation({
        mutationFn: (checklistId: string) =>
            apiRequest(`/smart-checklists/${checklistId}/remind`, { method: 'POST' }),
        onSuccess: () => {
            toast({ title: 'Reminder Sent', description: 'Client has been notified of pending documents.' });
        }
    });

    const templates = templatesData?.templates || [];
    const clients = clientsData?.clients || [];
    const checklists = checklistsData?.checklists || [];
    const groupedItems = checklistDetails?.groupedItems || {};

    const handleGenerate = () => {
        if (!selectedClient || !selectedTemplate) {
            toast({ title: 'Missing Selection', description: 'Please select a client and visa type.', variant: 'destructive' });
            return;
        }
        generateMutation.mutate({ clientId: selectedClient, visaType: selectedTemplate });
    };

    const toggleCategory = (category: string) => {
        const newExpanded = new Set(expandedCategories);
        if (newExpanded.has(category)) {
            newExpanded.delete(category);
        } else {
            newExpanded.add(category);
        }
        setExpandedCategories(newExpanded);
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
            case 'approved':
                return <CheckCircle2 size={16} className="text-emerald-600" />;
            case 'uploaded':
                return <Clock size={16} className="text-amber-600" />;
            case 'rejected':
                return <AlertCircle size={16} className="text-rose-600" />;
            default:
                return <div className="w-4 h-4 rounded-full border-2 border-slate-300" />;
        }
    };

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="flex justify-between items-center bg-white/30 dark:bg-slate-900/30 backdrop-blur-md p-6 rounded-3xl border border-white/20 dark:border-white/5 shadow-xl">
                <div>
                    <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                        <ClipboardList className="text-brand-500" size={32} />
                        AI Document Collector
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Smart checklists with AI-powered recommendations</p>
                </div>
            </div>

            {/* Client & Template Selection */}
            <div className="grid md:grid-cols-3 gap-6">
                <AnimatedCard className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                            <User size={20} className="text-blue-600" />
                        </div>
                        <h3 className="font-bold text-slate-900 dark:text-white">Select Client</h3>
                    </div>
                    <GlassSelect
                        value={selectedClient}
                        onChange={e => {
                            setSelectedClient(e.target.value);
                            setExpandedChecklist(null);
                        }}
                        className="w-full"
                    >
                        <option value="">Select a client...</option>
                        {clients.map((c: any) => (
                            <option key={c.id} value={c.id}>
                                {c.firstName} {c.lastName}
                            </option>
                        ))}
                    </GlassSelect>
                </AnimatedCard>

                <AnimatedCard className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                            <Folder size={20} className="text-purple-600" />
                        </div>
                        <h3 className="font-bold text-slate-900 dark:text-white">Visa Type</h3>
                    </div>
                    <GlassSelect
                        value={selectedTemplate}
                        onChange={e => setSelectedTemplate(e.target.value)}
                        className="w-full"
                    >
                        <option value="">Select visa type...</option>
                        {templates.map((t) => (
                            <option key={t.visaType} value={t.visaType}>
                                {t.visaType.replace(/_/g, ' ').toUpperCase()} ({t.totalItems} docs)
                            </option>
                        ))}
                    </GlassSelect>
                </AnimatedCard>

                <AnimatedCard className="p-6 flex items-center justify-center">
                    <LiveButton
                        onClick={handleGenerate}
                        disabled={!selectedClient || !selectedTemplate || generateMutation.isPending}
                        icon={generateMutation.isPending ? RefreshCw : Sparkles}
                        size="lg"
                        className="w-full"
                    >
                        {generateMutation.isPending ? 'Generating...' : 'Generate Smart Checklist'}
                    </LiveButton>
                </AnimatedCard>
            </div>

            {/* Existing Checklists */}
            {selectedClient && (
                <AnimatedCard className="p-0 overflow-hidden">
                    <div className="p-6 bg-gradient-to-r from-brand-600 to-indigo-600">
                        <h3 className="text-xl font-black text-white">Client's Checklists</h3>
                        <p className="text-brand-100 text-sm">{checklists.length} checklist(s) found</p>
                    </div>

                    {checklists.length === 0 ? (
                        <div className="p-12 text-center">
                            <ClipboardList size={48} className="mx-auto text-slate-200 dark:text-slate-700 mb-4" />
                            <p className="text-slate-500 font-medium">No checklists yet. Generate one above!</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {checklists.map((checklist) => (
                                <div key={checklist.id}>
                                    {/* Checklist Header */}
                                    <div
                                        className="p-6 flex items-center gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors"
                                        onClick={() => setExpandedChecklist(expandedChecklist === checklist.id ? null : checklist.id)}
                                    >
                                        <motion.div
                                            animate={{ rotate: expandedChecklist === checklist.id ? 90 : 0 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <ChevronRight size={20} className="text-slate-400" />
                                        </motion.div>

                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-slate-900 dark:text-white">{checklist.title}</h4>
                                                {checklist.isAIGenerated && (
                                                    <span className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-[10px] font-bold">
                                                        AI Generated
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-slate-500">{checklist.completedItems}/{checklist.totalItems} completed</p>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="w-32 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all ${checklist.progress === 100 ? 'bg-emerald-500' :
                                                        checklist.progress > 50 ? 'bg-amber-500' : 'bg-brand-500'
                                                    }`}
                                                style={{ width: `${checklist.progress}%` }}
                                            />
                                        </div>
                                        <span className="text-sm font-bold text-slate-600">{checklist.progress}%</span>

                                        <LiveButton
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                remindMutation.mutate(checklist.id);
                                            }}
                                            icon={Bell}
                                        >
                                            Remind
                                        </LiveButton>
                                    </div>

                                    {/* Expanded Checklist Items */}
                                    <AnimatePresence>
                                        {expandedChecklist === checklist.id && checklistDetails && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="bg-slate-50 dark:bg-slate-900/20 border-t border-slate-100 dark:border-slate-800"
                                            >
                                                <div className="p-6 space-y-4">
                                                    {Object.entries(groupedItems).map(([category, items]) => (
                                                        <div key={category} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                                                            <div
                                                                className="p-4 bg-white dark:bg-slate-800 flex items-center gap-3 cursor-pointer"
                                                                onClick={() => toggleCategory(category)}
                                                            >
                                                                <motion.div
                                                                    animate={{ rotate: expandedCategories.has(category) ? 90 : 0 }}
                                                                >
                                                                    <ChevronRight size={18} className="text-slate-400" />
                                                                </motion.div>
                                                                <Folder size={18} className="text-brand-500" />
                                                                <span className="font-bold text-slate-900 dark:text-white">{category}</span>
                                                                <span className="text-xs text-slate-500">({items.length} items)</span>
                                                            </div>

                                                            <AnimatePresence>
                                                                {expandedCategories.has(category) && (
                                                                    <motion.div
                                                                        initial={{ height: 0 }}
                                                                        animate={{ height: 'auto' }}
                                                                        exit={{ height: 0 }}
                                                                        className="overflow-hidden"
                                                                    >
                                                                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                                                            {items.map((item: ChecklistItem) => (
                                                                                <div key={item.id} className="p-4 flex items-center gap-4 bg-white/50 dark:bg-slate-800/50">
                                                                                    <button
                                                                                        onClick={() => updateItemMutation.mutate({
                                                                                            itemId: item.id,
                                                                                            status: item.status === 'completed' ? 'pending' : 'completed'
                                                                                        })}
                                                                                        className="flex-shrink-0"
                                                                                    >
                                                                                        {getStatusIcon(item.status)}
                                                                                    </button>
                                                                                    <div className="flex-1">
                                                                                        <p className={`font-medium ${item.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-white'
                                                                                            }`}>
                                                                                            {item.title}
                                                                                        </p>
                                                                                        {item.validationRule && (
                                                                                            <p className="text-xs text-amber-600 mt-1">
                                                                                                ⚠️ {item.validationRule}
                                                                                            </p>
                                                                                        )}
                                                                                    </div>
                                                                                    {item.isRequired && (
                                                                                        <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 text-[10px] font-bold">
                                                                                            REQUIRED
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            ))}
                        </div>
                    )}
                </AnimatedCard>
            )}

            {/* Empty State */}
            {!selectedClient && (
                <AnimatedCard className="p-12 text-center">
                    <User size={48} className="mx-auto text-slate-200 dark:text-slate-700 mb-4" />
                    <h3 className="text-lg font-bold text-slate-600 dark:text-slate-400 mb-2">Select a Client</h3>
                    <p className="text-sm text-slate-500">Choose a client to view or create document checklists</p>
                </AnimatedCard>
            )}
        </div>
    );
}
