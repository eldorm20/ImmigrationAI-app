import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
    Search,
    MoreHorizontal,
    Mail,
    Phone,
    ArrowUpRight,
    Briefcase,
    Calendar,
    DollarSign,
    Users,
    Star,
    Shield,
    FileText,
    MessageSquare,
    ChevronRight
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
    const [searchTerm, setSearchTerm] = useState("");

    const { data: clients, isLoading } = useQuery<Client[]>({
        queryKey: ["/practice/clients"],
        queryFn: async () => {
            const res = await fetch("/api/clients");
            if (!res.ok) throw new Error("Failed to fetch clients");
            return res.json();
        }
    });

    const filteredClients = clients?.filter(client => {
        const searchLower = searchTerm.toLowerCase();
        return (
            client.firstName.toLowerCase().includes(searchLower) ||
            client.lastName.toLowerCase().includes(searchLower) ||
            client.email.toLowerCase().includes(searchLower)
        );
    }) || [];

    return (
        <div className="space-y-8 pb-12">
            <div className="flex justify-between items-center bg-white/30 dark:bg-slate-900/30 backdrop-blur-md p-6 rounded-3xl border border-white/20 dark:border-white/5 shadow-xl">
                <div>
                    <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Client Hub</h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Manage institutional knowledge and client relations</p>
                </div>
                <LiveButton icon={Plus} size="lg" className="rounded-2xl">
                    Register Client
                </LiveButton>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <AnimatedCard className="bg-gradient-to-br from-blue-500/10 to-transparent border-none shadow-lg">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Network</p>
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
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Mandates</p>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                                {clients?.reduce((acc, c) => acc + (c.status === 'active' ? 1 : 0), 0) || 0}
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
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Potential Value</p>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                                {clients?.reduce((acc, c) => acc + (c.status === 'lead' ? 1 : 0), 0) || 0}
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
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Practice Revenue</p>
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
                        placeholder="Search roster by name or email..."
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
                                <th className="px-8 py-5 font-bold text-slate-500 uppercase text-[10px] tracking-[0.2em]">Client Identity</th>
                                <th className="px-8 py-5 font-bold text-slate-500 uppercase text-[10px] tracking-[0.2em]">Contact Node</th>
                                <th className="px-8 py-5 font-bold text-slate-500 uppercase text-[10px] tracking-[0.2em]">Engagement</th>
                                <th className="px-8 py-5 font-bold text-slate-500 uppercase text-[10px] tracking-[0.2em]">Acquisition</th>
                                <th className="px-8 py-5 text-right font-bold text-slate-500 uppercase text-[10px] tracking-[0.2em]">Last Sync</th>
                                <th className="px-8 py-5 w-[80px]"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                            {isLoading ? (
                                <tr><td colSpan={6} className="p-20 text-center text-slate-400 animate-pulse font-medium">Accessing client records...</td></tr>
                            ) : filteredClients.length === 0 ? (
                                <tr><td colSpan={6} className="p-20 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <Briefcase size={48} className="text-slate-200 dark:text-slate-800" />
                                        <p className="text-slate-500 font-medium">No results found in your network.</p>
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
                                                        {client.firstName[0]}{client.lastName[0]}
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
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${client.status.toLowerCase() === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                    client.status.toLowerCase() === 'lead' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                        'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                                                }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${client.status.toLowerCase() === 'active' ? 'bg-green-500' : 'bg-current'}`} />
                                                {client.status}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                                                {client.source}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex flex-col items-end">
                                                <div className="flex items-center gap-1.5 text-sm font-bold text-slate-500">
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    {format(new Date(client.lastInteraction), 'MMM d, yyyy')}
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
                                                        <Mail size={16} /> Copy Contact Info
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800 my-1" />
                                                    <DropdownMenuItem className="rounded-xl flex items-center gap-3 p-3 cursor-pointer">
                                                        <Users size={16} /> View Profile
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="rounded-xl flex items-center gap-3 p-3 cursor-pointer">
                                                        <FileText size={16} /> Examine Case File
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="rounded-xl flex items-center gap-3 p-3 cursor-pointer text-brand-600 font-bold">
                                                        <MessageSquare size={16} /> Dispatch Message
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
        </div>
    );
}

const Plus = () => <Users size={20} />;
