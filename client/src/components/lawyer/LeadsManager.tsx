import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import {
    Users, DollarSign, Filter, Plus, Search,
    ArrowRight, Phone, Mail, Globe, Clock, CheckCircle
} from 'lucide-react';
import { LiveButton, AnimatedCard } from '@/components/ui/live-elements';
import { format } from 'date-fns';

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
            setLeads(data.leads);
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
            toast({ title: "Lead created successfully", className: "bg-green-50 text-green-900" });
            setIsAddModalOpen(false);
            setNewLead({ firstName: '', lastName: '', email: '', stage: 'new' }); // Reset
            fetchLeads();
            fetchStats();
        } catch (err) {
            toast({ title: "Failed to create lead", variant: "destructive" });
        }
    };

    const handleConvert = async (leadId: string) => {
        if (!confirm("Convert this lead to an active application?")) return;
        try {
            await apiRequest(`/leads/${leadId}/convert`, { method: 'POST' });
            toast({ title: "Lead converted!", className: "bg-blue-50 text-blue-900" });
            fetchLeads();
            fetchStats();
        } catch (err) {
            toast({ title: "Conversion failed", variant: "destructive" });
        }
    };

    const filteredLeads = leads.filter(l =>
        l.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStageColor = (stage: string) => {
        switch (stage) {
            case 'new': return 'bg-blue-100 text-blue-700';
            case 'contacted': return 'bg-yellow-100 text-yellow-700';
            case 'qualified': return 'bg-purple-100 text-purple-700';
            case 'converted': return 'bg-green-100 text-green-700';
            case 'lost': return 'bg-red-100 text-red-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    return (
        <div className="space-y-6">
            {/* Pipeline Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {['new', 'contacted', 'qualified', 'converted', 'lost'].map(stage => {
                    const stat = stats?.find((s: any) => s.stage === stage);
                    return (
                        <AnimatedCard key={stage} className="bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 rounded-xl">
                            <p className="text-xs font-bold text-slate-500 uppercase mb-1">{stage}</p>
                            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">{stat?.count || 0}</h3>
                            <p className="text-xs text-slate-400 mt-1">Est. ${stat?.totalValue || 0}</p>
                        </AnimatedCard>
                    );
                })}
            </div>

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500"
                            placeholder="Search leads..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <select
                        className="px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm border-none outline-none focus:ring-2 focus:ring-brand-500"
                        value={filterStage}
                        onChange={e => setFilterStage(e.target.value)}
                    >
                        <option value="all">All Stages</option>
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="qualified">Qualified</option>
                        <option value="converted">Converted</option>
                        <option value="lost">Lost</option>
                    </select>
                </div>

                <LiveButton onClick={() => setIsAddModalOpen(true)} icon={Plus}>
                    Add New Lead
                </LiveButton>
            </div>

            {/* Leads Table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase text-xs font-bold">
                        <tr>
                            <th className="px-6 py-3">Name</th>
                            <th className="px-6 py-3">Contact</th>
                            <th className="px-6 py-3">Visa Interest</th>
                            <th className="px-6 py-3">Stage</th>
                            <th className="px-6 py-3">Value</th>
                            <th className="px-6 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {loading ? (
                            <tr><td colSpan={6} className="text-center py-8">Loading...</td></tr>
                        ) : filteredLeads.length === 0 ? (
                            <tr><td colSpan={6} className="text-center py-8 text-slate-400">No leads found</td></tr>
                        ) : filteredLeads.map(lead => (
                            <tr key={lead.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                                    {lead.firstName} {lead.lastName}
                                    <div className="text-xs text-slate-400 font-normal">{format(new Date(lead.createdAt), 'MMM d, yyyy')}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1">
                                        <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300"><Mail size={12} /> {lead.email}</span>
                                        {lead.phone && <span className="flex items-center gap-1.5 text-slate-500"><Phone size={12} /> {lead.phone}</span>}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="flex items-center gap-1.5"><Globe size={12} className="text-slate-400" /> {lead.visaInterest}</span>
                                    <span className="text-xs text-slate-400 block ml-4">{lead.country}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${getStageColor(lead.stage)}`}>
                                        {lead.stage}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                                    {lead.estimatedValue ? `$${lead.estimatedValue.toLocaleString()}` : '-'}
                                </td>
                                <td className="px-6 py-4">
                                    {lead.stage !== 'converted' && (
                                        <LiveButton
                                            size="sm"
                                            variant="ghost"
                                            className="text-brand-600 hover:bg-brand-50"
                                            onClick={() => handleConvert(lead.id)}
                                            icon={ArrowRight}
                                        >
                                            Convert
                                        </LiveButton>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add Lead Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <h3 className="font-bold text-lg">Add New Lead</h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600"><CheckCircle className="rotate-45" size={24} /></button>
                        </div>
                        <form onSubmit={handleCreateLead} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">First Name</label>
                                    <input required className="w-full p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 outline-none focus:border-brand-500"
                                        value={newLead.firstName} onChange={e => setNewLead({ ...newLead, firstName: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Last Name</label>
                                    <input required className="w-full p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 outline-none focus:border-brand-500"
                                        value={newLead.lastName} onChange={e => setNewLead({ ...newLead, lastName: e.target.value })} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Email</label>
                                <input type="email" required className="w-full p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 outline-none focus:border-brand-500"
                                    value={newLead.email} onChange={e => setNewLead({ ...newLead, email: e.target.value })} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Visa Interest</label>
                                    <input className="w-full p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 outline-none focus:border-brand-500"
                                        value={newLead.visaInterest} onChange={e => setNewLead({ ...newLead, visaInterest: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Est. Value ($)</label>
                                    <input type="number" className="w-full p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 outline-none focus:border-brand-500"
                                        value={newLead.estimatedValue} onChange={e => setNewLead({ ...newLead, estimatedValue: Number(e.target.value) })} />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-slate-500 hover:text-slate-700 font-medium">Cancel</button>
                                <LiveButton type="submit">Create Lead</LiveButton>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
