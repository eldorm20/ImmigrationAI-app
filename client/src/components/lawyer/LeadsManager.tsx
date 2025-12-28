import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import {
    Users, DollarSign, Filter, Plus, Search,
    ArrowRight, Phone, Mail, Globe, Clock, CheckCircle, Trash2, SlidersHorizontal, Briefcase, TrendingUp
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
    stage: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
    source?: string;
    notes?: string;
    estimatedValue?: number;
    createdAt: string;
}

export default function LeadsManager() {
    const { toast } = useToast();
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
        stage: 'new',
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
            toast({ title: "Failed to fetch leads", variant: "destructive" });
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
        try {
            await apiRequest('/leads', {
                method: 'POST',
                body: JSON.stringify(newLead)
            });
            toast({ title: "Lead captured", description: "A new opportunity has been registered." });
            setIsAddModalOpen(false);
            setNewLead({ firstName: '', lastName: '', email: '', stage: 'new' });
            fetchLeads();
            fetchStats();
        } catch (err) {
            toast({ title: "Registration failed", variant: "destructive" });
        }
    };

    const handleConvert = async (leadId: string) => {
        try {
            await apiRequest(`/leads/${leadId}/convert`, { method: 'POST' });
            toast({ title: "Consultation Activated", description: "Lead has been successfully promoted to applicant status." });
            fetchLeads();
            fetchStats();
        } catch (err) {
            toast({ title: "Promotion failed", variant: "destructive" });
        }
    };

    const filteredLeads = leads.filter(l =>
        l.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStageProps = (stage: string) => {
        switch (stage) {
            case 'new': return { color: 'blue', icon: Sparkles };
            case 'contacted': return { color: 'amber', icon: PhoneCall };
            case 'qualified': return { color: 'indigo', icon: CheckCircle2 };
            case 'converted': return { color: 'emerald', icon: TrendingUp };
            case 'lost': return { color: 'rose', icon: XCircle };
            default: return { color: 'slate', icon: Clock };
        }
    };

    // Helper icons not imported
    const Sparkles = () => <Clock size={14} />;
    const PhoneCall = () => <Phone size={14} />;
    const CheckCircle2 = () => <CheckCircle size={14} />;
    const XCircle = () => <Trash2 size={14} />;

    return (
        <div className="space-y-8 pb-12">
            <div className="flex justify-between items-center bg-white/30 dark:bg-slate-900/30 backdrop-blur-md p-6 rounded-3xl border border-white/20 dark:border-white/5 shadow-xl">
                <div>
                    <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Leads CRM</h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Pipeline management and opportunity tracking</p>
                </div>
                <LiveButton onClick={() => setIsAddModalOpen(true)} icon={Plus} size="lg" className="rounded-2xl">
                    Add Opportunity
                </LiveButton>
            </div>

            {/* Pipeline Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {['new', 'contacted', 'qualified', 'converted', 'lost'].map((stage, idx) => {
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
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stage}</p>
                                        <div className={`p-2 rounded-lg bg-${props.color}-50 dark:bg-${props.color}-900/20 text-${props.color}-600`}>
                                            <Icon />
                                        </div>
                                    </div>
                                    <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-1">{stat?.count || 0}</h3>
                                    <div className="text-xs font-bold text-slate-400">
                                        Est. <span className={`text-${props.color}-500`}>${(stat?.totalValue || 0).toLocaleString()}</span>
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
                            placeholder="Find prospective clients..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <GlassSelect
                        value={filterStage}
                        onChange={e => setFilterStage(e.target.value)}
                        className="px-6"
                    >
                        <option value="all">Pipeline (All)</option>
                        <option value="new">Phase: New</option>
                        <option value="contacted">Phase: Contacted</option>
                        <option value="qualified">Phase: Qualified</option>
                        <option value="converted">Phase: Converted</option>
                        <option value="lost">Phase: Lost</option>
                    </GlassSelect>
                </div>

                <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest hidden md:flex">
                    <SlidersHorizontal size={14} /> Filter Results
                </div>
            </div>

            {/* Leads Table */}
            <AnimatedCard className="p-0 border-none bg-white/40 dark:bg-slate-950/40 backdrop-blur-xl shadow-2x overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                                <th className="px-8 py-5 font-bold text-slate-500 uppercase text-[10px] tracking-[0.2em]">Prospective Client</th>
                                <th className="px-8 py-5 font-bold text-slate-500 uppercase text-[10px] tracking-[0.2em]">Contact Node</th>
                                <th className="px-8 py-5 font-bold text-slate-500 uppercase text-[10px] tracking-[0.2em]">Objective</th>
                                <th className="px-8 py-5 font-bold text-slate-500 uppercase text-[10px] tracking-[0.2em]">Pipeline State</th>
                                <th className="px-8 py-5 font-bold text-slate-500 uppercase text-[10px] tracking-[0.2em]">Value (Est.)</th>
                                <th className="px-8 py-5 text-right font-bold text-slate-500 uppercase text-[10px] tracking-[0.2em]">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                            {loading ? (
                                <tr><td colSpan={6} className="p-20 text-center text-slate-400 animate-pulse">Syncing pipeline nodes...</td></tr>
                            ) : filteredLeads.length === 0 ? (
                                <tr><td colSpan={6} className="p-20 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <Users size={48} className="text-slate-200 dark:text-slate-800" />
                                        <p className="text-slate-500 font-medium font-bold uppercase text-xs tracking-widest">No matching opportunities in this phase</p>
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
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Registered {format(new Date(lead.createdAt), 'MMM d, yyyy')}</div>
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
                                                {lead.stage}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="text-lg font-black text-slate-900 dark:text-white tabular-nums">
                                                {lead.estimatedValue ? `$${lead.estimatedValue.toLocaleString()}` : '-'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            {lead.stage !== 'converted' && (
                                                <LiveButton
                                                    size="sm"
                                                    variant="ghost"
                                                    className="opacity-0 group-hover:opacity-100 transition-all font-black text-[10px] uppercase tracking-wider"
                                                    onClick={() => handleConvert(lead.id)}
                                                    icon={ArrowRight}
                                                >
                                                    Promote
                                                </LiveButton>
                                            )}
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
                                <h3 className="font-black text-2xl text-white">Register Opportunity</h3>
                                <p className="text-brand-100 text-sm font-medium">Capture a new lead for your practice</p>
                            </div>
                            <form onSubmit={handleCreateLead} className="p-10 space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">First Name</label>
                                        <GlassInput required className="w-full"
                                            value={newLead.firstName} onChange={e => setNewLead({ ...newLead, firstName: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Last Name</label>
                                        <GlassInput required className="w-full"
                                            value={newLead.lastName} onChange={e => setNewLead({ ...newLead, lastName: e.target.value })} />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Primary Email</label>
                                    <GlassInput type="email" required className="w-full"
                                        value={newLead.email} onChange={e => setNewLead({ ...newLead, email: e.target.value })} />
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Visa/Program Interest</label>
                                        <GlassInput className="w-full"
                                            value={newLead.visaInterest} onChange={e => setNewLead({ ...newLead, visaInterest: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Est. Case Value ($)</label>
                                        <GlassInput type="number" className="w-full font-bold"
                                            value={newLead.estimatedValue} onChange={e => setNewLead({ ...newLead, estimatedValue: Number(e.target.value) })} />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-4 pt-8">
                                    <LiveButton variant="ghost" type="button" onClick={() => setIsAddModalOpen(false)}>Discard</LiveButton>
                                    <LiveButton icon={CheckCircle} className="px-10" type="submit">Deploy Registration</LiveButton>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
