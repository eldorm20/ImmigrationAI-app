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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PredictiveAnalysis from "./predictive-analysis";
import { useWebSocket } from "@/hooks/use-websocket";
import { useAuth } from "@/lib/auth";
import { Eye } from "lucide-react";

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
    const [activeTab, setActiveTab] = useState<"overview" | "analysis" | "notes">("overview");
    const { user: authUser } = useAuth();
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
        fetchClient();
    }, [clientId]);

    useEffect(() => {
        if (client?.latestApplication?.id) {
            joinApplication(client.latestApplication.id);
            return () => leaveApplication(client.latestApplication!.id);
        }
    }, [client?.latestApplication?.id]);

    const fetchClient = async () => {
        try {
            setLoading(true);
            const data = await apiRequest<ClientData>(`/clients/${clientId}`);
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
        if (!client?.latestApplication?.id) return;

        try {
            toast({
                title: "Agent Activated",
                description: "AI is analyzing missing documents and drafting an email...",
                className: "bg-blue-50 text-blue-900 border-blue-200"
            });

            const res = await apiRequest<{ details: { recipient: string; missingDocuments: string[] } }>(`/agents/collect-documents/${client.latestApplication.id}`, {
                method: "POST"
            });
            const data = res; // apiRequest returns parsed JSON

            toast({
                title: "Email Drafted & Sent",
                description: `Request sent to ${data.details.recipient} for: ${data.details.missingDocuments.join(", ")}`,
                className: "bg-green-50 text-green-900 border-green-200"
            });
        } catch (error) {
            toast({ title: "Agent Error", description: "Failed to run document collector", variant: "destructive" });
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
                                    <Plus size={10} /> Add Tag
                                </button>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {activeViewers.filter(v => v.userId !== authUser?.id).length > 0 && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 animate-pulse">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            <span className="text-xs font-bold text-green-700 dark:text-green-400">
                                {activeViewers.filter(v => v.userId !== authUser?.id).length} Active Now
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
                <AnimatedCard className="p-4 text-center bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
                    <FileText size={24} className="mx-auto mb-2 text-blue-500" />
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{client.applicationCount}</p>
                    <p className="text-xs text-slate-500">Applications</p>
                </AnimatedCard>
                <AnimatedCard delay={0.05} className="p-4 text-center bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
                    <Calendar size={24} className="mx-auto mb-2 text-purple-500" />
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{client.consultationCount}</p>
                    <p className="text-xs text-slate-500">Consultations</p>
                </AnimatedCard>
                <AnimatedCard delay={0.1} className="p-4 text-center bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
                    <Briefcase size={24} className="mx-auto mb-2 text-amber-500" />
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{client.documentCount}</p>
                    <p className="text-xs text-slate-500">Documents</p>
                </AnimatedCard>
                <AnimatedCard delay={0.15} className="p-4 text-center bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
                    <DollarSign size={24} className="mx-auto mb-2 text-green-500" />
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">${Number(client.totalBilled).toLocaleString()}</p>
                    <p className="text-xs text-slate-500">Total Billed</p>
                </AnimatedCard>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl mb-6">
                <button
                    onClick={() => setActiveTab("overview")}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === "overview" ? "bg-white dark:bg-slate-800 shadow-sm text-brand-600 dark:text-brand-400" : "text-slate-500 hover:text-slate-700 dark:text-slate-400"}`}
                >
                    Overview
                </button>
                <button
                    onClick={() => setActiveTab("analysis")}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === "analysis" ? "bg-white dark:bg-slate-800 shadow-sm text-brand-600 dark:text-brand-400" : "text-slate-500 hover:text-slate-700 dark:text-slate-400"}`}
                >
                    Risk Analysis
                </button>
                <button
                    onClick={() => setActiveTab("notes")}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === "notes" ? "bg-white dark:bg-slate-800 shadow-sm text-brand-600 dark:text-brand-400" : "text-slate-500 hover:text-slate-700 dark:text-slate-400"}`}
                >
                    Notes
                </button>
            </div>

            {activeTab === "overview" && (
                <div className="space-y-6">
                    {/* Latest Application */}
                    {/* Latest Application */}
                    {client.latestApplication && (
                        <>
                            <AnimatedCard delay={0.2} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm p-6 rounded-2xl">
                                <h3 className="font-bold text-lg mb-3 flex items-center gap-2 text-slate-900 dark:text-white">
                                    <FileText size={18} className="text-brand-500" />
                                    Current Application
                                </h3>
                                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-white">{client.latestApplication.visaType}</p>
                                        <p className="text-sm text-slate-500">{client.latestApplication.country}</p>
                                    </div>
                                    <span className="px-3 py-1 rounded-full text-sm font-bold bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                                        {formatStatus(client.latestApplication.status)}
                                    </span>
                                </div>
                            </AnimatedCard>

                            <AnimatedCard delay={0.3} className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/10 border border-indigo-100 dark:border-indigo-900/30 p-6 rounded-2xl">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-lg flex items-center gap-2 text-indigo-900 dark:text-indigo-300">
                                        <Briefcase size={18} className="text-indigo-500" />
                                        AI Agent Actions
                                    </h3>
                                    <span className="text-xs font-bold uppercase bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded border border-indigo-100 dark:border-indigo-800">
                                        Autonomous
                                    </span>
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                                    The AI agent can verify missing documents and automatically follow up with the client.
                                </p>
                                <button
                                    onClick={handleAutoCollect}
                                    className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                                >
                                    <Mail size={18} /> Auto-Collect Missing Documents
                                </button>
                            </AnimatedCard>
                        </>
                    )}
                </div>
            )}

            {activeTab === "analysis" && (
                client.latestApplication ? (
                    <PredictiveAnalysis
                        clientId={clientId}
                        applicationId={client.latestApplication.id}
                        currentAnalysis={client.latestApplication.metadata?.aiAnalysis}
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
                    <div className="text-center p-8 text-slate-500">
                        No active application found to analyze.
                    </div>
                )
            )}

            {activeTab === "notes" && (
                <div className="space-y-0">
                    <AnimatedCard delay={0.25} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm p-6 rounded-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-lg flex items-center gap-2 text-slate-900 dark:text-white">
                                <StickyNote size={18} className="text-brand-500" />
                                Notes ({client.notes?.length || 0})
                            </h3>
                            <button
                                onClick={() => setShowNoteForm(!showNoteForm)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 dark:bg-brand-900/30 dark:text-brand-300 transition-colors text-sm font-medium"
                            >
                                <Plus size={16} /> Add Note
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
                                                className="px-4 py-2 rounded-lg bg-brand-600 text-white font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {addingNote ? "Saving..." : "Save Note"}
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
                                <div className="text-center py-8 text-slate-400">
                                    <StickyNote size={32} className="mx-auto mb-2 opacity-50" />
                                    <p>No notes yet. Add your first note above.</p>
                                </div>
                            )}
                        </div>
                    </AnimatedCard>
                </div>
            )}
        </motion.div>
    );
}
