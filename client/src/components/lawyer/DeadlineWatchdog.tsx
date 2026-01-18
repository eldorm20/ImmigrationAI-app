import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Clock, AlertTriangle, CheckCircle, Bell, Plus, X, Calendar, User,
    Send, Trash2, Edit2, Filter, ChevronDown
} from 'lucide-react';
import { AnimatedCard, LiveButton, GlassInput, GlassSelect } from '@/components/ui/live-elements';
import { motion, AnimatePresence } from 'framer-motion';
import { format, differenceInDays } from 'date-fns';

interface Deadline {
    id: string;
    clientId: string;
    applicationId?: string;
    type: string;
    title: string;
    description?: string;
    dueDate: string;
    status: string;
    priority: string;
    remindersSent: number;
    notes?: string;
    clientName?: string;
    clientEmail?: string;
    daysRemaining: number;
    zone: 'red' | 'amber' | 'green' | 'overdue';
}

interface DeadlineStats {
    total: number;
    overdue: number;
    red: number;
    amber: number;
    green: number;
}

export default function DeadlineWatchdog() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [filterZone, setFilterZone] = useState<string>('all');
    const [newDeadline, setNewDeadline] = useState({
        clientId: '',
        title: '',
        description: '',
        dueDate: '',
        type: 'custom',
        priority: 'medium',
        notes: ''
    });

    // Fetch deadlines
    const { data: deadlinesData, isLoading } = useQuery({
        queryKey: ['lawyer-deadlines'],
        queryFn: () => apiRequest<{ deadlines: Deadline[] }>('/lawyer-deadlines'),
    });

    // Fetch stats
    const { data: stats } = useQuery({
        queryKey: ['lawyer-deadlines-stats'],
        queryFn: () => apiRequest<DeadlineStats>('/lawyer-deadlines/stats'),
    });

    // Fetch clients for dropdown
    const { data: clientsData } = useQuery({
        queryKey: ['clients-for-deadline'],
        queryFn: () => apiRequest<any[]>('/clients'),
    });

    // Create deadline mutation
    const createMutation = useMutation({
        mutationFn: (data: typeof newDeadline) =>
            apiRequest('/lawyer-deadlines', { method: 'POST', body: JSON.stringify(data) }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['lawyer-deadlines'] });
            queryClient.invalidateQueries({ queryKey: ['lawyer-deadlines-stats'] });
            setShowCreateModal(false);
            setNewDeadline({ clientId: '', title: '', description: '', dueDate: '', type: 'custom', priority: 'medium', notes: '' });
            toast({ title: 'Deadline Created', description: 'New deadline has been added to your watchlist.' });
        },
        onError: (err: any) => {
            toast({ title: 'Error', description: err.message || 'Failed to create deadline', variant: 'destructive' });
        }
    });

    // Send reminder mutation
    const remindMutation = useMutation({
        mutationFn: (id: string) =>
            apiRequest(`/lawyer-deadlines/${id}/remind`, { method: 'POST' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['lawyer-deadlines'] });
            toast({ title: 'Reminder Sent', description: 'Client has been notified of the upcoming deadline.' });
        }
    });

    // Complete deadline mutation
    const completeMutation = useMutation({
        mutationFn: (id: string) =>
            apiRequest(`/lawyer-deadlines/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'completed' }) }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['lawyer-deadlines'] });
            queryClient.invalidateQueries({ queryKey: ['lawyer-deadlines-stats'] });
            toast({ title: 'Completed', description: 'Deadline marked as complete.' });
        }
    });

    // Delete deadline mutation
    const deleteMutation = useMutation({
        mutationFn: (id: string) =>
            apiRequest(`/lawyer-deadlines/${id}`, { method: 'DELETE' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['lawyer-deadlines'] });
            queryClient.invalidateQueries({ queryKey: ['lawyer-deadlines-stats'] });
            toast({ title: 'Deleted', description: 'Deadline removed from watchlist.' });
        }
    });

    const deadlines = deadlinesData?.deadlines || [];
    const clients = Array.isArray(clientsData) ? clientsData : [];

    const filteredDeadlines = filterZone === 'all'
        ? deadlines
        : deadlines.filter(d => d.zone === filterZone);

    const getZoneColor = (zone: string) => {
        switch (zone) {
            case 'overdue': return 'bg-rose-500';
            case 'red': return 'bg-red-500';
            case 'amber': return 'bg-amber-500';
            case 'green': return 'bg-emerald-500';
            default: return 'bg-slate-500';
        }
    };

    const getZoneBg = (zone: string) => {
        switch (zone) {
            case 'overdue': return 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800';
            case 'red': return 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800';
            case 'amber': return 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800';
            case 'green': return 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800';
            default: return 'bg-slate-50 dark:bg-slate-900/30';
        }
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDeadline.clientId || !newDeadline.title || !newDeadline.dueDate) {
            toast({ title: 'Validation Error', description: 'Please fill in all required fields.', variant: 'destructive' });
            return;
        }
        createMutation.mutate(newDeadline);
    };

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="flex justify-between items-center bg-white/30 dark:bg-slate-900/30 backdrop-blur-md p-6 rounded-3xl border border-white/20 dark:border-white/5 shadow-xl">
                <div>
                    <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                        <Clock className="text-brand-500" size={32} />
                        Deadline Watchdog
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Track critical dates and never miss a deadline</p>
                </div>
                <LiveButton onClick={() => setShowCreateModal(true)} icon={Plus} size="lg" className="rounded-2xl">
                    Add Deadline
                </LiveButton>
            </div>

            {/* Traffic Light Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                    { label: 'Overdue', value: stats?.overdue || 0, color: 'rose', icon: AlertTriangle },
                    { label: 'Critical (<30d)', value: stats?.red || 0, color: 'red', icon: Clock },
                    { label: 'Warning (<60d)', value: stats?.amber || 0, color: 'amber', icon: Bell },
                    { label: 'On Track (>60d)', value: stats?.green || 0, color: 'emerald', icon: CheckCircle },
                    { label: 'Total Active', value: stats?.total || 0, color: 'brand', icon: Calendar },
                ].map((stat, idx) => {
                    const Icon = stat.icon;
                    return (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                        >
                            <AnimatedCard className={`p-5 bg-${stat.color}-50/50 dark:bg-${stat.color}-950/20 border-${stat.color}-200 dark:border-${stat.color}-800/30`}>
                                <div className="flex justify-between items-start mb-3">
                                    <div className={`p-2 rounded-lg bg-${stat.color}-100 dark:bg-${stat.color}-900/30`}>
                                        <Icon size={18} className={`text-${stat.color}-600 dark:text-${stat.color}-400`} />
                                    </div>
                                </div>
                                <p className="text-3xl font-black text-slate-900 dark:text-white">{stat.value}</p>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">{stat.label}</p>
                            </AnimatedCard>
                        </motion.div>
                    );
                })}
            </div>

            {/* Filter Bar */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400">
                    <Filter size={16} />
                    Filter by Zone:
                </div>
                <div className="flex gap-2">
                    {['all', 'overdue', 'red', 'amber', 'green'].map(zone => (
                        <button
                            key={zone}
                            onClick={() => setFilterZone(zone)}
                            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${filterZone === zone
                                ? 'bg-brand-600 text-white shadow-lg'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                                }`}
                        >
                            {zone === 'all' ? 'All' : zone}
                        </button>
                    ))}
                </div>
            </div>

            {/* Deadlines List */}
            <AnimatedCard className="p-0 overflow-hidden bg-white/40 dark:bg-slate-950/40 backdrop-blur-xl">
                {isLoading ? (
                    <div className="p-20 text-center text-slate-400 animate-pulse">Loading deadlines...</div>
                ) : filteredDeadlines.length === 0 ? (
                    <div className="p-20 text-center">
                        <Clock size={48} className="mx-auto text-slate-200 dark:text-slate-700 mb-4" />
                        <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">No deadlines in this zone</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredDeadlines.map((deadline, idx) => (
                            <motion.div
                                key={deadline.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className={`p-6 flex items-center gap-6 hover:bg-white/50 dark:hover:bg-slate-900/50 transition-colors ${getZoneBg(deadline.zone)}`}
                            >
                                {/* Zone Indicator */}
                                <div className={`w-3 h-16 rounded-full ${getZoneColor(deadline.zone)}`} />

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="font-bold text-lg text-slate-900 dark:text-white truncate">{deadline.title}</h3>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${deadline.priority === 'critical' ? 'bg-rose-100 text-rose-700' :
                                            deadline.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                                                deadline.priority === 'medium' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-slate-100 text-slate-600'
                                            }`}>
                                            {deadline.priority}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-slate-500">
                                        <span className="flex items-center gap-1">
                                            <User size={14} />
                                            {deadline.clientName || 'Unknown Client'}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Calendar size={14} />
                                            {format(new Date(deadline.dueDate), 'MMM d, yyyy')}
                                        </span>
                                        {deadline.remindersSent > 0 && (
                                            <span className="flex items-center gap-1 text-amber-600">
                                                <Bell size={14} />
                                                {deadline.remindersSent} reminder(s) sent
                                            </span>
                                        )}
                                    </div>
                                    {deadline.description && (
                                        <p className="text-sm text-slate-400 mt-1 truncate">{deadline.description}</p>
                                    )}
                                </div>

                                {/* Days Countdown */}
                                <div className="text-center min-w-[80px]">
                                    <p className={`text-3xl font-black ${deadline.zone === 'overdue' ? 'text-rose-600' :
                                        deadline.zone === 'red' ? 'text-red-600' :
                                            deadline.zone === 'amber' ? 'text-amber-600' :
                                                'text-emerald-600'
                                        }`}>
                                        {deadline.daysRemaining < 0 ? Math.abs(deadline.daysRemaining) : deadline.daysRemaining}
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        {deadline.daysRemaining < 0 ? 'Days Overdue' : 'Days Left'}
                                    </p>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                    <LiveButton
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => remindMutation.mutate(deadline.id)}
                                        className="text-amber-600 hover:bg-amber-50"
                                        icon={Send}
                                    >
                                        Remind
                                    </LiveButton>
                                    <LiveButton
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => completeMutation.mutate(deadline.id)}
                                        className="text-emerald-600 hover:bg-emerald-50"
                                        icon={CheckCircle}
                                    >
                                        Complete
                                    </LiveButton>
                                    <LiveButton
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => deleteMutation.mutate(deadline.id)}
                                        className="text-rose-600 hover:bg-rose-50"
                                        icon={Trash2}
                                    >
                                        Delete
                                    </LiveButton>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </AnimatedCard>

            {/* Create Deadline Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-950/50 backdrop-blur-md"
                            onClick={() => setShowCreateModal(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden relative z-10 border border-white/20"
                        >
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-brand-600 to-indigo-600">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-black text-xl text-white flex items-center gap-2">
                                        <Clock size={24} />
                                        Add Deadline
                                    </h3>
                                    <button onClick={() => setShowCreateModal(false)} className="text-white/70 hover:text-white">
                                        <X size={24} />
                                    </button>
                                </div>
                            </div>


                            <form onSubmit={handleCreate} className="p-6 space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Client *</label>
                                    <GlassSelect
                                        value={newDeadline.clientId}
                                        onChange={e => setNewDeadline({ ...newDeadline, clientId: e.target.value })}
                                        className="w-full"
                                    >
                                        <option value="">Select a client...</option>
                                        {clients.map((c: any) => (
                                            <option key={c.id} value={c.id}>{c.firstName} {c.lastName} ({c.email})</option>
                                        ))}
                                    </GlassSelect>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Title *</label>
                                    <GlassInput
                                        value={newDeadline.title}
                                        onChange={e => setNewDeadline({ ...newDeadline, title: e.target.value })}
                                        placeholder="e.g., Visa Expiry Date"
                                        className="w-full"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Due Date *</label>
                                        <GlassInput
                                            type="date"
                                            value={newDeadline.dueDate}
                                            onChange={e => setNewDeadline({ ...newDeadline, dueDate: e.target.value })}
                                            className="w-full"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Type</label>
                                        <GlassSelect
                                            value={newDeadline.type}
                                            onChange={e => setNewDeadline({ ...newDeadline, type: e.target.value })}
                                            className="w-full"
                                        >
                                            <option value="visa_expiry">Visa Expiry</option>
                                            <option value="appeal_deadline">Appeal Deadline</option>
                                            <option value="document_expiry">Document Expiry</option>
                                            <option value="interview_date">Interview Date</option>
                                            <option value="submission_deadline">Submission Deadline</option>
                                            <option value="follow_up">Follow Up</option>
                                            <option value="custom">Custom</option>
                                        </GlassSelect>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Priority</label>
                                    <GlassSelect
                                        value={newDeadline.priority}
                                        onChange={e => setNewDeadline({ ...newDeadline, priority: e.target.value })}
                                        className="w-full"
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                        <option value="critical">Critical</option>
                                    </GlassSelect>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Description</label>
                                    <textarea
                                        value={newDeadline.description}
                                        onChange={e => setNewDeadline({ ...newDeadline, description: e.target.value })}
                                        placeholder="Optional notes about this deadline..."
                                        className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
                                        rows={3}
                                    />
                                </div>

                                <div className="flex justify-end gap-3 pt-4">
                                    <LiveButton variant="ghost" type="button" onClick={() => setShowCreateModal(false)}>
                                        Cancel
                                    </LiveButton>
                                    <LiveButton type="submit" icon={Plus} disabled={createMutation.isPending}>
                                        {createMutation.isPending ? 'Creating...' : 'Add Deadline'}
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
