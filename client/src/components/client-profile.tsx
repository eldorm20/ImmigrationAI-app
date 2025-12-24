import React, { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { AnimatedCard } from "@/components/ui/live-elements";
import {
    User,
    Mail,
    Phone,
    FileText,
    Calendar,
    DollarSign,
    MessageSquare,
    Tag,
    Plus,
    X,
    Trash2,
    Edit3,
    ChevronRight,
    Loader2,
    StickyNote,
    Briefcase,
    Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PredictiveAnalysis from "./predictive-analysis";
import { useWebSocket } from "@/hooks/use-websocket";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Eye, Search, Sparkles, CheckCircle } from "lucide-react";
import { LiveButton } from "@/components/ui/live-elements";

interface ClientNote {
    id: string;
    content: string;
    type: "general" | "case" | "billing" | "important";
    createdAt: string;
}

interface ClientData {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    createdAt: string;
    applicationCount: number;
    consultationCount: number;
    documentCount: number;
    totalBilled: number;
    latestApplication?: {
        status: string;
        visaType: string;
        country: string;
        id: string;
        metadata?: any;
    };
    notes: ClientNote[];
    tags: string[];
    documents?: any[];
}

interface ClientProfileProps {
    clientId: string;
    onClose?: () => void;
}

export default function ClientProfile({ clientId, onClose }: ClientProfileProps) {
    const { toast } = useToast();
    const [client, setClient] = useState<ClientData | null>(null);
    const [loading, setLoading] = useState(true);
    const [noteContent, setNoteContent] = useState("");
    const [noteType, setNoteType] = useState<"general" | "case" | "billing" | "important">("general");
    const [addingNote, setAddingNote] = useState(false);
    const [showNoteForm, setShowNoteForm] = useState(false);
    const [newTag, setNewTag] = useState("");
    const [isEditingTags, setIsEditingTags] = useState(false);
    const [activeTab, setActiveTab] = useState<"overview" | "analysis" | "notes" | "documents" | "activity">("overview");
    const [activities, setActivities] = useState<any[]>([]);
    const [loadingActivities, setLoadingActivities] = useState(false);
    const { user: authUser } = useAuth();
    const { t } = useI18n();
    const token = localStorage.getItem("accessToken");

    const { activeViewers, joinApplication, leaveApplication, notifyUpdate } = useWebSocket({
        userId: authUser?.id,
        userName: authUser?.name,
        userRole: authUser?.role,
        token: token,
        onApplicationUpdate: (appId) => {
            if (appId === client?.latestApplication?.id) {
                fetchClient();
            }
        }
    });

    useEffect(() => {
        if (activeTab === "activity") {
            fetchActivities();
        }
    }, [activeTab, clientId]);

    const fetchActivities = async () => {
        try {
            setLoadingActivities(true);
            const data = await apiRequest<any[]>(`/clients/${clientId}/activity`);
            setActivities(data);
        } catch (error) {
            console.error("Failed to fetch activities", error);
        } finally {
            setLoadingActivities(false);
        }
    };

    const fetchClient = async () => {
        try {
            setLoading(true);
            const data = await apiRequest<ClientData>(`/clients/${clientId}`);

            // Fetch ALL documents for this client
            const docs = await apiRequest<any[]>(`/documents?userId=${clientId}`);
            data.documents = docs;

            setClient(data);
        } catch (error) {
            toast({ title: "Error", description: "Failed to load client data", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleAddNote = async () => {
        if (!noteContent.trim()) return;

        setAddingNote(true);
        try {
            await apiRequest(`/clients/${clientId}/notes`, {
                method: "POST",
                body: JSON.stringify({ content: noteContent, type: noteType }),
            });
            setNoteContent("");
            setShowNoteForm(false);
            await fetchClient();

            // Notify others
            if (client?.latestApplication?.id) {
                notifyUpdate(client.latestApplication.id);
            }

            toast({ title: "Note Added", description: "Note saved successfully" });
        } catch (error) {
            toast({ title: "Error", description: "Failed to add note", variant: "destructive" });
        } finally {
            setAddingNote(false);
        }
    };

    const handleDeleteNote = async (noteId: string) => {
        try {
            await apiRequest(`/clients/${clientId}/notes/${noteId}`, { method: "DELETE" });
            await fetchClient();

            // Notify others
            if (client?.latestApplication?.id) {
                notifyUpdate(client.latestApplication.id);
            }

            toast({ title: "Note Deleted" });
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete note", variant: "destructive" });
        }
    };

    const handleUpdateTags = async (updatedTags: string[]) => {
        try {
            await apiRequest(`/clients/${clientId}/tags`, {
                method: "PATCH",
                body: JSON.stringify({ tags: updatedTags }),
            });
            if (client) setClient({ ...client, tags: updatedTags });

            // Notify others
            if (client?.latestApplication?.id) {
                notifyUpdate(client.latestApplication.id);
            }

            toast({ title: "Tags Updated" });
        } catch (error) {
            toast({ title: "Error", description: "Failed to update tags", variant: "destructive" });
        }
    };

    const addTag = () => {
        if (!newTag.trim() || !client) return;
        if (client.tags.includes(newTag.trim())) {
            setNewTag("");
            return;
        }
        const updated = [...(client.tags || []), newTag.trim()];
        handleUpdateTags(updated);
        setNewTag("");
    };

    const removeTag = (tag: string) => {
        if (!client) return;
        const updated = client.tags.filter(t => t !== tag);
        handleUpdateTags(updated);
    };

    const getNoteTypeColor = (type: string) => {
        switch (type) {
            case "important": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
            case "case": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
            case "billing": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
            default: return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
        }
    };

    const formatStatus = (status?: string) => {
        if (!status) return "N/A";
        return status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
    };

    const handleAutoCollect = async () => {
        // ...Existing auto collect logic...
    };

    const handleDeleteDocument = async (docId: string) => {
        if (!confirm("Are you sure you want to delete this document? This action cannot be undone.")) return;

        try {
            await apiRequest(`/documents/${docId}`, { method: "DELETE" });
            toast({ title: "Document Deleted", description: "The document has been removed." });
            await fetchClient(); // Refresh data
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete document", variant: "destructive" });
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12 min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
            </div>
        );
    }

    if (!client) {
        return (
            <div className="p-6 text-center text-slate-500">
                Client not found
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 max-h-[85vh] overflow-y-auto p-2"
        >
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold font-mono">
                        {client.firstName?.[0]?.toUpperCase() || client.email[0].toUpperCase()}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                            {client.firstName} {client.lastName}
                        </h2>
                        <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                            <span className="flex items-center gap-1">
                                <Mail size={14} /> {client.email}
                            </span>
                            {client.phone && (
                                <span className="flex items-center gap-1">
                                    <Phone size={14} /> {client.phone}
                                </span>
                            )}
                        </div>
                        {/* Tags */}
                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                            {(client.tags || []).map(tag => (
                                <span key={tag} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1">
                                    <Tag size={10} /> {tag}
                                    <button onClick={() => removeTag(tag)} className="hover:text-red-500"><X size={10} /></button>
                                </span>
                            ))}
                            {isEditingTags ? (
                                <div className="flex items-center gap-1">
                                    <input
                                        autoFocus
                                        value={newTag}
                                        onChange={(e) => setNewTag(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') addTag();
                                            if (e.key === 'Escape') setIsEditingTags(false);
                                        }}
                                        onBlur={() => { if (!newTag) setIsEditingTags(false); }}
                                        placeholder="Tag name..."
                                        className="text-xs px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-transparent outline-none w-24 text-slate-900 dark:text-white"
                                    />
                                    <button onClick={addTag} className="text-brand-500 hover:text-brand-600"><Plus size={14} /></button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setIsEditingTags(true)}
                                    className="px-2 py-0.5 rounded-md border border-dashed border-slate-300 dark:border-slate-700 text-xs text-slate-400 hover:text-brand-500 hover:border-brand-500 transition-colors flex items-center gap-1"
                                >
                                    <Plus size={10} /> {t.clientProfile.addTag}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <LiveButton
                        onClick={() => window.location.href = `/messages?userId=${clientId}`}
                        className="h-10 px-6 rounded-xl bg-brand-600 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-brand-500/20 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
                        icon={MessageSquare}
                    >
                        {t.clientProfile.messageClient || "Message Client"}
                    </LiveButton>
                    {activeViewers.filter(v => v.userId !== authUser?.id).length > 0 && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 animate-pulse">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            <span className="text-xs font-bold text-green-700 dark:text-green-400">
                                {activeViewers.filter(v => v.userId !== authUser?.id).length} {t.clientProfile.activeNow}
                            </span>
                            <div className="flex -space-x-2 ml-1">
                                {activeViewers.filter(v => v.userId !== authUser?.id).slice(0, 3).map(v => (
                                    <div key={v.userId} title={`${v.userName} (${v.role})`} className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[8px] font-bold">
                                        {v.userName[0].toUpperCase()}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {onClose && (
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                            <X size={20} />
                        </button>
                    )}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <AnimatedCard className="p-6 text-center glass-premium shadow-lg hover:shadow-xl transition-all border-none">
                    <FileText size={28} className="mx-auto mb-3 text-brand-500 drop-shadow-sm" />
                    <p className="text-3xl font-black text-slate-900 dark:text-white">{client.applicationCount}</p>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-1">{t.clientProfile.stats.apps}</p>
                </AnimatedCard>
                <AnimatedCard delay={0.05} className="p-6 text-center glass-premium shadow-lg hover:shadow-xl transition-all border-none">
                    <Calendar size={28} className="mx-auto mb-3 text-purple-500 drop-shadow-sm" />
                    <p className="text-3xl font-black text-slate-900 dark:text-white">{client.consultationCount}</p>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-1">{t.clientProfile.stats.consultations}</p>
                </AnimatedCard>
                <AnimatedCard delay={0.1} className="p-6 text-center glass-premium shadow-lg hover:shadow-xl transition-all border-none">
                    <Briefcase size={28} className="mx-auto mb-3 text-amber-500 drop-shadow-sm" />
                    <p className="text-3xl font-black text-slate-900 dark:text-white">{client.documentCount}</p>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-1">{t.clientProfile.stats.docs}</p>
                </AnimatedCard>
                <AnimatedCard delay={0.15} className="p-6 text-center glass-premium shadow-lg hover:shadow-xl transition-all border-none">
                    <DollarSign size={28} className="mx-auto mb-3 text-green-500 drop-shadow-sm" />
                    <p className="text-3xl font-black text-slate-900 dark:text-white">${Number(client.totalBilled).toLocaleString()}</p>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-1">{t.clientProfile.stats.billed}</p>
                </AnimatedCard>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl mb-8">
                <button
                    onClick={() => setActiveTab("overview")}
                    className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${activeTab === "overview" ? "bg-white dark:bg-slate-700 shadow-md text-brand-600 dark:text-brand-400" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-white/5"}`}
                >
                    {t.clientProfile.tabs.overview}
                </button>
                <button
                    onClick={() => setActiveTab("analysis")}
                    className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${activeTab === "analysis" ? "bg-white dark:bg-slate-700 shadow-md text-brand-600 dark:text-brand-400" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-white/5"}`}
                >
                    {t.clientProfile.tabs.analysis}
                </button>
                <button
                    onClick={() => setActiveTab("notes")}
                    className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${activeTab === "notes" ? "bg-white dark:bg-slate-700 shadow-md text-brand-600 dark:text-brand-400" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-white/5"}`}
                >
                    {t.clientProfile.tabs.notes}
                </button>
                <button
                    onClick={() => setActiveTab("documents")}
                    className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${activeTab === "documents" ? "bg-white dark:bg-slate-700 shadow-md text-brand-600 dark:text-brand-400" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-white/5"}`}
                >
                    {t.clientProfile.tabs.docs || "Documents"}
                </button>
                <button
                    onClick={() => setActiveTab("activity")}
                    className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${activeTab === "activity" ? "bg-white dark:bg-slate-700 shadow-md text-brand-600 dark:text-brand-400" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-white/5"}`}
                >
                    Activity
                </button>
            </div>

            {activeTab === "overview" && (
                <div className="space-y-6">
                    {/* Latest Application */}
                    {/* Latest Application */}
                    {client.latestApplication && (
                        <>
                            <AnimatedCard delay={0.2} className="glass-premium border-l-4 border-l-brand-500 p-8 rounded-3xl shadow-xl">
                                <h3 className="font-black text-xs uppercase tracking-widest mb-6 flex items-center gap-3 text-slate-500">
                                    <FileText size={18} className="text-brand-500" />
                                    {t.clientProfile.currentApp}
                                </h3>
                                <div className="flex items-center justify-between p-6 bg-white/50 dark:bg-slate-800/50 rounded-2xl border border-white/20">
                                    <div>
                                        <p className="text-xl font-black text-slate-900 dark:text-white">{client.latestApplication.visaType}</p>
                                        <p className="text-sm font-bold text-slate-500">{client.latestApplication.country}</p>
                                    </div>
                                    <span className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-brand-500 text-white shadow-lg shadow-brand-500/30">
                                        {formatStatus(client.latestApplication.status)}
                                    </span>
                                </div>
                            </AnimatedCard>

                            <AnimatedCard delay={0.3} className="glass-premium border-l-4 border-l-indigo-600 p-8 rounded-3xl shadow-xl bg-gradient-to-br from-indigo-50/20 to-blue-50/20 dark:from-indigo-900/10 dark:to-blue-900/5">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="font-black text-xs uppercase tracking-widest flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
                                        <Briefcase size={20} className="text-indigo-500 drop-shadow-sm" />
                                        {t.clientProfile.agentActions}
                                    </h3>
                                    <span className="text-[10px] font-black uppercase bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-800 shadow-sm">
                                        Autonomous
                                    </span>
                                </div>
                                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                                    {t.clientProfile.agentDesc}
                                </p>
                                <LiveButton
                                    onClick={handleAutoCollect}
                                    className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-black shadow-xl shadow-indigo-500/30 flex items-center justify-center gap-3 transition-all hover:scale-[1.03] active:scale-95 border-none"
                                >
                                    <Mail size={20} /> {t.clientProfile.autoCollect}
                                </LiveButton>
                            </AnimatedCard>
                        </>
                    )}
                </div>
            )}

            {activeTab === "documents" && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-black text-xs uppercase tracking-widest flex items-center gap-3 text-slate-500">
                            <Briefcase size={18} className="text-brand-500" />
                            {t.clientProfile.tabs.docs || "Client Documents"} ({client.documents?.length || 0})
                        </h3>
                    </div>

                    <div className="grid gap-4">
                        {client.documents && client.documents.length > 0 ? (
                            client.documents.map((doc: any) => (
                                <AnimatedCard key={doc.id} className="p-4 glass-premium border-none shadow-md hover:shadow-lg transition-all">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-4 flex-1">
                                            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                                                <FileText size={24} />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                    {doc.fileName}
                                                    {doc.aiAnalysis && (
                                                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                                            <Sparkles size={10} /> AI Analyzed
                                                        </span>
                                                    )}
                                                </h4>
                                                <p className="text-xs text-slate-500 mt-1">
                                                    {doc.documentType || "Unknown Type"} • {(doc.fileSize / 1024 / 1024).toFixed(2)} MB • {new Date(doc.createdAt).toLocaleDateString()}
                                                </p>

                                                {doc.aiAnalysis && (
                                                    <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">AI Quality Review</span>
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black text-white ${doc.aiAnalysis.score > 80 ? 'bg-green-500' : doc.aiAnalysis.score > 50 ? 'bg-amber-500' : 'bg-red-500'}`}>
                                                                Score: {doc.aiAnalysis.score}%
                                                            </span>
                                                        </div>
                                                        <div className="space-y-2">
                                                            {doc.aiAnalysis.flags?.map((flag: any, idx: number) => (
                                                                <div key={idx} className={`text-xs flex items-center gap-2 ${flag.type === 'red' ? 'text-red-600 dark:text-red-400' : flag.type === 'amber' ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}>
                                                                    {flag.type === 'red' ? <X size={12} /> : flag.type === 'amber' ? <Search size={12} /> : <CheckCircle size={12} />}
                                                                    <span className="font-medium">{flag.message}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <LiveButton
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => window.open(doc.url, "_blank")}
                                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 rounded-lg transition-all"
                                            >
                                                <Eye size={18} />
                                            </LiveButton>
                                            <LiveButton
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDeleteDocument(doc.id)}
                                                className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 rounded-lg transition-all"
                                            >
                                                <Trash2 size={18} />
                                            </LiveButton>
                                        </div>
                                    </div>
                                </AnimatedCard>
                            ))
                        ) : (
                            <div className="text-center py-20 bg-slate-50/50 dark:bg-slate-800/20 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                                <FileText size={48} className="mx-auto mb-4 text-slate-200 dark:text-slate-700" />
                                <p className="text-slate-500 font-bold">No documents uploaded yet</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
            {activeTab === "analysis" && (
                client.latestApplication ? (
                    <PredictiveAnalysis
                        clientId={clientId}
                        applicationId={client.latestApplication?.id || ""}
                        currentAnalysis={client.latestApplication?.metadata?.aiAnalysis}
                        onAnalysisUpdate={(newAnalysis) => {
                            // Update local state logic
                            if (client && client.latestApplication) {
                                const updatedClient = {
                                    ...client,
                                    latestApplication: {
                                        ...client.latestApplication,
                                        metadata: {
                                            ...client.latestApplication.metadata,
                                            aiAnalysis: newAnalysis
                                        }
                                    }
                                };
                                setClient(updatedClient);
                            }
                        }}
                    />
                ) : (
                    <div className="text-center p-20 glass-premium rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                        <Search size={48} className="mx-auto mb-6 text-slate-300 dark:text-slate-700" />
                        <p className="text-lg font-bold text-slate-500">
                            {t.clientProfile.noApp}
                        </p>
                    </div>
                )
            )}

            {activeTab === "notes" && (
                <div className="space-y-0">
                    <AnimatedCard delay={0.25} className="glass-premium p-8 rounded-3xl shadow-xl">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="font-black text-xs uppercase tracking-widest flex items-center gap-3 text-slate-500">
                                <StickyNote size={18} className="text-brand-500" />
                                {t.clientProfile.tabs.notes} ({client.notes?.length || 0})
                            </h3>
                            <button
                                onClick={() => setShowNoteForm(!showNoteForm)}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 text-white hover:bg-brand-600 transition-all text-xs font-black shadow-lg shadow-brand-500/20 uppercase tracking-widest"
                            >
                                <Plus size={16} /> {t.clientProfile.addNote}
                            </button>
                        </div>

                        {/* Add Note Form */}
                        <AnimatePresence>
                            {showNoteForm && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mb-4 overflow-hidden"
                                >
                                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-3">
                                        <textarea
                                            value={noteContent}
                                            onChange={(e) => setNoteContent(e.target.value)}
                                            placeholder="Write a note about this client..."
                                            className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white"
                                        />
                                        <div className="flex items-center gap-3">
                                            <select
                                                value={noteType}
                                                onChange={(e) => setNoteType(e.target.value as any)}
                                                className="px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                                            >
                                                <option value="general">General</option>
                                                <option value="case">Case</option>
                                                <option value="billing">Billing</option>
                                                <option value="important">Important</option>
                                            </select>
                                            <button
                                                onClick={handleAddNote}
                                                disabled={addingNote || !noteContent.trim()}
                                                className="px-6 py-2 rounded-xl bg-brand-600 text-white font-black text-xs uppercase tracking-widest hover:bg-brand-700 shadow-lg shadow-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                            >
                                                {addingNote ? t.common.submitting : t.clientProfile.saveNote}
                                            </button>
                                            <button
                                                onClick={() => { setShowNoteForm(false); setNoteContent(""); }}
                                                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Notes List */}
                        <div className="space-y-3">
                            {client.notes?.length > 0 ? (
                                client.notes.map((note) => (
                                    <div
                                        key={note.id}
                                        className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl group"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getNoteTypeColor(note.type)}`}>
                                                        {note.type}
                                                    </span>
                                                    <span className="text-xs text-slate-400">
                                                        {new Date(note.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                                                    {note.content}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteNote(note.id)}
                                                className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 rounded-lg transition-all"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-20 bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                                    <StickyNote size={48} className="mx-auto mb-4 text-slate-200 dark:text-slate-800" />
                                    <p className="text-slate-500 font-bold">{t.clientProfile.noNotes}</p>
                                </div>
                            )}
                        </div>
                    </AnimatedCard>
                </div>
            )}

            {activeTab === "activity" && (
                <div className="space-y-8 p-4">
                    <h3 className="font-black text-xs uppercase tracking-widest flex items-center gap-3 text-slate-500">
                        <Clock size={18} className="text-brand-500" />
                        Client Activity History
                    </h3>

                    {loadingActivities ? (
                        <div className="flex justify-center py-10">
                            <Loader2 className="animate-spin text-slate-400" />
                        </div>
                    ) : activities.length > 0 ? (
                        <div className="relative border-l-2 border-slate-100 dark:border-slate-800 ml-4 pl-8 space-y-10">
                            {activities.map((event, idx) => (
                                <div key={idx} className="relative">
                                    <div className={`absolute -left-[41px] w-5 h-5 rounded-full border-4 border-white dark:border-slate-900 shadow-sm ${event.type === 'document' ? 'bg-blue-500' : event.type === 'application' ? 'bg-brand-500' : event.type === 'message' ? 'bg-purple-500' : 'bg-green-500'}`} />
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase text-slate-400 mb-1">
                                            {new Date(event.timestamp).toLocaleString()}
                                        </span>
                                        <h4 className="font-bold text-slate-900 dark:text-white leading-none">
                                            {event.title}
                                        </h4>
                                        <p className="text-sm text-slate-500 mt-2">
                                            {event.description}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 text-slate-400">
                            <Clock size={40} className="mx-auto mb-4 opacity-20" />
                            No activity recorded yet
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    );
}
