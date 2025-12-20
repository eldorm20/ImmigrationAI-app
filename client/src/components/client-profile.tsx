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
    };
    notes: ClientNote[];
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

    useEffect(() => {
        fetchClient();
    }, [clientId]);

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
            toast({ title: "Note Deleted" });
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete note", variant: "destructive" });
        }
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

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
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
            className="space-y-6"
        >
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
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
                    </div>
                </div>
                {onClose && (
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                        <X size={20} />
                    </button>
                )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <AnimatedCard className="p-4 text-center">
                    <FileText size={24} className="mx-auto mb-2 text-blue-500" />
                    <p className="text-2xl font-bold">{client.applicationCount}</p>
                    <p className="text-xs text-slate-500">Applications</p>
                </AnimatedCard>
                <AnimatedCard delay={0.05} className="p-4 text-center">
                    <Calendar size={24} className="mx-auto mb-2 text-purple-500" />
                    <p className="text-2xl font-bold">{client.consultationCount}</p>
                    <p className="text-xs text-slate-500">Consultations</p>
                </AnimatedCard>
                <AnimatedCard delay={0.1} className="p-4 text-center">
                    <Briefcase size={24} className="mx-auto mb-2 text-amber-500" />
                    <p className="text-2xl font-bold">{client.documentCount}</p>
                    <p className="text-xs text-slate-500">Documents</p>
                </AnimatedCard>
                <AnimatedCard delay={0.15} className="p-4 text-center">
                    <DollarSign size={24} className="mx-auto mb-2 text-green-500" />
                    <p className="text-2xl font-bold">${Number(client.totalBilled).toLocaleString()}</p>
                    <p className="text-xs text-slate-500">Total Billed</p>
                </AnimatedCard>
            </div>

            {/* Latest Application */}
            {client.latestApplication && (
                <AnimatedCard delay={0.2}>
                    <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                        <FileText size={18} className="text-brand-500" />
                        Current Application
                    </h3>
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                        <div>
                            <p className="font-bold">{client.latestApplication.visaType}</p>
                            <p className="text-sm text-slate-500">{client.latestApplication.country}</p>
                        </div>
                        <span className="px-3 py-1 rounded-full text-sm font-bold bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                            {formatStatus(client.latestApplication.status)}
                        </span>
                    </div>
                </AnimatedCard>
            )}

            {/* Notes Section */}
            <AnimatedCard delay={0.25}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
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
                                    className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-brand-500"
                                />
                                <div className="flex items-center gap-3">
                                    <select
                                        value={noteType}
                                        onChange={(e) => setNoteType(e.target.value as any)}
                                        className="px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
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
                                        className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
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
        </motion.div>
    );
}
