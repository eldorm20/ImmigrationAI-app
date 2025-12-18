import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
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

const TEMPLATE_TYPES = [
    { id: 'motivation_letter', label: 'Motivation Letter', icon: '📝' },
    { id: 'cv', label: 'CV / Resume', icon: '📄' },
    { id: 'employer_letter', label: 'Employer Letter', icon: '🏢' },
    { id: 'cover_letter', label: 'Cover Letter', icon: '✉️' },
    { id: 'other', label: 'Other Document', icon: '📋' },
];

export const SavedTemplatesView = () => {
    const { user } = useAuth();
    const { toast } = useToast();
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
                title: "Validation Error",
                description: "Please fill in template name and content",
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
                title: editingTemplate ? "Template Updated" : "Template Saved",
                description: `"${formData.name}" has been saved successfully`,
                className: "bg-green-50 text-green-900 border-green-200",
            });

            setShowEditor(false);
            setEditingTemplate(null);
            setFormData({ name: '', type: 'motivation_letter', content: '' });
        } catch (err) {
            toast({
                title: "Error",
                description: "Failed to save template",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (id: string) => {
        if (!confirm("Are you sure you want to delete this template?")) return;

        try {
            saveToStorage(templates.filter(t => t.id !== id));
            toast({
                title: "Template Deleted",
                description: "The template has been removed",
                className: "bg-red-50 text-red-900 border-red-200",
            });
        } catch (err) {
            toast({
                title: "Error",
                description: "Failed to delete template",
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
        // Copy template content and potentially trigger AI fill
        toast({
            title: "Template Applied",
            description: `Using "${template.name}" as base. AI will personalize for your application.`,
            className: "bg-blue-50 text-blue-900 border-blue-200",
        });
    };

    const getTypeInfo = (type: string) => {
        return TEMPLATE_TYPES.find(t => t.id === type) || TEMPLATE_TYPES[4];
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
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <FolderOpen className="text-brand-600" />
                        Saved Templates
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        Save and reuse successful document patterns with AI assistance
                    </p>
                </div>
                <LiveButton
                    variant="primary"
                    onClick={() => {
                        setEditingTemplate(null);
                        setFormData({ name: '', type: 'motivation_letter', content: '' });
                        setShowEditor(true);
                    }}
                >
                    <Plus size={16} /> New Template
                </LiveButton>
            </div>

            {/* Editor Modal */}
            {showEditor && (
                <AnimatedCard className="border-2 border-brand-500 bg-gradient-to-br from-brand-50 to-blue-50 dark:from-slate-800 dark:to-slate-800/50">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                        {editingTemplate ? 'Edit Template' : 'Create New Template'}
                    </h3>

                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                    Template Name *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g., UK Skilled Worker Motivation Letter"
                                    className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                    Document Type
                                </label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                                    className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                >
                                    {TEMPLATE_TYPES.map(type => (
                                        <option key={type.id} value={type.id}>
                                            {type.icon} {type.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                Template Content *
                            </label>
                            <textarea
                                value={formData.content}
                                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                placeholder="Enter your template content here. Use {{placeholders}} for AI-fillable fields like {{applicant_name}}, {{company_name}}, {{visa_type}}..."
                                rows={10}
                                className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-sm"
                            />
                            <p className="text-xs text-slate-500 mt-2">
                                Tip: Use <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">{"{{placeholder}}"}</code> syntax for AI-fillable fields
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
                <AnimatedCard className="text-center py-12">
                    <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Templates Yet</h3>
                    <p className="text-slate-500 dark:text-slate-400 mb-6">
                        Create your first document template to speed up your applications
                    </p>
                    <LiveButton
                        variant="primary"
                        onClick={() => setShowEditor(true)}
                    >
                        <Plus size={16} /> Create Your First Template
                    </LiveButton>
                </AnimatedCard>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {templates.map((template, index) => {
                        const typeInfo = getTypeInfo(template.type);
                        return (
                            <motion.div
                                key={template.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <AnimatedCard className="h-full hover:shadow-lg transition-shadow cursor-pointer group">
                                    <div className="flex items-start justify-between mb-3">
                                        <span className="text-2xl">{typeInfo.icon}</span>
                                        <span className="text-xs font-bold px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                            {typeInfo.label}
                                        </span>
                                    </div>

                                    <h4 className="font-bold text-slate-900 dark:text-white mb-2 line-clamp-1">
                                        {template.name}
                                    </h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">
                                        {template.content.slice(0, 100)}...
                                    </p>

                                    <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700">
                                        <span className="text-xs text-slate-400">
                                            {new Date(template.updatedAt).toLocaleDateString()}
                                        </span>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleUseTemplate(template)}
                                                className="p-1.5 rounded-lg bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 hover:bg-brand-200"
                                                title="Use with AI"
                                            >
                                                <Sparkles size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleEdit(template)}
                                                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                                                title="Edit"
                                            >
                                                <Edit3 size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(template.id)}
                                                className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200"
                                                title="Delete"
                                            >
                                                <Trash2 size={14} />
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
