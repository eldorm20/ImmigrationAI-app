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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

    const filteredConsultations = consultations.filter(consultation => {
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
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white">Video Consultations</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        Manage your client meetings and video calls
                    </p>
                </div>

                <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-gradient-to-r from-brand-600 to-blue-500 hover:from-brand-700 hover:to-blue-600 text-white font-bold">
                            <Plus className="w-5 h-5 mr-2" />
                            Schedule New
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Schedule Consultation</DialogTitle>
                            <DialogDescription>
                                Create a new video meeting with a client.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="client">Client</Label>
                                <Select
                                    value={newMeeting.clientId}
                                    onValueChange={(val) => setNewMeeting({ ...newMeeting, clientId: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a client" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {clients.map((client: Client) => (
                                            <SelectItem key={client.id} value={client.id}>
                                                {client.firstName} {client.lastName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="date">Date</Label>
                                    <Input
                                        id="date"
                                        type="date"
                                        value={newMeeting.date}
                                        onChange={(e) => setNewMeeting({ ...newMeeting, date: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="time">Time</Label>
                                    <Input
                                        id="time"
                                        type="time"
                                        value={newMeeting.time}
                                        onChange={(e) => setNewMeeting({ ...newMeeting, time: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="duration">Duration</Label>
                                <Select
                                    value={newMeeting.duration}
                                    onValueChange={(val) => setNewMeeting({ ...newMeeting, duration: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select duration" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="15">15 Minutes</SelectItem>
                                        <SelectItem value="30">30 Minutes</SelectItem>
                                        <SelectItem value="45">45 Minutes</SelectItem>
                                        <SelectItem value="60">1 Hour</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="notes">Notes (Optional)</Label>
                                <Textarea
                                    id="notes"
                                    placeholder="Agenda or instructions..."
                                    value={newMeeting.notes}
                                    onChange={(e) => setNewMeeting({ ...newMeeting, notes: e.target.value })}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setIsScheduleOpen(false)}>Cancel</Button>
                            <Button onClick={handleScheduleSubmit} disabled={createMutation.isPending}>
                                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Schedule Meeting
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="glass-card p-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                            <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Total</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white">{consultations.length}</p>
                        </div>
                    </div>
                </Card>

                <Card className="glass-card p-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                            <Clock className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Upcoming</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white">
                                {consultations.filter(c => {
                                    if (!c.scheduledAt) return false;
                                    const d = new Date(c.scheduledAt);
                                    return !isNaN(d.getTime()) && isFuture(d) && c.status !== 'completed';
                                }).length}
                            </p>
                        </div>
                    </div>
                </Card>

                <Card className="glass-card p-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                            <CheckCircle2 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Completed</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white">
                                {consultations.filter(c => c.status === 'completed').length}
                            </p>
                        </div>
                    </div>
                </Card>

                <Card className="glass-card p-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                            <Video className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">This Week</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white">
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
                </Card>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2">
                <button
                    onClick={() => setFilterStatus('all')}
                    className={`px-6 py-2 rounded-full font-semibold transition-all ${filterStatus === 'all'
                        ? 'bg-brand-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                >
                    All ({consultations.length})
                </button>
                <button
                    onClick={() => setFilterStatus('upcoming')}
                    className={`px-6 py-2 rounded-full font-semibold transition-all ${filterStatus === 'upcoming'
                        ? 'bg-brand-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                >
                    Upcoming ({consultations.filter(c => {
                        const d = new Date(c.scheduledAt);
                        return !isNaN(d.getTime()) && isFuture(d) && c.status !== 'completed';
                    }).length})
                </button>
                <button
                    onClick={() => setFilterStatus('past')}
                    className={`px-6 py-2 rounded-full font-semibold transition-all ${filterStatus === 'past'
                        ? 'bg-brand-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
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
                    <Card className="glass-card p-12 text-center">
                        <Video className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                            No consultations {filterStatus !== 'all' && filterStatus}
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400">
                            Schedule your first video consultation with a client
                        </p>
                        <Button
                            className="mt-4 bg-brand-600 text-white"
                            onClick={() => setIsScheduleOpen(true)}
                        >
                            <Plus className="w-4 h-4 mr-2" /> Schedule Now
                        </Button>
                    </Card>
                ) : (
                    filteredConsultations.map((consultation, idx) => {
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
                                <Card className="glass-card p-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-brand-600 to-blue-500 flex items-center justify-center text-white font-bold text-xl">
                                                {consultation.clientName?.charAt(0) || '?'}
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                                    {consultation.clientName || 'Unknown Client'}
                                                </h3>
                                                <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400 mt-1">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-4 h-4" />
                                                        {(() => {
                                                            try {
                                                                return format(new Date(consultation.scheduledAt), 'MMM d, yyyy');
                                                            } catch (e) { return 'Invalid Date'; }
                                                        })()}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-4 h-4" />
                                                        {(() => {
                                                            try {
                                                                return format(new Date(consultation.scheduledAt), 'HH:mm');
                                                            } catch (e) { return '--:--'; }
                                                        })()}
                                                    </span>
                                                    <span>{consultation.duration} min</span>
                                                </div>
                                            </div>
                                            <Badge className={statusColors[consultation.status]}>
                                                {consultation.status}
                                            </Badge>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {isUpcoming && consultation.status === 'scheduled' && (
                                                <Button
                                                    onClick={() => startConsultation(consultation)}
                                                    className="bg-gradient-to-r from-brand-600 to-blue-500 hover:from-brand-700 hover:to-blue-600 text-white"
                                                >
                                                    <Video className="w-4 h-4 mr-2" />
                                                    Join
                                                </Button>
                                            )}
                                            <Button
                                                onClick={() => copyMeetingLink(consultation.meetingId)}
                                                variant="outline"
                                                size="icon"
                                            >
                                                <Copy className="w-4 h-4" />
                                            </Button>
                                            {consultation.status === 'scheduled' && (
                                                <Button
                                                    onClick={() => deleteMutation.mutate(consultation.id)}
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-red-600 hover:text-red-700"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {consultation.notes && (
                                        <p className="mt-4 text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg">
                                            {consultation.notes}
                                        </p>
                                    )}
                                </Card>
                            </motion.div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
