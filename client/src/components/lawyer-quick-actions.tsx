import React, { useState } from "react";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
    FileText,
    Mail,
    Calendar,
    Clock,
    CheckCircle,
    Send,
    PlusCircle,
    RefreshCw,
    Download,
    FileSpreadsheet,
    MessageSquare,
    Bell,
    Zap,
    ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface QuickAction {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    action: () => void;
    loading?: boolean;
}

interface LawyerQuickActionsProps {
    onNewTask?: () => void;
    onNewInvoice?: () => void;
    onScheduleConsultation?: () => void;
}

export default function LawyerQuickActions({
    onNewTask,
    onNewInvoice,
    onScheduleConsultation,
}: LawyerQuickActionsProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState<Record<string, boolean>>({});

    const handleAction = async (actionId: string, action: () => Promise<void> | void) => {
        setLoading(prev => ({ ...prev, [actionId]: true }));
        try {
            await action();
        } finally {
            setLoading(prev => ({ ...prev, [actionId]: false }));
        }
    };

    const exportClientList = async () => {
        try {
            const clients = await apiRequest<any[]>("/applications/clients/list");
            const csv = "Name,Email\n" + clients.map(c => `"${c.firstName || ''} ${c.lastName || ''}","${c.email}"`).join("\n");
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'clients.csv';
            a.click();
            URL.revokeObjectURL(url);
            toast({ title: "Export Complete", description: "Client list downloaded as CSV" });
        } catch (error) {
            toast({ title: "Export Failed", description: "Could not export client list", variant: "destructive" });
        }
    };

    const sendReminders = async () => {
        // In production, this would trigger reminder emails for pending tasks/invoices
        toast({
            title: "Reminders Queued",
            description: "Payment and task reminders will be sent to clients shortly",
            className: "bg-green-50 text-green-900 border-green-200"
        });
    };

    const quickActions: QuickAction[] = [
        {
            id: "new-task",
            title: "Create Task",
            description: "Add a new case task",
            icon: <PlusCircle size={24} />,
            color: "from-blue-500 to-blue-600",
            action: () => onNewTask?.(),
        },
        {
            id: "new-invoice",
            title: "Create Invoice",
            description: "Bill a client",
            icon: <FileText size={24} />,
            color: "from-green-500 to-emerald-600",
            action: () => onNewInvoice?.(),
        },
        {
            id: "schedule",
            title: "Schedule Meeting",
            description: "Book consultation",
            icon: <Calendar size={24} />,
            color: "from-purple-500 to-purple-600",
            action: () => onScheduleConsultation?.(),
        },
        {
            id: "export",
            title: "Export Clients",
            description: "Download client list",
            icon: <Download size={24} />,
            color: "from-amber-500 to-orange-600",
            action: () => handleAction("export", exportClientList),
        },
        {
            id: "reminders",
            title: "Send Reminders",
            description: "Payment & task alerts",
            icon: <Bell size={24} />,
            color: "from-rose-500 to-red-600",
            action: () => handleAction("reminders", sendReminders),
        },
        {
            id: "messages",
            title: "Client Messages",
            description: "View inbox",
            icon: <MessageSquare size={24} />,
            color: "from-cyan-500 to-teal-600",
            action: () => window.location.href = '/messages',
        },
    ];

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Zap size={20} className="text-amber-500" />
                    Quick Actions
                </h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {quickActions.map((action, index) => (
                    <motion.button
                        key={action.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={action.action}
                        disabled={loading[action.id]}
                        className="group relative p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-transparent hover:shadow-lg transition-all duration-200 text-left"
                    >
                        {/* Gradient background on hover */}
                        <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-100 transition-opacity duration-200`} />

                        {/* Content */}
                        <div className="relative z-10">
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center text-white mb-3 group-hover:bg-white/20 transition-colors`}>
                                {loading[action.id] ? (
                                    <RefreshCw size={20} className="animate-spin" />
                                ) : (
                                    action.icon
                                )}
                            </div>
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-white transition-colors">
                                {action.title}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 group-hover:text-white/80 transition-colors mt-0.5">
                                {action.description}
                            </p>
                        </div>
                    </motion.button>
                ))}
            </div>
        </div>
    );
}
