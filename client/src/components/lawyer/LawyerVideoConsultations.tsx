// Lawyer Video Consultations Page - Management and Scheduling

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/lib/i18n';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
    CheckCircle2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format, isPast, isFuture } from 'date-fns';

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

export function LawyerVideoConsultations() {
    const { user } = useAuth();
    const { t } = useI18n();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [activeConsultation, setActiveConsultation] = useState<Consultation | null>(null);
    const [filterStatus, setFilterStatus] = useState<'all' | 'upcoming' | 'past'>('all');

    // Fetch consultations
    const { data: consultations = [], isLoading } = useQuery({
        queryKey: ['/consultations', 'lawyer'],
        queryFn: () => apiRequest<Consultation[]>('/consultations?role=lawyer'),
    });

    // Create consultation mutation
    const createMutation = useMutation({
        mutationFn: (data: { clientId: string; scheduledAt: string; duration: number }) =>
            apiRequest('/consultations', {
                method: 'POST',
                body: JSON.stringify(data),
            }),
        onSuccess: () => {
            toast({
                title: t.common?.success || 'Success',
                description: 'Consultation scheduled successfully!',
                className: 'bg-green-50 text-green-900 border-green-200'
            });
            queryClient.invalidateQueries({ queryKey: ['/consultations'] });
        },
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
        if (filterStatus === 'upcoming') {
            return isFuture(new Date(consultation.scheduledAt)) && consultation.status !== 'completed';
        }
        if (filterStatus === 'past') {
            return isPast(new Date(consultation.scheduledAt)) || consultation.status === 'completed';
        }
        return true;
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
                <Button className="bg-gradient-to-r from-brand-600 to-blue-500 hover:from-brand-700 hover:to-blue-600 text-white font-bold">
                    <Plus className="w-5 h-5 mr-2" />
                    Schedule New
                </Button>
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
                                {consultations.filter(c => isFuture(new Date(c.scheduledAt)) && c.status !== 'completed').length}
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
                                    const date = new Date(c.scheduledAt);
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
                    Upcoming ({consultations.filter(c => isFuture(new Date(c.scheduledAt)) && c.status !== 'completed').length})
                </button>
                <button
                    onClick={() => setFilterStatus('past')}
                    className={`px-6 py-2 rounded-full font-semibold transition-all ${filterStatus === 'past'
                            ? 'bg-brand-600 text-white'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                >
                    Past ({consultations.filter(c => isPast(new Date(c.scheduledAt)) || c.status === 'completed').length})
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
                    </Card>
                ) : (
                    filteredConsultations.map((consultation, idx) => {
                        const isUpcoming = isFuture(new Date(consultation.scheduledAt));
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
                                                {consultation.clientName.charAt(0)}
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                                    {consultation.clientName}
                                                </h3>
                                                <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400 mt-1">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-4 h-4" />
                                                        {format(new Date(consultation.scheduledAt), 'MMM d, yyyy')}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-4 h-4" />
                                                        {format(new Date(consultation.scheduledAt), 'HH:mm')}
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
