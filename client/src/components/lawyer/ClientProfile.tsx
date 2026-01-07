import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    User,
    MapPin,
    Phone,
    Mail,
    Calendar,
    Briefcase,
    FileText,
    Clock,
    ShieldAlert,
    X,
    Loader2,
    AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { motion } from 'framer-motion';

interface ClientProfileProps {
    clientId: string | null;
    onClose: () => void;
}

export function ClientProfile({ clientId, onClose }: ClientProfileProps) {
    const { data: client, isLoading, error } = useQuery({
        queryKey: ['/clients', clientId],
        queryFn: () => apiRequest<any>(`/clients/${clientId}`),
        enabled: !!clientId,
    });

    if (!clientId) return null;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full py-20">
                <div className="text-center space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin text-brand-500 mx-auto" />
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Loading client profile...</p>
                </div>
            </div>
        );
    }

    if (error || !client) {
        return (
            <div className="flex items-center justify-center h-full py-20">
                <div className="text-center space-y-4 max-w-md">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Failed to Load Profile</h3>
                    <p className="text-slate-500 dark:text-slate-400">
                        {error instanceof Error ? error.message : "Could not retrieve client information. Please try again."}
                    </p>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    }

    const clientName = `${client.firstName || ''} ${client.lastName || ''}`.trim() || client.name || 'Unknown Client';

    return (
        <div className="h-full flex flex-col">
            {/* Header with Close Button */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-brand-600 to-blue-500">
                <div>
                    <h2 className="text-2xl font-black text-white">Client Profile</h2>
                    <p className="text-brand-100 text-sm font-medium">Detailed client information</p>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                    <X size={24} />
                </button>
            </div>

            <ScrollArea className="flex-1">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 space-y-8"
                >
                    {/* Header Section */}
                    <div className="flex items-start gap-6">
                        <Avatar className="h-24 w-24 border-4 border-brand-500/20 shadow-xl">
                            <AvatarImage src={client.avatar} alt={clientName} />
                            <AvatarFallback className="text-2xl bg-gradient-to-br from-brand-600 to-blue-500 text-white font-bold">
                                {clientName.charAt(0)}
                            </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{clientName}</h2>
                                    <p className="text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-1">
                                        <MapPin className="h-4 w-4" />
                                        {client.nationality || client.country || "Nationality not specified"}
                                    </p>
                                </div>
                                <Badge
                                    variant={(client.status || '').toLowerCase() === 'active' ? 'default' : 'secondary'}
                                    className="px-3 py-1 text-xs font-bold"
                                >
                                    {client.status || "Unknown Status"}
                                </Badge>
                            </div>

                            <div className="flex flex-wrap gap-3 mt-4">
                                {client.email && (
                                    <div className="flex items-center gap-2 text-sm bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">
                                        <Mail className="h-3.5 w-3.5 text-brand-500" />
                                        <span className="font-medium text-slate-700 dark:text-slate-300">{client.email}</span>
                                    </div>
                                )}
                                {client.phone && (
                                    <div className="flex items-center gap-2 text-sm bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">
                                        <Phone className="h-3.5 w-3.5 text-brand-500" />
                                        <span className="font-medium text-slate-700 dark:text-slate-300">{client.phone}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Application Info */}
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h3 className="font-semibold flex items-center gap-2 text-brand-600 dark:text-brand-400">
                                <Briefcase className="h-4 w-4" />
                                Application Details
                            </h3>
                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 space-y-3 border border-slate-200 dark:border-slate-800">
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <span className="text-slate-500 dark:text-slate-400 font-medium">Visa Type:</span>
                                    <span className="font-bold text-right text-slate-900 dark:text-white">{client.visaType || client.visaInterest || "N/A"}</span>

                                    <span className="text-slate-500 dark:text-slate-400 font-medium">Target Country:</span>
                                    <span className="font-bold text-right text-slate-900 dark:text-white">{client.country || "UK"}</span>

                                    <span className="text-slate-500 dark:text-slate-400 font-medium">Application Date:</span>
                                    <span className="font-bold text-right text-slate-900 dark:text-white">
                                        {client.date || client.createdAt ? format(new Date(client.date || client.createdAt), 'MMM d, yyyy') : "N/A"}
                                    </span>

                                    <span className="text-slate-500 dark:text-slate-400 font-medium">Cases:</span>
                                    <span className="font-bold text-right text-slate-900 dark:text-white">{client.caseCount || 0}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-semibold flex items-center gap-2 text-brand-600 dark:text-brand-400">
                                <Clock className="h-4 w-4" />
                                Status & Progress
                            </h3>
                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 space-y-3 border border-slate-200 dark:border-slate-800">
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <span className="text-slate-500 dark:text-slate-400 font-medium">Progress:</span>
                                    <span className="font-bold text-right text-slate-900 dark:text-white">{client.progress || 0}%</span>

                                    <span className="text-slate-500 dark:text-slate-400 font-medium">Next Step:</span>
                                    <span className="font-bold text-right truncate pl-2 text-slate-900 dark:text-white" title={client.nextStep}>
                                        {client.nextStep || "None"}
                                    </span>

                                    <span className="text-slate-500 dark:text-slate-400 font-medium">Last Activity:</span>
                                    <span className="font-bold text-right text-slate-900 dark:text-white">
                                        {client.lastActive || client.lastInteraction ? format(new Date(client.lastActive || client.lastInteraction), 'MMM d, yyyy') : "Recently"}
                                    </span>

                                    <span className="text-slate-500 dark:text-slate-400 font-medium">Total Spent:</span>
                                    <span className="font-bold text-right text-green-600 dark:text-green-400">
                                        ${(client.totalSpent || 0).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Notes / Additional Info */}
                    <div className="space-y-4">
                        <h3 className="font-semibold flex items-center gap-2 text-brand-600 dark:text-brand-400">
                            <FileText className="h-4 w-4" />
                            Notes
                        </h3>
                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 min-h-[100px] text-sm">
                            {client.notes ? (
                                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{client.notes}</p>
                            ) : (
                                <p className="italic text-slate-400">No notes available for this client.</p>
                            )}
                        </div>
                    </div>

                    {/* Source Information */}
                    {client.source && (
                        <div className="space-y-4">
                            <h3 className="font-semibold flex items-center gap-2 text-brand-600 dark:text-brand-400">
                                <ShieldAlert className="h-4 w-4" />
                                Additional Information
                            </h3>
                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <span className="text-slate-500 dark:text-slate-400 font-medium">Source:</span>
                                    <span className="font-bold text-right text-slate-900 dark:text-white">{client.source}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>
            </ScrollArea>
        </div>
    );
}
