import React, { useState } from 'react';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
    FileText, Download, Copy, User, RefreshCw, Check, ChevronDown,
    Sparkles, ClipboardList, FileCheck, AlertCircle
} from 'lucide-react';
import { AnimatedCard, LiveButton, GlassSelect } from '@/components/ui/live-elements';
import { motion, AnimatePresence } from 'framer-motion';

interface FormTemplate {
    id: string;
    name: string;
    fieldCount: number;
    documentsRequired: number;
}

interface GeneratedForm {
    success: boolean;
    template: string;
    formData: Record<string, string>;
    requiredDocuments: string[];
    generatedAt: string;
    note?: string;
}

export default function FormPreFill() {
    const { toast } = useToast();
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [selectedClient, setSelectedClient] = useState('');
    const [generatedForm, setGeneratedForm] = useState<GeneratedForm | null>(null);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    // Fetch templates
    const { data: templatesData } = useQuery({
        queryKey: ['form-prefill-templates'],
        queryFn: () => apiRequest<{ templates: FormTemplate[] }>('/form-prefill/templates'),
    });

    // Fetch clients
    const { data: clientsData } = useQuery({
        queryKey: ['clients-for-form'],
        queryFn: () => apiRequest<{ clients: any[] }>('/clients'),
    });

    // Generate mutation
    const generateMutation = useMutation({
        mutationFn: (data: { clientId: string; templateId: string }) =>
            apiRequest<GeneratedForm>('/form-prefill/generate', {
                method: 'POST',
                body: JSON.stringify(data)
            }),
        onSuccess: (data) => {
            setGeneratedForm(data);
            toast({ title: 'Form Generated', description: 'AI has pre-filled the form with available data.' });
        },
        onError: (err: any) => {
            toast({ title: 'Error', description: err.message || 'Failed to generate form', variant: 'destructive' });
        }
    });

    const templates = templatesData?.templates || [];
    const clients = clientsData?.clients || [];

    const handleGenerate = () => {
        if (!selectedClient || !selectedTemplate) {
            toast({ title: 'Missing Selection', description: 'Please select both a client and form template.', variant: 'destructive' });
            return;
        }
        generateMutation.mutate({ clientId: selectedClient, templateId: selectedTemplate });
    };

    const handleCopyField = (field: string, value: string) => {
        navigator.clipboard.writeText(value);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleCopyAll = () => {
        if (!generatedForm) return;
        const text = Object.entries(generatedForm.formData)
            .map(([key, value]) => `${key.replace(/([A-Z])/g, ' $1').trim()}: ${value}`)
            .join('\n');
        navigator.clipboard.writeText(text);
        toast({ title: 'Copied', description: 'All form data copied to clipboard.' });
    };

    const handleExportText = async () => {
        if (!generatedForm) return;
        try {
            const response = await fetch('/api/form-prefill/export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    formData: generatedForm.formData,
                    templateId: selectedTemplate,
                    format: 'text'
                })
            });
            const text = await response.text();
            const blob = new Blob([text], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${generatedForm.template.replace(/\s+/g, '_')}_form.txt`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            toast({ title: 'Export Failed', variant: 'destructive' });
        }
    };

    const isRequired = (value: string) => value.startsWith('[REQUIRED');

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="flex justify-between items-center bg-white/30 dark:bg-slate-900/30 backdrop-blur-md p-6 rounded-3xl border border-white/20 dark:border-white/5 shadow-xl">
                <div>
                    <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                        <Sparkles className="text-brand-500" size={32} />
                        Form Pre-Fill AI
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Auto-fill visa forms with client data</p>
                </div>
            </div>

            {/* Selection Cards */}
            <div className="grid md:grid-cols-2 gap-6">
                <AnimatedCard className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                            <User size={20} className="text-blue-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white">Select Client</h3>
                            <p className="text-xs text-slate-500">Choose whose data to pre-fill</p>
                        </div>
                    </div>
                    <GlassSelect
                        value={selectedClient}
                        onChange={e => setSelectedClient(e.target.value)}
                        className="w-full"
                    >
                        <option value="">Select a client...</option>
                        {clients.map((c: any) => (
                            <option key={c.id} value={c.id}>
                                {c.firstName} {c.lastName} ({c.email})
                            </option>
                        ))}
                    </GlassSelect>
                </AnimatedCard>

                <AnimatedCard className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                            <FileText size={20} className="text-purple-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white">Select Form Template</h3>
                            <p className="text-xs text-slate-500">Choose visa application type</p>
                        </div>
                    </div>
                    <GlassSelect
                        value={selectedTemplate}
                        onChange={e => setSelectedTemplate(e.target.value)}
                        className="w-full"
                    >
                        <option value="">Select a template...</option>
                        {templates.map((t) => (
                            <option key={t.id} value={t.id}>
                                {t.name} ({t.fieldCount} fields)
                            </option>
                        ))}
                    </GlassSelect>
                </AnimatedCard>
            </div>

            {/* Generate Button */}
            <div className="flex justify-center">
                <LiveButton
                    onClick={handleGenerate}
                    disabled={!selectedClient || !selectedTemplate || generateMutation.isPending}
                    icon={generateMutation.isPending ? RefreshCw : Sparkles}
                    size="lg"
                    className="px-12 rounded-2xl"
                >
                    {generateMutation.isPending ? 'Generating...' : 'Generate Pre-Filled Form'}
                </LiveButton>
            </div>

            {/* Generated Form Display */}
            <AnimatePresence>
                {generatedForm && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        <AnimatedCard className="p-0 overflow-hidden">
                            {/* Form Header */}
                            <div className="p-6 bg-gradient-to-r from-brand-600 to-indigo-600 text-white">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="text-xl font-black">{generatedForm.template}</h3>
                                        <p className="text-brand-100 text-sm">Generated: {new Date(generatedForm.generatedAt).toLocaleString()}</p>
                                        {generatedForm.note && (
                                            <p className="text-amber-200 text-xs mt-1 flex items-center gap-1">
                                                <AlertCircle size={12} /> {generatedForm.note}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <LiveButton variant="ghost" className="text-white" onClick={handleCopyAll} icon={Copy}>
                                            Copy All
                                        </LiveButton>
                                        <LiveButton variant="ghost" className="text-white" onClick={handleExportText} icon={Download}>
                                            Export
                                        </LiveButton>
                                    </div>
                                </div>
                            </div>

                            {/* Form Fields */}
                            <div className="p-6 divide-y divide-slate-100 dark:divide-slate-800">
                                <div className="pb-4 mb-4">
                                    <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <ClipboardList size={16} />
                                        Form Fields
                                    </h4>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        {Object.entries(generatedForm.formData).map(([field, value]) => (
                                            <div
                                                key={field}
                                                className={`p-4 rounded-xl border ${isRequired(value)
                                                    ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800'
                                                    : 'bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-700'
                                                    }`}
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                                        {field.replace(/([A-Z])/g, ' $1').trim()}
                                                    </label>
                                                    <button
                                                        onClick={() => handleCopyField(field, value)}
                                                        className="text-slate-400 hover:text-slate-600 transition-colors"
                                                    >
                                                        {copiedField === field ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                                    </button>
                                                </div>
                                                <p className={`font-semibold ${isRequired(value) ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
                                                    }`}>
                                                    {value}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Required Documents */}
                                <div className="pt-4">
                                    <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <FileCheck size={16} />
                                        Required Documents
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {generatedForm.requiredDocuments.map((doc, idx) => (
                                            <span
                                                key={idx}
                                                className="px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium"
                                            >
                                                {doc}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </AnimatedCard>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Empty State */}
            {!generatedForm && (
                <AnimatedCard className="p-12 text-center">
                    <FileText size={48} className="mx-auto text-slate-200 dark:text-slate-700 mb-4" />
                    <h3 className="text-lg font-bold text-slate-600 dark:text-slate-400 mb-2">No Form Generated Yet</h3>
                    <p className="text-sm text-slate-500">Select a client and form template, then click "Generate" to auto-fill</p>
                </AnimatedCard>
            )}
        </div>
    );
}
