import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { LiveButton, AnimatedCard } from "@/components/ui/live-elements";
import {
    FileText,
    Save,
    Trash2,
    Copy,
    Plus,
    Loader2,
    FolderOpen,
    Sparkles,
    Edit3
} from "lucide-react";

interface DocumentTemplate {
    id: string;
    name: string;
    type: 'motivation_letter' | 'cv' | 'employer_letter' | 'cover_letter' | 'other';
    content: string;
    metadata?: Record<string, any>;
    createdAt: string;
    updatedAt: string;
}

const TEMPLATE_TYPES = (t: any) => [
    { id: 'motivation_letter', label: t.templates.types.motivation, icon: '📝' },
    { id: 'cv', label: t.templates.types.cv, icon: '📄' },
    { id: 'employer_letter', label: t.templates.types.employer, icon: '🏢' },
    { id: 'cover_letter', label: t.templates.types.cover, icon: '✉️' },
    { id: 'other', label: t.templates.types.other, icon: '📋' },
];

export const SavedTemplatesView = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const { t } = useI18n();
    const types = TEMPLATE_TYPES(t);
    const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showEditor, setShowEditor] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        type: 'motivation_letter' as DocumentTemplate['type'],
        content: '',
    });

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = () => {
        try {
            setLoading(true);
            const saved = localStorage.getItem('immigrationai_templates');
            if (saved) {
                setTemplates(JSON.parse(saved));
            }
        } catch (err) {
            setTemplates([]);
        } finally {
            setLoading(false);
        }
    };

    const saveToStorage = (newTemplates: DocumentTemplate[]) => {
        localStorage.setItem('immigrationai_templates', JSON.stringify(newTemplates));
        setTemplates(newTemplates);
    };

    const handleSave = () => {
        if (!formData.name.trim() || !formData.content.trim()) {
            toast({
                title: t.templates.validationError,
                description: t.templates.validationError,
                variant: "destructive",
            });
            return;
        }

        setSaving(true);
        try {
            const now = new Date().toISOString();
            if (editingTemplate) {
                // Update existing
                const updated = templates.map(t =>
                    t.id === editingTemplate.id
                        ? { ...t, ...formData, updatedAt: now }
                        : t
                );
                saveToStorage(updated);
            } else {
                // Create new
                const newTemplate: DocumentTemplate = {
                    id: `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                    name: formData.name,
                    type: formData.type,
                    content: formData.content,
                    createdAt: now,
                    updatedAt: now,
                };
                saveToStorage([newTemplate, ...templates]);
            }

            toast({
                title: editingTemplate ? t.templates.templateUpdated : t.templates.templateSaved,
                description: `"${formData.name}" ${t.common.success}`,
                className: "bg-green-50 text-green-900 border-green-200",
            });

            setShowEditor(false);
            setEditingTemplate(null);
            setFormData({ name: '', type: 'motivation_letter', content: '' });
        } catch (err) {
            toast({
                title: t.common.error,
                description: t.error.message,
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (id: string) => {
        if (!confirm(t.templates.deleteConfirm)) return;

        try {
            saveToStorage(templates.filter(t => t.id !== id));
            toast({
                title: t.templates.templateDeleted,
                className: "bg-red-50 text-red-900 border-red-200",
            });
        } catch (err) {
            toast({
                title: t.common.error,
                description: t.error.message,
                variant: "destructive",
            });
        }
    };

    const handleEdit = (template: DocumentTemplate) => {
        setEditingTemplate(template);
        setFormData({
            name: template.name,
            type: template.type,
            content: template.content,
        });
        setShowEditor(true);
    };

    const handleUseTemplate = async (template: DocumentTemplate) => {
        toast({
            title: t.templates.useAI,
            description: `${t.templates.useAI} "${template.name}"`,
            className: "bg-blue-50 text-blue-900 border-blue-200",
        });
    };

    const getTypeInfo = (type: string) => {
        return types.find(it => it.id === type) || types[4];
    };

    if (loading) {
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center p-12">
                <Loader2 className="animate-spin text-brand-600" size={32} />
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                        <FolderOpen className="text-brand-600 w-8 h-8" />
                        {t.templates.title}
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium max-w-2xl">
                        {t.templates.desc}
                    </p>
                </div>
                <LiveButton
                    variant="primary"
                    className="bg-brand-600 hover:bg-brand-700 shadow-xl shadow-brand-500/20 px-8 py-4 rounded-2xl"
                    onClick={() => {
                        setEditingTemplate(null);
                        setFormData({ name: '', type: 'motivation_letter', content: '' });
                        setShowEditor(true);
                    }}
                >
                    <Plus size={18} /> {t.templates.new}
                </LiveButton>
            </div>

            {/* Editor Modal */}
            {showEditor && (
                <AnimatedCard className="glass-premium p-8 rounded-3xl border-none shadow-2xl mb-12">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-8 border-b border-slate-100 dark:border-slate-800 pb-4">
                        {editingTemplate ? t.templates.edit : t.templates.create}
                    </h3>

                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-3">
                                    {t.templates.name} *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder={t.templates.namePlaceholder}
                                    className="w-full px-6 py-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-4 focus:ring-brand-500/20 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-3">
                                    {t.templates.type}
                                </label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                                    className="w-full px-6 py-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-brand-500/20 transition-all appearance-none"
                                >
                                    {types.map(type => (
                                        <option key={type.id} value={type.id}>
                                            {type.icon} {type.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-3">
                                {t.templates.content} *
                            </label>
                            <textarea
                                value={formData.content}
                                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                placeholder={t.templates.contentPlaceholder}
                                rows={10}
                                className="w-full px-6 py-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 text-slate-900 dark:text-white font-mono text-sm placeholder-slate-400 focus:ring-4 focus:ring-brand-500/20 outline-none transition-all shadow-inner"
                            />
                            <p className="text-xs font-medium text-slate-500 mt-3 flex items-center gap-2 italic">
                                <Sparkles size={12} className="text-brand-500" /> {t.templates.tip}
                            </p>
                        </div>

                        <div className="flex gap-4">
                            <LiveButton variant="primary" onClick={handleSave} loading={saving} disabled={saving}>
                                <Save size={16} /> {saving ? 'Saving...' : 'Save Template'}
                            </LiveButton>
                            <LiveButton variant="ghost" onClick={() => setShowEditor(false)}>
                                Cancel
                            </LiveButton>
                        </div>
                    </div>
                </AnimatedCard>
            )}

            {/* Templates Grid */}
            {templates.length === 0 && !showEditor ? (
                <AnimatedCard className="text-center py-20 glass-premium rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                    <FileText className="w-20 h-20 mx-auto mb-6 text-slate-200 dark:text-slate-800" />
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3">{t.templates.noTemplates}</h3>
                    <p className="text-slate-500 dark:text-slate-400 mb-10 max-w-md mx-auto leading-relaxed">
                        {t.templates.desc}
                    </p>
                    <LiveButton
                        variant="primary"
                        className="bg-brand-600 hover:bg-brand-700 px-10 py-5 scale-110"
                        onClick={() => setShowEditor(true)}
                    >
                        <Plus size={18} /> {t.templates.firstTemplate}
                    </LiveButton>
                </AnimatedCard>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {templates.map((template, index) => {
                        const typeInfo = getTypeInfo(template.type);
                        return (
                            <motion.div
                                key={template.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <AnimatedCard className="h-full glass-premium p-6 rounded-3xl border-none shadow-lg hover:shadow-2xl transition-all cursor-pointer group hover:-translate-y-2">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center text-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                                            {typeInfo.icon}
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 border border-brand-100 dark:border-brand-800 shadow-sm">
                                            {typeInfo.label}
                                        </span>
                                    </div>

                                    <h4 className="text-lg font-black text-slate-900 dark:text-white mb-3 line-clamp-1 group-hover:text-brand-600 transition-colors">
                                        {template.name}
                                    </h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">
                                        {template.content.slice(0, 100)}...
                                    </p>

                                    <div className="flex items-center justify-between pt-5 border-t border-slate-100 dark:border-slate-800/50">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            {new Date(template.updatedAt).toLocaleDateString()}
                                        </span>
                                        <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                                            <button
                                                onClick={() => handleUseTemplate(template)}
                                                className="w-10 h-10 rounded-xl bg-brand-500 text-white flex items-center justify-center hover:bg-brand-600 shadow-lg shadow-brand-500/20 active:scale-90 transition-all"
                                                title={t.templates.useAI}
                                            >
                                                <Sparkles size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleEdit(template)}
                                                className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center hover:bg-slate-200 active:scale-90 transition-all"
                                                title={t.common.edit}
                                            >
                                                <Edit3 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(template.id)}
                                                className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center hover:bg-red-100 active:scale-90 transition-all"
                                                title={t.common.delete}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </AnimatedCard>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </motion.div>
    );
};
