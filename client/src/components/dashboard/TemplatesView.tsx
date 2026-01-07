/**
 * Templates Management View
 * CRUD interface for document templates
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { FileText, Plus, Edit, Trash2, Eye, Download, Loader2, Search } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { GradientButton } from '@/components/ui/gradient-button';
import Modal from '@/components/ui/modal';

interface Template {
    id: string;
    name: string;
    documentType: string;
    visaType?: string;
    content: string;
    placeholders: string[];
    language: string;
    createdAt: Date;
    updatedAt: Date;
}

export const TemplatesView: React.FC = () => {
    const { toast } = useToast();
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedType, setSelectedType] = useState('all');
    const [showModal, setShowModal] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
    const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        documentType: '',
        visaType: '',
        content: '',
        language: 'en',
    });

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        try {
            setLoading(true);
            const data = await apiRequest<{ templates: Template[] }>('/templates');
            setTemplates(data.templates || []);
        } catch (error) {
            toast({
                title: 'Failed to Load Templates',
                description: 'Could not retrieve templates. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            if (editingTemplate) {
                await apiRequest(`/templates/${editingTemplate.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify(formData),
                });
                toast({ title: 'Template Updated', description: 'Your changes have been saved.' });
            } else {
                await apiRequest('/templates', {
                    method: 'POST',
                    body: JSON.stringify(formData),
                });
                toast({ title: 'Template Created', description: 'New template has been added.' });
            }
            setShowModal(false);
            setFormData({ name: '', documentType: '', visaType: '', content: '', language: 'en' });
            setEditingTemplate(null);
            loadTemplates();
        } catch (error) {
            toast({
                title: 'Save Failed',
                description: 'Could not save template. Please try again.',
                variant: 'destructive',
            });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this template?')) return;

        try {
            await apiRequest(`/templates/${id}`, { method: 'DELETE' });
            toast({ title: 'Template Deleted', description: 'Template has been removed.' });
            loadTemplates();
        } catch (error) {
            toast({
                title: 'Delete Failed',
                description: 'Could not delete template.',
                variant: 'destructive',
            });
        }
    };

    const handleEdit = (template: Template) => {
        setEditingTemplate(template);
        setFormData({
            name: template.name,
            documentType: template.documentType,
            visaType: template.visaType || '',
            content: template.content,
            language: template.language,
        });
        setShowModal(true);
    };

    const handleDownload = (template: Template) => {
        const blob = new Blob([template.content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${template.name}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const filteredTemplates = templates.filter((t) => {
        const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.documentType.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = selectedType === 'all' || t.documentType === selectedType;
        return matchesSearch && matchesType;
    });

    const documentTypes = ['all', ...Array.from(new Set(templates.map((t) => t.documentType)))];

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
                        Document Templates
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">
                        Manage reusable templates with smart placeholders
                    </p>
                </div>
                <GradientButton onClick={() => { setShowModal(true); setEditingTemplate(null); setFormData({ name: '', documentType: '', visaType: '', content: '', language: 'en' }); }}>
                    <Plus size={20} className="mr-2" />
                    New Template
                </GradientButton>
            </div>

            {/* Filters */}
            <div className="flex gap-4 flex-wrap">
                <div className="flex-1 min-w-[300px] relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search templates..."
                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                </div>
                <div className="flex gap-2">
                    {documentTypes.map((type) => (
                        <button
                            key={type}
                            onClick={() => setSelectedType(type)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${selectedType === type
                                    ? 'bg-brand-600 text-white'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                        >
                            {type === 'all' ? 'All' : type}
                        </button>
                    ))}
                </div>
            </div>

            {/* Templates Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="animate-spin text-brand-600" size={48} />
                </div>
            ) : filteredTemplates.length === 0 ? (
                <GlassCard className="p-20 text-center">
                    <FileText size={64} className="mx-auto mb-4 text-slate-300" />
                    <h3 className="text-2xl font-black text-slate-400 mb-2">No Templates Found</h3>
                    <p className="text-slate-500">Create your first template to get started</p>
                </GlassCard>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence>
                        {filteredTemplates.map((template, index) => (
                            <motion.div
                                key={template.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <GlassCard className="p-6 hover:shadow-xl transition-shadow">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">
                                                {template.name}
                                            </h3>
                                            <p className="text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider">
                                                {template.documentType}
                                            </p>
                                            {template.visaType && (
                                                <p className="text-xs text-slate-500 mt-1">{template.visaType}</p>
                                            )}
                                        </div>
                                        <FileText size={24} className="text-slate-300" />
                                    </div>

                                    <div className="mb-4">
                                        <p className="text-xs font-bold text-slate-500 mb-2">PLACEHOLDERS:</p>
                                        <div className="flex flex-wrap gap-1">
                                            {template.placeholders.slice(0, 3).map((ph) => (
                                                <span
                                                    key={ph}
                                                    className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-mono text-slate-600 dark:text-slate-400"
                                                >
                                                    {`{{${ph}}}`}
                                                </span>
                                            ))}
                                            {template.placeholders.length > 3 && (
                                                <span className="px-2 py-1 text-xs text-slate-400">
                                                    +{template.placeholders.length - 3} more
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setPreviewTemplate(template)}
                                            className="flex-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center gap-2 text-sm font-bold transition-colors"
                                        >
                                            <Eye size={16} />
                                            Preview
                                        </button>
                                        <button
                                            onClick={() => handleEdit(template)}
                                            className="px-3 py-2 rounded-lg bg-brand-100 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 hover:bg-brand-200 dark:hover:bg-brand-900/40 transition-colors"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDownload(template)}
                                            className="px-3 py-2 rounded-lg bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/40 transition-colors"
                                        >
                                            <Download size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(template.id)}
                                            className="px-3 py-2 rounded-lg bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/40 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </GlassCard>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Create/Edit Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => { setShowModal(false); setEditingTemplate(null); }}
                title={editingTemplate ? 'Edit Template' : 'Create Template'}
                size="lg"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                            Template Name
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-brand-500 outline-none"
                            placeholder="e.g., Motivation Letter - Skilled Worker"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                            Document Type
                        </label>
                        <input
                            type="text"
                            value={formData.documentType}
                            onChange={(e) => setFormData({ ...formData, documentType: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-brand-500 outline-none"
                            placeholder="e.g., Motivation Letter"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                            Visa Type (Optional)
                        </label>
                        <input
                            type="text"
                            value={formData.visaType}
                            onChange={(e) => setFormData({ ...formData, visaType: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-brand-500 outline-none"
                            placeholder="e.g., Skilled Worker"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                            Template Content
                        </label>
                        <textarea
                            value={formData.content}
                            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                            rows={12}
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-brand-500 outline-none resize-none"
                            placeholder="Use {{placeholder_name}} for dynamic values. Example: Dear {{company_name}}, I am {{full_name}}..."
                        />
                        <p className="text-xs text-slate-500 mt-2">
                            Use double curly braces for placeholders: {`{{full_name}} {{company}} {{experience}}`}
                        </p>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <GradientButton onClick={handleSave} className="flex-1">
                            {editingTemplate ? 'Update Template' : 'Create Template'}
                        </GradientButton>
                        <button
                            onClick={() => { setShowModal(false); setEditingTemplate(null); }}
                            className="px-6 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Preview Modal */}
            <Modal
                isOpen={!!previewTemplate}
                onClose={() => setPreviewTemplate(null)}
                title={previewTemplate?.name || ''}
                size="lg"
            >
                {previewTemplate && (
                    <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900">
                            <pre className="whitespace-pre-wrap font-mono text-sm text-slate-700 dark:text-slate-300">
                                {previewTemplate.content}
                            </pre>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-500 mb-2">Available Placeholders:</p>
                            <div className="flex flex-wrap gap-2">
                                {previewTemplate.placeholders.map((ph) => (
                                    <span
                                        key={ph}
                                        className="px-3 py-1 rounded-lg bg-brand-100 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 font-mono text-sm"
                                    >
                                        {`{{${ph}}}`}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default TemplatesView;
