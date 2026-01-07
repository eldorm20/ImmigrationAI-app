import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import {
    FileText, Plus, Search, Trash2, Edit, Copy, ChevronRight, BookOpen,
    Filter, Layout, Sparkles, Send, Download, MoreHorizontal, CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LiveButton, AnimatedCard, GlassInput, GlassSelect } from '@/components/ui/live-elements';
import { Badge } from '@/components/ui/badge';

export default function DocumentTemplates() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: 'contract',
        content: '',
    });

    // Fetch Templates
    const { data: templates = [], isLoading } = useQuery<any[]>({
        queryKey: ['/api/templates'],
        queryFn: async () => {
            return apiRequest('/templates');
        }
    });

    // Create Template Mutation
    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            return apiRequest('/templates', {
                method: 'POST',
                body: JSON.stringify(data)
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/templates'] });
            setIsCreateOpen(false);
            resetForm();
            toast({ title: 'Template Protocol Saved', description: 'Institutional knowledge bank updated.' });
        },
        onError: () => {
            toast({ title: 'System Error', description: 'Template ingestion failed.', variant: 'destructive' });
        }
    });

    const resetForm = () => {
        setFormData({ title: '', description: '', category: 'contract', content: '' });
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title || !formData.content) {
            toast({ title: 'Validation Failed', description: 'Core descriptors and content are mandatory.', variant: 'destructive' });
            return;
        }
        createMutation.mutate(formData);
    };

    const categories = ['contract', 'letter', 'form', 'email', 'other'];

    const filteredTemplates = (templates || []).filter((t: any) => {
        const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const getCategoryStyles = (cat: string) => {
        switch (cat) {
            case 'contract': return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400";
            case 'letter': return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400";
            case 'form': return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400";
            case 'email': return "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400";
            default: return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400";
        }
    };

    return (
        <div className="space-y-8 pb-12">
            <div className="flex justify-between items-center bg-white/30 dark:bg-slate-900/30 backdrop-blur-md p-6 rounded-3xl border border-white/20 dark:border-white/5 shadow-xl">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/30">
                        <BookOpen size={24} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Strategy Bank</h2>
                        <p className="text-slate-500 dark:text-slate-400 font-medium">Standardized templates and legal protocols</p>
                    </div>
                </div>
                <LiveButton onClick={() => setIsCreateOpen(true)} icon={Plus} size="lg" className="rounded-2xl">
                    Publish Template
                </LiveButton>
            </div>

            <div className="flex flex-col md:flex-row justify-between gap-4 items-center">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <GlassInput
                        placeholder="Search institutional archives..."
                        className="pl-12 w-full"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none w-full md:w-auto">
                    <button
                        onClick={() => setSelectedCategory('all')}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedCategory === 'all'
                            ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30'
                            : 'bg-white/50 dark:bg-slate-900/50 text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                            }`}
                    >
                        Global
                    </button>
                    {categories.map(c => (
                        <button
                            key={c}
                            onClick={() => setSelectedCategory(c)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedCategory === c
                                ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30'
                                : 'bg-white/50 dark:bg-slate-900/50 text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                }`}
                        >
                            {c}
                        </button>
                    ))}
                </div>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-64 rounded-3xl bg-white/20 dark:bg-slate-900/20 animate-pulse border border-white/10"></div>
                    ))}
                </div>
            ) : filteredTemplates.length === 0 ? (
                <div className="text-center py-32 bg-white/20 dark:bg-slate-900/20 rounded-[40px] border-2 border-dashed border-white/10">
                    <div className="max-w-xs mx-auto space-y-4">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto text-slate-400">
                            <FileText size={32} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white">Archive Empty</h3>
                        <p className="text-sm text-slate-500 font-medium leading-relaxed">No protocols discovered matching your current filter parameters.</p>
                        <LiveButton variant="ghost" onClick={() => setSelectedCategory('all')} size="sm">Reset Filter</LiveButton>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <AnimatePresence>
                        {filteredTemplates.map((template: any, idx: number) => (
                            <motion.div
                                key={template.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                            >
                                <AnimatedCard className="h-full bg-white dark:bg-slate-900 border-none shadow-xl hover:shadow-brand-500/10 p-8 flex flex-col group rounded-[32px] overflow-hidden">
                                    <div className="absolute top-0 right-0 p-16 bg-gradient-to-tr from-brand-600/5 to-transparent rounded-full blur-2xl group-hover:bg-brand-600/10 transition-colors"></div>

                                    <div className="relative z-10 flex flex-col h-full">
                                        <div className="flex justify-between items-start mb-6">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getCategoryStyles(template.category)}`}>
                                                {template.category}
                                            </span>
                                            {template.isSystem && (
                                                <span className="flex items-center gap-1.5 text-[8px] font-black text-brand-600 uppercase tracking-widest bg-brand-50 dark:bg-brand-900/20 px-2 py-1 rounded-lg">
                                                    <Sparkles size={10} /> CORE PROTOCOL
                                                </span>
                                            )}
                                        </div>

                                        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3 group-hover:text-brand-600 transition-colors line-clamp-2">{template.title}</h3>
                                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed mb-auto line-clamp-3">
                                            {template.description || "Foundational legal framework for practice implementation."}
                                        </p>

                                        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/50 flex flex-col gap-4">
                                            <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                <span>Revision {formatDate(template.updatedAt)}</span>
                                                <span className="flex items-center gap-1"><Layout size={12} className="text-brand-500" /> V1.0</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <LiveButton variant="ghost" size="sm" className="flex-1 text-[10px] uppercase font-black tracking-widest">
                                                    <Copy size={14} className="mr-2" /> Utilize
                                                </LiveButton>
                                                <LiveButton variant="ghost" size="sm" className="w-12 p-0 flex items-center justify-center">
                                                    <MoreHorizontal size={18} />
                                                </LiveButton>
                                            </div>
                                        </div>
                                    </div>
                                </AnimatedCard>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Create Modal */}
            <AnimatePresence>
                {isCreateOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
                            onClick={() => setIsCreateOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl w-full max-w-4xl overflow-hidden relative z-10 border border-white/10"
                        >
                            <form onSubmit={handleCreate} className="flex flex-col h-[90vh]">
                                <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-brand-600 to-indigo-600">
                                    <h3 className="font-black text-2xl text-white">Capture Legal Protocol</h3>
                                    <p className="text-brand-100 text-sm font-medium">Define a new standardized template for therategy bank</p>
                                </div>

                                <div className="flex-1 overflow-y-auto p-10 space-y-8">
                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Template Identifer</label>
                                            <GlassInput required placeholder="Unique Title..." className="w-full"
                                                value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Classification Target</label>
                                            <GlassSelect value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full">
                                                {categories.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                                            </GlassSelect>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Functional Abstract</label>
                                        <GlassInput placeholder="Contextual guidelines for utilization..." className="w-full"
                                            value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Contextual Body (Dynamic)</label>
                                            <span className="text-[10px] font-bold text-brand-500 bg-brand-50 dark:bg-brand-900/30 px-2 py-0.5 rounded uppercase tracking-tighter transition-all">Support Dynamic Injection {'{{'}VAR{'}}'}</span>
                                        </div>
                                        <textarea
                                            className="w-full min-h-[400px] p-6 bg-slate-50 dark:bg-slate-950/50 rounded-3xl border border-slate-100 dark:border-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-none font-mono text-sm leading-relaxed"
                                            placeholder="Specify legal text framework..."
                                            value={formData.content}
                                            onChange={e => setFormData({ ...formData, content: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-4 bg-slate-50/50 dark:bg-slate-900/50">
                                    <LiveButton variant="ghost" type="button" onClick={() => setIsCreateOpen(false)}>Discard</LiveButton>
                                    <LiveButton icon={CheckCircle} className="px-12" type="submit" loading={createMutation.isPending}>
                                        Commit to Archive
                                    </LiveButton>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

function formatDate(date: string) {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
