import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';
import {
    Users, DollarSign, Filter, Plus, Search,
    ArrowRight, Phone, Mail, Globe, Clock, CheckCircle, Trash2, SlidersHorizontal, Briefcase, TrendingUp, X, Sparkles, PhoneCall, CheckCircle2, XCircle, Calendar, FileText
} from 'lucide-react';
import { LiveButton, AnimatedCard, GlassInput, GlassSelect } from '@/components/ui/live-elements';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

interface Lead {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    visaInterest?: string;
    country?: string;
    stage: 'inquiry' | 'new' | 'contacted' | 'consultation_scheduled' | 'consultation_completed' | 'proposal_sent' | 'qualified' | 'converted' | 'lost';
    source?: string;
    notes?: string;
    estimatedValue?: number;
    createdAt: string;
}

export default function LeadsManager() {
    const { toast } = useToast();
    const { t } = useI18n();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [filterStage, setFilterStage] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // New Lead Form State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newLead, setNewLead] = useState<Partial<Lead>>({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        visaInterest: 'UK Skilled Worker',
        country: 'United Kingdom',
        stage: 'inquiry',
        source: 'Website',
        estimatedValue: 0
    });

    useEffect(() => {
        fetchLeads();
        fetchStats();
    }, [filterStage]);

    const fetchLeads = async () => {
        setLoading(true);
        try {
            const query = filterStage !== 'all' ? `?stage=${filterStage}` : '';
            const data = await apiRequest<{ leads: Lead[] }>(`/leads${query}`);
            setLeads(data.leads || []);
        } catch (err) {
            console.error(err);
            toast({ title: t.common?.error || "Error", description: t.lawyer?.leads?.sync || "Syncing infrastructure...", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const data = await apiRequest<{ stats: any[] }>('/leads/stats/pipeline');
            setStats(data.stats);
        } catch (err) {
            console.error(err);
        }
    };

    const handleCreateLead = async (e: React.FormEvent) => {
        e.preventDefault();

        // Client-side validation
        if (!newLead.firstName?.trim() || !newLead.lastName?.trim()) {
            toast({
                title: t.common?.error || "Validation Error",
                description: "First name and last name are required.",
                variant: "destructive"
            });
            return;
        }

        if (!newLead.email?.trim()) {
            toast({
                title: t.common?.error || "Validation Error",
                description: "Email address is required.",
                variant: "destructive"
            });
            return;
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newLead.email)) {
            toast({
                title: t.common?.error || "Validation Error",
                description: "Please enter a valid email address.",
                variant: "destructive"
            });
            return;
        }

        try {
            const payload = {
                firstName: newLead.firstName?.trim(),
                lastName: newLead.lastName?.trim(),
                email: newLead.email?.trim().toLowerCase(),
                phone: newLead.phone?.trim() || undefined,
                visaInterest: newLead.visaInterest || 'UK Skilled Worker',
                country: newLead.country || 'United Kingdom',
                stage: newLead.stage || 'inquiry',
                source: newLead.source || 'Website',
                estimatedValue: newLead.estimatedValue ? String(newLead.estimatedValue) : "0"
            };

            await apiRequest('/leads', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            toast({
                title: t.common?.success || "Success",
                description: `${newLead.firstName} has been successfully registered as a lead.`,
                className: "bg-green-50 text-green-900 border-green-200"
            });

            setIsAddModalOpen(false);
            setNewLead({
                firstName: '',
                lastName: '',
                email: '',
                phone: '',
                stage: 'inquiry',
                estimatedValue: 0,
                source: 'Website',
                visaInterest: 'UK Skilled Worker',
                country: 'United Kingdom'
            });

            fetchLeads();
            fetchStats();
        } catch (err: any) {
            console.error('Lead registration error:', err);

            // More detailed error messages
            let errorMessage = "Could not register lead. Please try again.";

            if (err.message) {
                errorMessage = err.message;
            } else if (err.error) {
                errorMessage = err.error;
            } else if (err.details) {
                errorMessage = err.details;
            }

            toast({
                title: t.common?.error || "Registration Failed",
                description: errorMessage,
                variant: "destructive"
            });
        }
    };

    const handleConvert = async (leadId: string) => {
        try {
            await apiRequest(`/leads/${leadId}/convert`, { method: 'POST' });
            toast({ title: t.common?.success || "Success", description: "Lead converted." });
            fetchLeads();
            fetchStats();
        } catch (err) {
            toast({ title: t.common?.error || "Error", variant: "destructive" });
        }
    };

    const filteredLeads = leads.filter(l =>
        (l.firstName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.lastName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.email || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStageProps = (stage: string) => {
        switch (stage) {
            case 'inquiry': return { color: 'blue', icon: Sparkles };
            case 'new': return { color: 'blue', icon: Sparkles }; // Fallback for UI
            case 'contacted': return { color: 'amber', icon: PhoneCall };
            case 'consultation_scheduled': return { color: 'purple', icon: Calendar };
            case 'consultation_completed': return { color: 'indigo', icon: CheckCircle };
            case 'proposal_sent': return { color: 'cyan', icon: FileText };
            case 'qualified': return { color: 'indigo', icon: CheckCircle2 };
            case 'converted': return { color: 'emerald', icon: TrendingUp };
            case 'lost': return { color: 'rose', icon: XCircle };
            default: return { color: 'slate', icon: Clock };
        }
    };

    // Type-safe accessor for stages
    const getStageLabel = (stage: string) => {
        // Handle mapping if keys don't perfectly match
        if (stage === 'inquiry') return t.lawyer?.leads?.stages?.inquiry || "Inquiry";
        if (stage === 'new') return t.lawyer?.leads?.stages?.new || "New Inquiry";

        const leadsObj = t.lawyer?.leads || {};
        const stagesObj = leadsObj.stages || {};
        return (stagesObj as any)[stage] || stage;
    };

    const STAGES = ['inquiry', 'contacted', 'consultation_scheduled', 'proposal_sent', 'converted', 'lost'];

    return (
        <div className="space-y-8 pb-12">
            <div className="flex justify-between items-center bg-white/30 dark:bg-slate-900/30 backdrop-blur-md p-6 rounded-3xl border border-white/20 dark:border-white/5 shadow-xl">
                <div>
                    <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{t.lawyer?.leads?.title || "Client Inquiries"}</h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">{t.lawyer?.leads?.subtitle || "Track and manage potential clients"}</p>
                </div>
                <LiveButton onClick={() => setIsAddModalOpen(true)} icon={Plus} size="lg" className="rounded-2xl">
                    {t.lawyer?.leads?.add || "Register Lead"}
                </LiveButton>
            </div>

            {/* Pipeline Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {STAGES.map((stage, idx) => {
                    const stat = stats?.find((s: any) => s.stage === stage);
                    const props = getStageProps(stage);
                    const Icon = props.icon;
                    return (
                        <motion.div
                            key={stage}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                        >
                            <AnimatedCard className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm p-5 border-none shadow-lg relative overflow-hidden group h-full">
                                <div className={`absolute top-0 right-0 p-12 rounded-full blur-3xl opacity-10 bg-${props.color}-500 group-hover:opacity-20 transition-opacity`}></div>
                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-4">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{getStageLabel(stage)}</p>
                                        <div className={`p-2 rounded-lg bg-${props.color}-50 dark:bg-${props.color}-900/20 text-${props.color}-600`}>
                                            <Icon size={14} />
                                        </div>
                                    </div>
                                    <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-1">{stat?.count || 0}</h3>
                                    <div className="text-xs font-bold text-slate-400">
                                        {t.lawyer?.leads?.stats?.potential || "Portfolio Value"} <span className={`text-${props.color}-500`}>${(stat?.totalValue || 0).toLocaleString()}</span>
                                    </div>
                                </div>
                            </AnimatedCard>
                        </motion.div>
                    );
                })}
            </div>

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row justify-between gap-4 items-center">
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <GlassInput
                            className="pl-12 w-full"
                            placeholder={t.lawyer?.leads?.search || "Search inquiries..."}
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <GlassSelect
                        value={filterStage}
                        onChange={e => setFilterStage(e.target.value)}
                        className="px-6"
                    >
                        <option value="all">{t.lawyer?.leads?.stages?.all || "Global View"}</option>
                        {STAGES.map(s => <option key={s} value={s}>{getStageLabel(s)}</option>)}
                    </GlassSelect>
                </div>

                <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest hidden md:flex">
                    <SlidersHorizontal size={14} /> {t.lawyer?.leads?.filter || "Refine"}
                </div>
            </div>

            {/* Leads Table */}
            <AnimatedCard className="p-0 border-none bg-white/40 dark:bg-slate-950/40 backdrop-blur-xl shadow-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                                <th className="px-8 py-5 font-bold text-slate-500 uppercase text-[10px] tracking-[0.2em]">{t.lawyer?.leads?.table?.client || "Identity"}</th>
                                <th className="px-8 py-5 font-bold text-slate-500 uppercase text-[10px] tracking-[0.2em]">{t.lawyer?.leads?.table?.contact || "Communications"}</th>
                                <th className="px-8 py-5 font-bold text-slate-500 uppercase text-[10px] tracking-[0.2em]">{t.lawyer?.leads?.table?.objective || "Strategy"}</th>
                                <th className="px-8 py-5 font-bold text-slate-500 uppercase text-[10px] tracking-[0.2em]">{t.lawyer?.leads?.table?.stage || "Status"}</th>
                                <th className="px-8 py-5 font-bold text-slate-500 uppercase text-[10px] tracking-[0.2em]">{t.lawyer?.leads?.table?.value || "Valuation"}</th>
                                <th className="px-8 py-5 text-right font-bold text-slate-500 uppercase text-[10px] tracking-[0.2em]">{t.lawyer?.leads?.table?.action || "Command"}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                            {loading ? (
                                <tr><td colSpan={6} className="p-20 text-center text-slate-400 animate-pulse">{t.lawyer?.leads?.sync || "Syncing infrastructure..."}</td></tr>
                            ) : filteredLeads.length === 0 ? (
                                <tr><td colSpan={6} className="p-20 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <Users size={48} className="text-slate-200 dark:text-slate-800" />
                                        <p className="text-slate-500 font-medium font-bold uppercase text-xs tracking-widest">{t.lawyer?.leads?.empty || "No active inquiries"}</p>
                                    </div>
                                </td></tr>
                            ) : filteredLeads.map((lead, idx) => {
                                const props = getStageProps(lead.stage);
                                return (
                                    <motion.tr
                                        key={lead.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="group hover:bg-brand-50/30 dark:hover:bg-brand-900/10 transition-colors"
                                    >
                                        <td className="px-8 py-6">
                                            <div className="font-bold text-slate-900 dark:text-white text-lg">{lead.firstName} {lead.lastName}</div>
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Registered {(() => {
                                                const d = new Date(lead.createdAt);
                                                return isNaN(d.getTime()) ? 'N/A' : format(d, 'MMM d, yyyy');
                                            })()}</div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col gap-1.5">
                                                <span className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                                                    <Mail size={14} className="text-brand-500" /> {lead.email}
                                                </span>
                                                {lead.phone && (
                                                    <span className="flex items-center gap-2 text-xs font-medium text-slate-400">
                                                        <Phone size={12} /> {lead.phone}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2 font-bold text-sm text-slate-700 dark:text-slate-300">
                                                <Globe size={14} className="text-slate-400" /> {lead.visaInterest}
                                            </div>
                                            <div className="text-xs text-slate-400 ml-5">{lead.country}</div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-${props.color}-100 text-${props.color}-700 dark:bg-${props.color}-900/30 dark:text-${props.color}-400`}>
                                                <span className={`w-1.5 h-1.5 rounded-full bg-${props.color}-500`} />
                                                {getStageLabel(lead.stage)}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="text-lg font-black text-slate-900 dark:text-white tabular-nums">
                                                {lead.estimatedValue ? `$${lead.estimatedValue.toLocaleString()}` : '-'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex justify-end gap-2">
                                                {lead.stage !== 'converted' && (
                                                    <LiveButton
                                                        size="sm"
                                                        variant="ghost"
                                                        className="opacity-0 group-hover:opacity-100 transition-all font-black text-[10px] uppercase tracking-wider"
                                                        onClick={() => handleConvert(lead.id)}
                                                        icon={ArrowRight}
                                                    >
                                                        {t.lawyer?.leads?.promote || "Advance Case"}
                                                    </LiveButton>
                                                )}
                                            </div>
                                        </td>
                                    </motion.tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </AnimatedCard>

            {/* Add Lead Modal */}
            <AnimatePresence>
                {isAddModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-950/40 backdrop-blur-md"
                            onClick={() => setIsAddModalOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl w-full max-w-xl overflow-hidden relative z-10 border border-white/20 dark:border-white/5"
                        >
                            <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-brand-600 to-blue-500">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="font-black text-2xl text-white">{t.lawyer?.leads?.register || "Intake Protocol"}</h3>
                                        <p className="text-brand-100 text-sm font-medium">{t.lawyer?.leads?.capture || "Initial Client Ingestion"}</p>
                                    </div>
                                    <button onClick={() => setIsAddModalOpen(false)} className="text-white/70 hover:text-white transition-colors">
                                        <X size={24} />
                                    </button>
                                </div>
                            </div>
                            <form onSubmit={handleCreateLead} className="p-10 space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">{t.lawyer?.leads?.form?.firstName || "Given Name"}</label>
                                        <GlassInput required className="w-full"
                                            value={newLead.firstName} onChange={e => setNewLead({ ...newLead, firstName: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">{t.lawyer?.leads?.form?.lastName || "Surname"}</label>
                                        <GlassInput required className="w-full"
                                            value={newLead.lastName} onChange={e => setNewLead({ ...newLead, lastName: e.target.value })} />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">{t.lawyer?.leads?.form?.email || "Electronic Mail"}</label>
                                    <GlassInput type="email" required className="w-full"
                                        value={newLead.email} onChange={e => setNewLead({ ...newLead, email: e.target.value })} />
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">{t.lawyer?.leads?.form?.visa || "Strategic Objective"}</label>
                                        <GlassInput className="w-full"
                                            value={newLead.visaInterest} onChange={e => setNewLead({ ...newLead, visaInterest: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">{t.lawyer?.leads?.form?.val || "Expected Valuation"}</label>
                                        <GlassInput type="number" className="w-full font-bold"
                                            value={newLead.estimatedValue} onChange={e => setNewLead({ ...newLead, estimatedValue: Number(e.target.value) })} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">{t.lawyer?.leads?.form?.source || "Origin Channel"}</label>
                                    <GlassSelect className="w-full"
                                        value={newLead.source} onChange={e => setNewLead({ ...newLead, source: e.target.value })}>
                                        <option value="Website">Website</option>
                                        <option value="Referral">Referral</option>
                                        <option value="Social">Social</option>
                                        <option value="Ad">Ad</option>
                                        <option value="Other">Other</option>
                                    </GlassSelect>
                                </div>

                                <div className="flex justify-end gap-4 pt-8">
                                    <LiveButton variant="ghost" type="button" onClick={() => setIsAddModalOpen(false)}>{t.lawyer?.leads?.form?.discard || "Abort"}</LiveButton>
                                    <LiveButton icon={CheckCircle} className="px-10" type="submit">{t.lawyer?.leads?.form?.deploy || "Deploy to Pipeline"}</LiveButton>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
