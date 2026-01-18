import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
    FileText, MessageSquare, CheckCircle2, Clock, Upload,
    ChevronRight, LogOut, Shield, Download, Send
} from "lucide-react";
import { AnimatedCard, LiveButton, GlassInput } from "@/components/ui/live-elements";
import { motion, AnimatePresence } from "framer-motion";

export default function PortalDashboard() {
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<"overview" | "documents" | "messages">("overview");
    const [messageInput, setMessageInput] = useState("");

    const token = localStorage.getItem("portal_token");

    useEffect(() => {
        if (!token) setLocation("/portal/login");
    }, [token, setLocation]);

    const headers = { "X-Portal-Token": token || "" };

    const { data: statusData } = useQuery({
        queryKey: ["portal-status"],
        queryFn: async () => {
            const res = await fetch("/api/portal/status", { headers });
            if (!res.ok) throw new Error("Unauthorized");
            return res.json();
        }
    });

    const { data: timelineData } = useQuery({
        queryKey: ["portal-timeline"],
        queryFn: async () => {
            const res = await fetch("/api/portal/timeline", { headers });
            return res.json();
        }
    });

    const { data: documentsData } = useQuery({
        queryKey: ["portal-documents"],
        queryFn: async () => {
            const res = await fetch("/api/portal/documents", { headers });
            return res.json();
        }
    });

    const sendMessageMutation = useMutation({
        mutationFn: async (content: string) => {
            const res = await fetch("/api/portal/message", {
                method: "POST",
                headers: { ...headers, "Content-Type": "application/json" },
                body: JSON.stringify({ content })
            });
            if (!res.ok) throw new Error("Failed to send");
            return res.json();
        },
        onSuccess: () => {
            setMessageInput("");
            toast({ title: "Message Sent", description: "Your lawyer has been notified." });
            queryClient.invalidateQueries({ queryKey: ["portal-timeline"] });
        }
    });

    const handleLogout = () => {
        localStorage.removeItem("portal_token");
        setLocation("/portal/login");
    };

    if (!statusData) return null;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
            {/* Header */}
            <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-brand-500/10 flex items-center justify-center">
                            <Shield className="text-brand-600" size={18} />
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white">Immigration.AI Portal</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-300 hidden sm:block">
                            {statusData.client.firstName} {statusData.client.lastName}
                        </span>
                        <LiveButton variant="ghost" size="sm" icon={LogOut} onClick={handleLogout}>
                            Logout
                        </LiveButton>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 py-8">
                {/* Welcome Section */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                        {statusData.application ? `Your ${statusData.application.type.replace(/_/g, ' ')} Application` : 'Welcome Back'}
                    </h1>
                    <p className="text-slate-500">Track your progress and manage your case.</p>
                </div>

                {/* Navigation Tabs */}
                <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
                    {[
                        { id: "overview", label: "Overview", icon: CheckCircle2 },
                        { id: "documents", label: "Documents", icon: FileText },
                        { id: "messages", label: "Messages", icon: MessageSquare },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${activeTab === tab.id
                                    ? "bg-brand-600 text-white shadow-lg shadow-brand-500/20"
                                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                                }`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="space-y-6">
                    {activeTab === "overview" && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                            {/* Progress Card */}
                            <AnimatedCard className="p-6 bg-gradient-to-r from-brand-600 to-indigo-600 text-white">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className="text-lg font-bold opacity-90">Document Progress</h3>
                                        <p className="text-brand-100 text-sm">{statusData.documents.completed} of {statusData.documents.total} items completed</p>
                                    </div>
                                    <div className="text-3xl font-black">{statusData.documents.progress}%</div>
                                </div>
                                <div className="w-full bg-black/20 rounded-full h-2 mb-2">
                                    <div
                                        className="bg-white rounded-full h-2 transition-all duration-1000"
                                        style={{ width: `${statusData.documents.progress}%` }}
                                    />
                                </div>
                                {statusData.documents.progress === 100 ? (
                                    <p className="text-sm font-medium flex items-center gap-2 text-emerald-100">
                                        <CheckCircle2 size={16} /> All documents ready for review
                                    </p>
                                ) : (
                                    <p className="text-sm font-medium text-brand-100">Keep going! You're making great progress.</p>
                                )}
                            </AnimatedCard>

                            {/* Timeline */}
                            <div className="space-y-4">
                                <h3 className="font-bold text-slate-900 dark:text-white">Recent Updates</h3>
                                {timelineData?.timeline?.length === 0 ? (
                                    <p className="text-slate-500 text-sm">No recent updates.</p>
                                ) : (
                                    (timelineData?.timeline || []).map((event: any, i: number) => (
                                        <AnimatedCard key={i} className="p-4 flex gap-4">
                                            <div className="mt-1">
                                                <div className="w-2 h-2 rounded-full bg-brand-500 ring-4 ring-brand-100 dark:ring-brand-900/30" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">{event.title}</h4>
                                                    <span className="text-xs text-slate-400">
                                                        {new Date(event.date).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <p className="text-slate-600 dark:text-slate-300 text-sm">{event.description}</p>
                                            </div>
                                        </AnimatedCard>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    )}

                    {activeTab === "documents" && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                            {(documentsData?.checklists || []).map((checklist: any) => (
                                <div key={checklist.id} className="space-y-3">
                                    <h3 className="font-bold text-lg text-slate-900 dark:text-white sticky top-20 bg-slate-50 dark:bg-slate-900 py-2 z-5">
                                        {checklist.title}
                                    </h3>

                                    {checklist.items.map((item: any) => (
                                        <AnimatedCard key={item.id} className="p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className={`font-semibold ${item.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-white'}`}>
                                                        {item.title}
                                                    </h4>
                                                    {item.isRequired && (
                                                        <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 text-[10px] font-bold">REQUIRED</span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-500 mb-2">{item.category}</p>
                                                {item.validationRule && (
                                                    <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded inline-flex">
                                                        <span className="font-bold">Info:</span> {item.validationRule}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                                {item.status === "completed" || item.status === "uploaded" ? (
                                                    <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-lg w-full sm:w-auto justify-center">
                                                        <CheckCircle2 size={16} />
                                                        <span className="font-bold text-sm">Uploaded</span>
                                                    </div>
                                                ) : (
                                                    <LiveButton
                                                        variant="outline"
                                                        size="sm"
                                                        className="w-full sm:w-auto"
                                                        icon={Upload}
                                                        onClick={() => {
                                                            // Pseudo upload - in real app would trigger file picker
                                                            // For prototype we'll just toggle status via API or show toast
                                                            toast({ title: "Upload Feature", description: "In production, this opens the file picker." });
                                                        }}
                                                    >
                                                        Upload
                                                    </LiveButton>
                                                )}
                                            </div>
                                        </AnimatedCard>
                                    ))}
                                </div>
                            ))}
                        </motion.div>
                    )}

                    {activeTab === "messages" && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                            {/* Message Input */}
                            <AnimatedCard className="p-4 bg-white dark:bg-slate-800 shadow-xl border-t-4 border-brand-500">
                                <label className="text-sm font-bold text-slate-900 dark:text-white mb-2 block">
                                    Send a message to your lawyer
                                </label>
                                <div className="flex gap-2">
                                    <GlassInput
                                        value={messageInput}
                                        onChange={(e) => setMessageInput(e.target.value)}
                                        placeholder="Type your question here..."
                                        className="flex-1"
                                        onKeyDown={(e) => e.key === "Enter" && messageInput && sendMessageMutation.mutate(messageInput)}
                                    />
                                    <LiveButton
                                        onClick={() => sendMessageMutation.mutate(messageInput)}
                                        disabled={!messageInput || sendMessageMutation.isPending}
                                        icon={Send}
                                    >
                                        Send
                                    </LiveButton>
                                </div>
                            </AnimatedCard>

                            {/* Message History (from Timeline API) */}
                            <div className="space-y-3">
                                {timelineData?.timeline?.map((msg: any, i: number) => (
                                    <div key={i} className="flex gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0 flex items-center justify-center">
                                            <MessageSquare size={14} className="text-slate-500" />
                                        </div>
                                        <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl rounded-tl-none border border-slate-100 dark:border-slate-700 max-w-[80%]">
                                            <p className="text-slate-800 dark:text-slate-200 text-sm">{msg.description}</p>
                                            <p className="text-[10px] text-slate-400 mt-1 text-right">
                                                {new Date(msg.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </div>
            </main>
        </div>
    );
}
