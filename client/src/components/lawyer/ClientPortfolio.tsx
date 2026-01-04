import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import {
    Search,
    MoreHorizontal,
    Mail,
    Phone,
    Briefcase,
    Calendar,
    DollarSign,
    Users,
    Star,
    Shield,
    FileText,
    MessageSquare,
    Plus,
    CheckCircle,
    X
} from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { LiveButton, AnimatedCard, GlassInput } from "@/components/ui/live-elements";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Client {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    avatar?: string;
    status: string;
    lastInteraction: string;
    totalSpent: number;
    caseCount: number;
    source: string;
}

export default function ClientPortfolio() {
    const { toast } = useToast();
    const { t } = useI18n();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);

    // New Client Form State
    const [newClient, setNewClient] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
    });

    const { data: clients, isLoading } = useQuery<Client[]>({
        queryKey: ["/clients"],
        queryFn: () => apiRequest<Client[]>("/clients")
    });

    const createClientMutation = useMutation({
        mutationFn: async (data: typeof newClient) => {
            return apiRequest("/clients", {
                method: "POST",
                body: JSON.stringify(data)
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/clients"] });
            toast({
                title: t.common?.success || "Success",
                description: `${newClient.firstName} has been added to your portfolio.`,
                className: "bg-green-50 text-green-900 border-green-200"
            });
            setIsRegisterOpen(false);
            setNewClient({ firstName: "", lastName: "", email: "", phone: "" });
        },
        onError: (err: any) => {
            toast({
                title: t.common?.error || "Error",
                description: err.message || "Could not register client.",
                variant: "destructive"
            });
        }
    });

    const handleRegister = (e: React.FormEvent) => {
        e.preventDefault();
        createClientMutation.mutate(newClient);
    };

    const filteredClients = clients?.filter(client => {
        const searchLower = searchTerm.toLowerCase();
        return (
            (client.firstName || "").toLowerCase().includes(searchLower) ||
            (client.lastName || "").toLowerCase().includes(searchLower) ||
            (client.email || "").toLowerCase().includes(searchLower)
        );
    }) || [];

    return (
        <div className="space-y-8 pb-12">
            <div className="flex justify-between items-center bg-white/30 dark:bg-slate-900/30 backdrop-blur-md p-6 rounded-3xl border border-white/20 dark:border-white/5 shadow-xl">
                <div>
                    <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{t.lawyer.clientsHub.title}</h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">{t.lawyer.clientsHub.subtitle}</p>
                </div>
                <LiveButton onClick={() => setIsRegisterOpen(true)} icon={Plus} size="lg" className="rounded-2xl">
                    {t.lawyer.clientsHub.register}
                </LiveButton>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <AnimatedCard className="bg-gradient-to-br from-blue-500/10 to-transparent border-none shadow-lg">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.lawyer.clientsHub.totalNetwork}</p>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white">{clients?.length || 0}</h3>
                        </div>
                        <div className="p-3 rounded-2xl bg-blue-500/20 text-blue-600">
                            <Users size={20} />
                        </div>
                    </div>
                </AnimatedCard>

                <AnimatedCard className="bg-gradient-to-br from-emerald-500/10 to-transparent border-none shadow-lg">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.lawyer.clientsHub.activeMandates}</p>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                                {clients?.reduce((acc, c) => acc + ((c.status || '').toLowerCase() === 'active' ? 1 : 0), 0) || 0}
                            </h3>
                        </div>
                        <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-600">
                            <Shield size={20} />
                        </div>
                    </div>
                </AnimatedCard>

                <AnimatedCard className="bg-gradient-to-br from-amber-500/10 to-transparent border-none shadow-lg">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.lawyer.clientsHub.potentialValue}</p>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                                {clients?.reduce((acc, c) => acc + ((c.status || '').toLowerCase() === 'lead' ? 1 : 0), 0) || 0}
                            </h3>
                        </div>
                        <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-600">
                            <Star size={20} />
                        </div>
                    </div>
                </AnimatedCard>

                <AnimatedCard className="bg-gradient-to-br from-brand-600/10 to-transparent border-none shadow-lg">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.lawyer.clientsHub.practiceRevenue}</p>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                                ${(clients?.reduce((acc, c) => acc + (c.totalSpent || 0), 0) || 0).toLocaleString()}
                            </h3>
                        </div>
                        <div className="p-3 rounded-2xl bg-brand-500/20 text-brand-600">
                            <DollarSign size={20} />
                        </div>
                    </div>
                </AnimatedCard>
            </div>

            <div className="flex flex-col md:flex-row justify-between gap-4 items-center">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <GlassInput
                        className="pl-12 w-full"
                        placeholder={t.lawyer.clientsHub.search}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <AnimatedCard className="p-0 border-none bg-white/40 dark:bg-slate-950/40 backdrop-blur-xl shadow-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                                <th className="px-8 py-5 font-bold text-slate-500 uppercase text-[10px] tracking-[0.2em]">{t.lawyer.clientsHub.table.identity}</th>
                                <th className="px-8 py-5 font-bold text-slate-500 uppercase text-[10px] tracking-[0.2em]">{t.lawyer.clientsHub.table.contact}</th>
                                <th className="px-8 py-5 font-bold text-slate-500 uppercase text-[10px] tracking-[0.2em]">{t.lawyer.clientsHub.table.engagement}</th>
                                <th className="px-8 py-5 font-bold text-slate-500 uppercase text-[10px] tracking-[0.2em]">{t.lawyer.clientsHub.table.acquisition}</th>
                                <th className="px-8 py-5 text-right font-bold text-slate-500 uppercase text-[10px] tracking-[0.2em]">{t.lawyer.clientsHub.table.lastSync}</th>
                                <th className="px-8 py-5 w-[80px]"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                            {isLoading ? (
                                <tr><td colSpan={6} className="p-20 text-center text-slate-400 animate-pulse font-medium">{t.lawyer.clientsHub.loading}</td></tr>
                            ) : filteredClients.length === 0 ? (
                                <tr><td colSpan={6} className="p-20 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <Briefcase size={48} className="text-slate-200 dark:text-slate-800" />
                                        <p className="text-slate-500 font-medium">{t.lawyer.clientsHub.empty}</p>
                                    </div>
                                </td></tr>
                            ) : (
                                filteredClients.map((client, idx) => (
                                    <motion.tr
                                        key={client.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.03 }}
                                        className="group hover:bg-brand-50/30 dark:hover:bg-brand-900/10 transition-colors cursor-pointer"
                                    >
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <Avatar className="w-12 h-12 border-2 border-white dark:border-slate-800 shadow-sm">
                                                    <AvatarImage src={client.avatar} alt={client.firstName} />
                                                    <AvatarFallback className="bg-gradient-to-br from-brand-600 to-blue-500 text-white font-bold">
                                                        {(client.firstName || "?")[0]}{(client.lastName || "?")[0]}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-extrabold text-slate-900 dark:text-white text-lg leading-tight">{client.firstName} {client.lastName}</p>
                                                    <p className="text-[10px] font-black text-brand-600 uppercase tracking-wider mt-1">{client.caseCount} Active Mandate{client.caseCount !== 1 ? 's' : ''}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col gap-1.5 text-sm">
                                                <div className="flex items-center gap-2 font-semibold text-slate-600 dark:text-slate-300">
                                                    <Mail className="h-4 w-4 text-brand-500" />
                                                    <span>{client.email}</span>
                                                </div>
                                                {client.phone && (
                                                    <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                                                        <Phone className="h-3 w-3" />
                                                        <span>{client.phone}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${(client.status || '').toLowerCase() === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                (client.status || '').toLowerCase() === 'lead' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                                                }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${(client.status || '').toLowerCase() === 'active' ? 'bg-green-500' : 'bg-current'}`} />
                                                {client.status || 'Unknown'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                                                {client.source || 'Direct'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex flex-col items-end">
                                                <div className="flex items-center gap-1.5 text-sm font-bold text-slate-500">
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    {client.lastInteraction ? format(new Date(client.lastInteraction), 'MMM d, yyyy') : 'Never'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors opacity-0 group-hover:opacity-100">
                                                        <MoreHorizontal className="h-5 w-5 text-slate-400" />
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl border-none shadow-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl">
                                                    <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-3 py-2">Executive Actions</DropdownMenuLabel>
                                                    <DropdownMenuItem className="rounded-xl flex items-center gap-3 p-3 cursor-pointer" onClick={() => navigator.clipboard.writeText(client.email)}>
                                                        <Mail size={16} /> {t.lawyer.clientsHub.actions.copy}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800 my-1" />
                                                    <DropdownMenuItem className="rounded-xl flex items-center gap-3 p-3 cursor-pointer">
                                                        <Users size={16} /> {t.lawyer.clientsHub.actions.profile}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="rounded-xl flex items-center gap-3 p-3 cursor-pointer">
                                                        <FileText size={16} /> {t.lawyer.clientsHub.actions.file}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="rounded-xl flex items-center gap-3 p-3 cursor-pointer text-brand-600 font-bold">
                                                        <MessageSquare size={16} /> {t.lawyer.clientsHub.actions.msg}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </motion.tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </AnimatedCard>

            {/* Register Client Modal */}
            <AnimatePresence>
                {isRegisterOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-950/40 backdrop-blur-md"
                            onClick={() => setIsRegisterOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden relative z-10 border border-white/20 dark:border-white/5"
                        >
                            <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-brand-600 to-blue-500">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-black text-2xl text-white">{t.lawyer.clientsHub.newClient}</h3>
                                        <p className="text-brand-100 text-sm font-medium">{t.lawyer.clientsHub.addDesc}</p>
                                    </div>
                                    <button onClick={() => setIsRegisterOpen(false)} className="text-white/70 hover:text-white transition-colors">
                                        <X size={24} />
                                    </button>
                                </div>
                            </div>
                            <form onSubmit={handleRegister} className="p-8 space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">{t.settings?.firstName || "First Name"}</label>
                                        <GlassInput required className="w-full"
                                            value={newClient.firstName} onChange={e => setNewClient({ ...newClient, firstName: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">{t.settings?.lastName || "Last Name"}</label>
                                        <GlassInput required className="w-full"
                                            value={newClient.lastName} onChange={e => setNewClient({ ...newClient, lastName: e.target.value })} />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">{t.settings?.emailAddress || "Email Address"}</label>
                                    <GlassInput type="email" required className="w-full"
                                        value={newClient.email} onChange={e => setNewClient({ ...newClient, email: e.target.value })} />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">{t.settings?.phoneNumber || "Phone Number"} (Optional)</label>
                                    <GlassInput className="w-full"
                                        value={newClient.phone} onChange={e => setNewClient({ ...newClient, phone: e.target.value })} />
                                </div>

                                <div className="flex justify-end gap-3 pt-4">
                                    <LiveButton variant="ghost" type="button" onClick={() => setIsRegisterOpen(false)}>{t.settings?.cancel || "Cancel"}</LiveButton>
                                    <LiveButton icon={CheckCircle} className="px-8" type="submit" disabled={createClientMutation.isPending}>
                                        {createClientMutation.isPending ? 'Registering...' : 'Complete Registration'}
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
