import React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Eye, Loader2, Calendar, HardDrive } from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/ui/glass-card";

interface Document {
    id: string;
    fileName: string;
    documentType: string;
    createdAt: string;
    url: string;
    fileSize?: number;
}

interface ClientDocumentsModalProps {
    clientId: string | null;
    clientName: string;
    isOpen: boolean;
    onClose: () => void;
}

export function ClientDocumentsModal({ clientId, clientName, isOpen, onClose }: ClientDocumentsModalProps) {
    const { data: documents, isLoading } = useQuery<Document[]>({
        queryKey: ["/documents", clientId],
        queryFn: () => apiRequest<Document[]>(`/documents?userId=${clientId}`),
        enabled: !!clientId && isOpen,
    });

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col bg-slate-950/90 backdrop-blur-2xl border-white/10 text-white p-0">
                <DialogHeader className="p-8 border-b border-white/10 bg-gradient-to-r from-brand-600/20 to-transparent">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-brand-500/20 flex items-center justify-center">
                            <HardDrive className="text-brand-400" size={24} />
                        </div>
                        <div>
                            <DialogTitle className="text-2xl font-black tracking-tight">Institutional Dossier</DialogTitle>
                            <p className="text-slate-400 text-sm font-medium">Principal: <span className="text-white font-bold">{clientName}</span></p>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-auto p-8 custom-scrollbar">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center p-20 gap-4">
                            <Loader2 className="h-12 w-12 animate-spin text-brand-500" />
                            <p className="text-slate-500 font-bold animate-pulse uppercase tracking-widest text-xs">Accessing Encrypted Vault...</p>
                        </div>
                    ) : !documents || documents.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center p-20 glass-card border-white/5 bg-white/5"
                        >
                            <FileText className="h-20 w-20 mx-auto mb-6 text-slate-700" />
                            <h3 className="text-xl font-bold mb-2">Portfolio Empty</h3>
                            <p className="text-slate-500 max-w-xs mx-auto">No digital assets or legal documents have been registered for this principal identity.</p>
                        </motion.div>
                    ) : (
                        <div className="grid gap-4">
                            <AnimatePresence>
                                {documents.map((doc, idx) => (
                                    <motion.div
                                        key={doc.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="group relative flex items-center justify-between p-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-brand-500/30 transition-all cursor-pointer"
                                    >
                                        <div className="flex items-center gap-5">
                                            <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center group-hover:bg-brand-500 shadow-inner group-hover:shadow-brand-500/50 transition-all">
                                                <FileText className="h-6 w-6 text-slate-400 group-hover:text-white" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-100 group-hover:text-white mb-1 transition-colors">{doc.fileName}</h4>
                                                <div className="flex items-center gap-3">
                                                    <Badge variant="outline" className="bg-brand-500/10 text-brand-400 border-brand-500/20 text-[10px] font-black uppercase tracking-widest">
                                                        {doc.documentType || "UNCATEGORIZED"}
                                                    </Badge>
                                                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                                                        <Calendar size={12} />
                                                        {(() => {
                                                            const d = new Date(doc.createdAt);
                                                            return isNaN(d.getTime()) ? 'N/A' : format(d, "MMM d, yyyy");
                                                        })()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl" asChild>
                                                <a href={doc.url} target="_blank" rel="noopener noreferrer">
                                                    <Eye className="h-5 w-5" />
                                                </a>
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-brand-400 hover:bg-brand-500/10 rounded-xl" asChild title="Sync to Local Storage">
                                                <a href={doc.url} download={doc.fileName}>
                                                    <Download className="h-5 w-5" />
                                                </a>
                                            </Button>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-white/10 bg-slate-900/50 flex justify-end">
                    <Button onClick={onClose} variant="outline" className="rounded-xl border-white/10 hover:bg-white/5">
                        Relinquish Access
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
