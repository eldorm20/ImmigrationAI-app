// Lawyer Video Consultations Page - Management and Scheduling

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/lib/useToast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LiveButton, AnimatedCard, GlassInput } from '@/components/ui/live-elements';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { VideoConsultation } from '@/components/consultation/VideoConsultation';
import {
    Video,
    Calendar,
    Clock,
    User,
    Plus,
    Eye,
    Trash2,
    Link as LinkIcon,
    Copy,
    CheckCircle2,
    Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format, isPast, isFuture, addMinutes } from 'date-fns';

interface Consultation {
    id: string;
    clientId: string;
    clientName: string;
    scheduledAt: string;
    duration: number; // minutes
    status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
    meetingId: string;
    notes?: string;
}

interface Client {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
}

export function LawyerVideoConsultations() {
    const { user } = useAuth();
    const { t } = useI18n();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [activeConsultation, setActiveConsultation] = useState<Consultation | null>(null);
    const [filterStatus, setFilterStatus] = useState<'all' | 'upcoming' | 'past'>('all');

    // Modal State
    const [isScheduleOpen, setIsScheduleOpen] = useState(false);
    const [newMeeting, setNewMeeting] = useState({
        clientId: '',
        date: '',
        time: '',
        duration: '30',
        notes: ''
    });

    // Fetch consultations
    const { data: consultations = [], isLoading } = useQuery({
        queryKey: ['/consultations', 'lawyer'],
        queryFn: () => apiRequest<Consultation[]>('/consultations?role=lawyer'),
    });

    // Fetch clients for dropdown
    const { data: clients = [], isLoading: isLoadingClients } = useQuery({
        queryKey: ['/clients'],
        queryFn: () => apiRequest<Client[]>('/clients'),
    });

    // Create consultation mutation
    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            return apiRequest('/consultations', {
                method: 'POST',
                body: JSON.stringify(data),
            });
        },
        onSuccess: () => {
            toast({
                title: t.common?.success || 'Success',
                description: 'Consultation scheduled successfully!',
                className: 'bg-green-50 text-green-900 border-green-200'
            });
            queryClient.invalidateQueries({ queryKey: ['/consultations'] });
            setIsScheduleOpen(false);
            setNewMeeting({
                clientId: '',
                date: '',
                time: '',
                duration: '30',
                notes: ''
            });
        },
        onError: (err: any) => {
            toast({
                title: 'Error',
                description: err.message || 'Failed to schedule consultation',
                variant: 'destructive',
            });
        }
    });

    // Delete consultation mutation
    const deleteMutation = useMutation({
        mutationFn: (id: string) =>
            apiRequest(`/consultations/${id}`, { method: 'DELETE' }),
        onSuccess: () => {
            toast({
                title: t.common?.success || 'Success',
                description: 'Consultation cancelled',
            });
            queryClient.invalidateQueries({ queryKey: ['/consultations'] });
        },
    });

    const handleScheduleSubmit = () => {
        if (!newMeeting.clientId || !newMeeting.date || !newMeeting.time) {
            toast({
                title: 'Validation Error',
                description: 'Please fill in all required fields',
                variant: 'destructive',
            });
            return;
        }

        const scheduledAt = new Date(`${newMeeting.date}T${newMeeting.time}`).toISOString();

        createMutation.mutate({
            clientId: newMeeting.clientId,
            scheduledAt,
            duration: parseInt(newMeeting.duration),
            notes: newMeeting.notes
        });
    };

    const copyMeetingLink = (meetingId: string) => {
        const link = `${window.location.origin}/consultation/${meetingId}`;
        navigator.clipboard.writeText(link);
        toast({
            title: t.common?.success || 'Copied',
            description: 'Meeting link copied to clipboard',
            className: 'bg-green-50 text-green-900 border-green-200'
        });
    };

    const startConsultation = (consultation: Consultation) => {
        setActiveConsultation(consultation);
    };

    const filteredConsultations = consultations.filter((consultation: Consultation) => {
        if (!consultation.scheduledAt) return false;
        try {
            const date = new Date(consultation.scheduledAt);
            if (isNaN(date.getTime())) return false;

            if (filterStatus === 'upcoming') {
                return isFuture(date) && consultation.status !== 'completed';
            }
            if (filterStatus === 'past') {
                return isPast(date) || consultation.status === 'completed';
            }
            return true;
        } catch (e) {
            console.error('Invalid date in consultation:', consultation);
            return false;
        }
    });

    if (activeConsultation) {
        return (
            <VideoConsultation
                meetingId={activeConsultation.meetingId}
                participantName={`${user?.firstName} ${user?.lastName}` || 'Lawyer'}
                isLawyer={true}
                onEnd={() => setActiveConsultation(null)}
            />
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-4">
                        <span className="w-2 h-11 bg-gradient-to-b from-brand-600 to-blue-600 rounded-full hidden md:block shadow-lg shadow-brand-500/20" />
                        <span className="text-gradient">Video Consultations</span>
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1 font-medium">
                        Manage your client meetings and video calls
                    </p>
                </div>

                <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
                    <DialogTrigger asChild>
                        <LiveButton variant="primary" icon={Plus}>
                            Schedule New
                        </LiveButton>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px] glass-premium border-white/20 dark:border-white/10 p-0 overflow-hidden rounded-3xl">
                        <div className="bg-gradient-to-br from-brand-600 to-blue-600 p-8 text-white relative overflow-hidden">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 0.1, scale: 1 }}
                                className="absolute -top-10 -right-10 w-40 h-40 bg-white rounded-full blur-3xl"
                            />
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-black text-white">Schedule Consultation</DialogTitle>
                                <DialogDescription className="text-blue-50 font-medium">
                                    Create a new video meeting with a client.
                                </DialogDescription>
                            </DialogHeader>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="grid gap-3">
                                <Label htmlFor="client" className="text-sm font-bold text-slate-700 dark:text-slate-300">Client</Label>
                                <Select
                                    value={newMeeting.clientId}
                                    onValueChange={(val) => setNewMeeting({ ...newMeeting, clientId: val })}
                                >
                                    <SelectTrigger className="glass-input h-12 rounded-2xl border-slate-200 dark:border-slate-800">
                                        <SelectValue placeholder="Select a client" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-slate-200 dark:border-slate-800">
                                        {clients.map((client: Client) => (
                                            <SelectItem key={client.id} value={client.id} className="rounded-xl">
                                                {client.firstName} {client.lastName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-3">
                                    <Label htmlFor="date" className="text-sm font-bold text-slate-700 dark:text-slate-300">Date</Label>
                                    <GlassInput
                                        id="date"
                                        type="date"
                                        className="h-12"
                                        value={newMeeting.date}
                                        onChange={(e) => setNewMeeting({ ...newMeeting, date: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-3">
                                    <Label htmlFor="time" className="text-sm font-bold text-slate-700 dark:text-slate-300">Time</Label>
                                    <GlassInput
                                        id="time"
                                        type="time"
                                        className="h-12"
                                        value={newMeeting.time}
                                        onChange={(e) => setNewMeeting({ ...newMeeting, time: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid gap-3">
                                <Label htmlFor="duration" className="text-sm font-bold text-slate-700 dark:text-slate-300">Duration</Label>
                                <Select
                                    value={newMeeting.duration}
                                    onValueChange={(val) => setNewMeeting({ ...newMeeting, duration: val })}
                                >
                                    <SelectTrigger className="glass-input h-12 rounded-2xl border-slate-200 dark:border-slate-800">
                                        <SelectValue placeholder="Select duration" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-slate-200 dark:border-slate-800">
                                        <SelectItem value="15" className="rounded-xl">15 Minutes</SelectItem>
                                        <SelectItem value="30" className="rounded-xl">30 Minutes</SelectItem>
                                        <SelectItem value="45" className="rounded-xl">45 Minutes</SelectItem>
                                        <SelectItem value="60" className="rounded-xl">1 Hour</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-3">
                                <Label htmlFor="notes" className="text-sm font-bold text-slate-700 dark:text-slate-300">Notes (Optional)</Label>
                                <Textarea
                                    id="notes"
                                    className="glass-input min-h-[100px] rounded-2xl border-slate-200 dark:border-slate-800"
                                    placeholder="Agenda or instructions..."
                                    value={newMeeting.notes}
                                    onChange={(e) => setNewMeeting({ ...newMeeting, notes: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="p-8 bg-slate-50/50 dark:bg-black/20 flex gap-4">
                            <LiveButton variant="ghost" onClick={() => setIsScheduleOpen(false)} className="flex-1">
                                Cancel
                            </LiveButton>
                            <LiveButton
                                onClick={handleScheduleSubmit}
                                loading={createMutation.isPending}
                                className="flex-1"
                            >
                                Schedule Meeting
                            </LiveButton>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <AnimatedCard className="relative overflow-hidden group border-none bg-blue-50/50 dark:bg-blue-900/10" delay={0.1}>
                    <div className="flex items-center gap-5 relative z-10">
                        <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <Calendar className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-blue-600/70 dark:text-blue-400/70 uppercase tracking-wider">Total</p>
                            <p className="text-3xl font-black text-slate-900 dark:text-white">{consultations.length}</p>
                        </div>
                    </div>
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-10 -mt-10 blur-2xl" />
                </AnimatedCard>

                <AnimatedCard className="relative overflow-hidden group border-none bg-green-50/50 dark:bg-green-900/10" delay={0.2}>
                    <div className="flex items-center gap-5 relative z-10">
                        <div className="w-14 h-14 rounded-2xl bg-green-100 dark:bg-green-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <Clock className="w-7 h-7 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-green-600/70 dark:text-green-400/70 uppercase tracking-wider">Upcoming</p>
                            <p className="text-3xl font-black text-slate-900 dark:text-white">
                                {consultations.filter(c => {
                                    if (!c.scheduledAt) return false;
                                    const d = new Date(c.scheduledAt);
                                    return !isNaN(d.getTime()) && isFuture(d) && c.status !== 'completed';
                                }).length}
                            </p>
                        </div>
                    </div>
                    <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full -mr-10 -mt-10 blur-2xl" />
                </AnimatedCard>

                <AnimatedCard className="relative overflow-hidden group border-none bg-purple-50/50 dark:bg-purple-900/10" delay={0.3}>
                    <div className="flex items-center gap-5 relative z-10">
                        <div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <CheckCircle2 className="w-7 h-7 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-purple-600/70 dark:text-purple-400/70 uppercase tracking-wider">Completed</p>
                            <p className="text-3xl font-black text-slate-900 dark:text-white">
                                {consultations.filter(c => c.status === 'completed').length}
                            </p>
                        </div>
                    </div>
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full -mr-10 -mt-10 blur-2xl" />
                </AnimatedCard>

                <AnimatedCard className="relative overflow-hidden group border-none bg-orange-50/50 dark:bg-orange-900/10" delay={0.4}>
                    <div className="flex items-center gap-5 relative z-10">
                        <div className="w-14 h-14 rounded-2xl bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <Video className="w-7 h-7 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-orange-600/70 dark:text-orange-400/70 uppercase tracking-wider">This Week</p>
                            <p className="text-3xl font-black text-slate-900 dark:text-white">
                                {consultations.filter(c => {
                                    if (!c.scheduledAt) return false;
                                    const date = new Date(c.scheduledAt);
                                    if (isNaN(date.getTime())) return false;
                                    const now = new Date();
                                    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                                    return date >= now && date <= weekFromNow;
                                }).length}
                            </p>
                        </div>
                    </div>
                    <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full -mr-10 -mt-10 blur-2xl" />
                </AnimatedCard>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-4 p-1.5 bg-slate-100 dark:bg-slate-900/50 rounded-2xl w-fit">
                <button
                    onClick={() => setFilterStatus('all')}
                    className={`px-6 py-2.5 rounded-xl font-bold transition-all duration-300 ${filterStatus === 'all'
                        ? 'bg-white dark:bg-brand-600 text-brand-600 dark:text-white shadow-md'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                >
                    All ({consultations.length})
                </button>
                <button
                    onClick={() => setFilterStatus('upcoming')}
                    className={`px-6 py-2.5 rounded-xl font-bold transition-all duration-300 ${filterStatus === 'upcoming'
                        ? 'bg-white dark:bg-brand-600 text-brand-600 dark:text-white shadow-md'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                >
                    Upcoming ({consultations.filter(c => {
                        const d = new Date(c.scheduledAt);
                        return !isNaN(d.getTime()) && isFuture(d) && c.status !== 'completed';
                    }).length})
                </button>
                <button
                    onClick={() => setFilterStatus('past')}
                    className={`px-6 py-2.5 rounded-xl font-bold transition-all duration-300 ${filterStatus === 'past'
                        ? 'bg-white dark:bg-brand-600 text-brand-600 dark:text-white shadow-md'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                >
                    Past ({consultations.filter(c => {
                        const d = new Date(c.scheduledAt);
                        return !isNaN(d.getTime()) && (isPast(d) || c.status === 'completed');
                    }).length})
                </button>
            </div>

            {/* Consultations List */}
            <div className="space-y-4">
                {filteredConsultations.length === 0 ? (
                    <AnimatedCard className="p-16 text-center border-dashed border-2 border-slate-200 dark:border-slate-800 bg-transparent">
                        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Video className="w-10 h-10 text-slate-400" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
                            No consultations found
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto font-medium">
                            {filterStatus === 'all'
                                ? "You haven't scheduled any consultations yet."
                                : `No ${filterStatus} consultations match your current filter.`}
                        </p>
                        <LiveButton
                            className="mt-8"
                            onClick={() => setIsScheduleOpen(true)}
                            icon={Plus}
                        >
                            Schedule Now
                        </LiveButton>
                    </AnimatedCard>
                ) : (
                    filteredConsultations.map((consultation: Consultation, idx: number) => {
                        const d = new Date(consultation.scheduledAt);
                        const isUpcoming = !isNaN(d.getTime()) && isFuture(d);
                        const statusColors = {
                            scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
                            'in-progress': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
                            completed: 'bg-slate-100 text-slate-800 dark:bg-slate-900/20 dark:text-slate-400',
                            cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
                        };

                        return (
                            <motion.div
                                key={consultation.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                            >
                                <AnimatedCard className="group p-0 overflow-hidden border-none" delay={idx * 0.05}>
                                    <div className="flex flex-col md:flex-row md:items-center">
                                        <div className="p-6 flex items-center gap-5 flex-1">
                                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-600 to-blue-500 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform duration-300">
                                                {consultation.clientName?.charAt(0) || '?'}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3">
                                                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                                                        {consultation.clientName || 'Unknown Client'}
                                                    </h3>
                                                    <Badge className={`${statusColors[consultation.status]} border-none font-bold px-3 py-1 rounded-lg`}>
                                                        {consultation.status}
                                                    </Badge>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-600 dark:text-slate-400 mt-2 font-medium">
                                                    <span className="flex items-center gap-2">
                                                        <Calendar className="w-4 h-4 text-brand-500" />
                                                        {(() => {
                                                            try {
                                                                return format(new Date(consultation.scheduledAt), 'MMM d, yyyy');
                                                            } catch (e) { return 'Invalid Date'; }
                                                        })()}
                                                    </span>
                                                    <span className="flex items-center gap-2">
                                                        <Clock className="w-4 h-4 text-brand-500" />
                                                        {(() => {
                                                            try {
                                                                return format(new Date(consultation.scheduledAt), 'HH:mm');
                                                            } catch (e) { return '--:--'; }
                                                        })()}
                                                    </span>
                                                    <span className="flex items-center gap-2">
                                                        <Clock className="w-4 h-4 text-brand-500" />
                                                        {consultation.duration} min
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-6 bg-slate-50/50 dark:bg-white/5 md:bg-transparent flex items-center gap-3 md:border-l border-slate-100 dark:border-white/5">
                                            {isUpcoming && consultation.status === 'scheduled' && (
                                                <LiveButton
                                                    onClick={() => startConsultation(consultation)}
                                                    variant="primary"
                                                    icon={Video}
                                                    size="sm"
                                                >
                                                    Join
                                                </LiveButton>
                                            )}
                                            <button
                                                onClick={() => copyMeetingLink(consultation.meetingId)}
                                                className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-900/20 dark:hover:text-brand-400 transition-all"
                                                title="Copy Link"
                                            >
                                                <Copy className="w-5 h-5" />
                                            </button>
                                            {consultation.status === 'scheduled' && (
                                                <button
                                                    onClick={() => deleteMutation.mutate(consultation.id)}
                                                    className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-all"
                                                    title="Cancel Consultation"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {consultation.notes && (
                                        <div className="p-4 mx-6 mb-6 text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-black/20 rounded-2xl border border-slate-100 dark:border-white/5 italic">
                                            "{consultation.notes}"
                                        </div>
                                    )}
                                </AnimatedCard>
                            </motion.div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
