import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import { trackEvent } from "@/lib/analytics";
import { LiveButton, AnimatedCard } from "@/components/ui/live-elements";
import { FileUp, Upload, Loader2, FileText, Eye, Trash2, Scan, Copy, Check, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createWorker } from "tesseract.js";

interface UploadViewProps {
    initialChecklistItem?: any;
    onUploadComplete?: () => void;
}

export const UploadView: React.FC<UploadViewProps> = ({
    initialChecklistItem,
    onUploadComplete
}) => {
    interface UploadedFile {
        id: string;
        name: string;
        size: number;
        type: string;
        uploadedAt: string;
        status: 'analyzed' | 'pending';
        url: string;
    }

    const { user } = useAuth();
    const { toast } = useToast();
    const { t } = useI18n();
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [dragActive, setDragActive] = useState(false);
    const [analyzingIds, setAnalyzingIds] = useState<Set<string | number>>(new Set());
    const [ocrResults, setOcrResults] = useState<Record<string | number, string>>({});
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadDocuments();
    }, []);

    const loadDocuments = async () => {
        try {
            setIsLoading(true);
            const docs = await apiRequest<any[]>("/documents");
            const mapped = docs.map(doc => ({
                id: doc.id,
                name: doc.fileName,
                size: doc.fileSize,
                type: doc.mimeType,
                uploadedAt: doc.createdAt,
                status: 'analyzed' as const,
                url: doc.url
            }));
            setFiles(mapped);
        } catch (err) {
            console.error("Failed to load documents:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFiles(Array.from(e.dataTransfer.files));
        }
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFiles(Array.from(e.target.files));
        }
    };

    const handleFiles = async (fileList: File[]) => {
        setUploading(true);
        setUploadProgress(10);
        let uploadedCount = 0;

        // Simulate progress
        const progressInterval = setInterval(() => {
            setUploadProgress(prev => {
                if (prev >= 90) return 90;
                return prev + 5;
            });
        }, 200);

        try {
            for (const file of fileList) {
                // Validate file size (10MB max)
                const MAX_FILE_SIZE = 10 * 1024 * 1024;
                if (file.size > MAX_FILE_SIZE) {
                    toast({
                        title: t.upload.tooLarge,
                        description: `${file.name} ${t.upload.sizeLimit}`,
                        className: "bg-orange-50 text-orange-900 border-orange-200",
                        variant: 'destructive'
                    });
                    continue;
                }

                const formData = new FormData();
                formData.append('file', file);
                formData.append('documentType', initialChecklistItem?.name || 'application_document');
                if (initialChecklistItem?.id) {
                    formData.append('checklistId', initialChecklistItem.id);
                }
                if (initialChecklistItem?.applicationId) {
                    formData.append('applicationId', initialChecklistItem.applicationId);
                }

                try {
                    const uploadedDoc = await apiRequest<any>("/documents/upload", {
                        method: 'POST',
                        body: formData,
                    });

                    try { trackEvent('document_uploaded', { mimeType: uploadedDoc.mimeType, fileSize: uploadedDoc.fileSize }); } catch { };

                    const newFile = {
                        id: uploadedDoc.id,
                        name: uploadedDoc.fileName,
                        size: uploadedDoc.fileSize,
                        type: uploadedDoc.mimeType,
                        uploadedAt: uploadedDoc.createdAt || new Date().toISOString(),
                        status: 'analyzed' as const,
                        url: uploadedDoc.url
                    };

                    setFiles(prev => [newFile, ...prev]);
                    uploadedCount++;
                } catch (fileError) {
                    const errorMsg = fileError instanceof Error ? fileError.message : t.upload.error;
                    toast({
                        title: t.upload.error,
                        description: `${file.name}: ${errorMsg}`,
                        className: "bg-red-50 text-red-900 border-red-200",
                        variant: 'destructive'
                    });
                }
            }

            clearInterval(progressInterval);
            setUploadProgress(100);

            if (uploadedCount > 0) {
                toast({
                    title: t.upload.uploadedSuccess,
                    description: `${uploadedCount} of ${fileList.length} ${t.upload.uploadedDesc}`,
                    className: "bg-green-50 text-green-900 border-green-200"
                });
                if (onUploadComplete) onUploadComplete();
            }
        } catch (error) {
            clearInterval(progressInterval);
            const errorMessage = error instanceof Error ? error.message : t.upload.error;
            toast({
                title: t.upload.error,
                description: errorMessage,
                className: "bg-red-50 text-red-900 border-red-200",
                variant: 'destructive'
            });
        } finally {
            setTimeout(() => setUploading(false), 500);
        }
    };

    const deleteFile = async (id: string) => {
        try {
            await apiRequest(`/documents/${id}`, { method: 'DELETE' });
            setFiles(prev => prev.filter(f => f.id !== id));
            toast({ title: t.upload.deleted, description: t.upload.deletedDesc });
        } catch (err: any) {
            toast({ title: t.upload.deleteError, description: err.message || t.error.message, variant: "destructive" });
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    const handleAnalyze = async (file: UploadedFile) => {
        if (!file.type.startsWith('image/')) {
            toast({
                title: t.upload.unsupported,
                description: t.upload.ocrDesc,
                variant: "destructive"
            });
            return;
        }

        setAnalyzingIds(prev => new Set(prev).add(file.id));

        try {
            const worker = await createWorker('eng');
            const ret = await worker.recognize(file.url);
            setOcrResults(prev => ({ ...prev, [file.id]: ret.data.text }));
            await worker.terminate();

            toast({
                title: t.upload.ocrComplete,
                description: t.upload.ocrSuccess,
                className: "bg-green-50 text-green-900 border-green-200"
            });
        } catch (error) {
            console.error(error);
            toast({
                title: t.upload.ocrFail,
                description: t.upload.ocrError,
                variant: "destructive"
            });
        } finally {
            setAnalyzingIds(prev => {
                const next = new Set(prev);
                next.delete(file.id);
                return next;
            });
        }
    };

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
        toast({ title: t.upload.copied, description: t.upload.copiedDesc });
    };

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8 max-w-5xl mx-auto pb-12">
            <AnimatedCard className="glass-premium p-10 rounded-3xl border-none shadow-2xl overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-8 flex items-center gap-4 relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-brand-600 flex items-center justify-center shadow-xl shadow-brand-500/20">
                        <FileUp className="text-white" size={24} />
                    </div>
                    {t.upload.title}
                    {initialChecklistItem && (
                        <span className="ml-2 text-sm font-black text-brand-500 bg-brand-50 px-4 py-1.5 rounded-full border border-brand-500/10 animate-pulse">
                            Uploading for: {initialChecklistItem.name}
                        </span>
                    )}
                </h3>

                <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`relative z-10 border-2 border-dashed rounded-3xl p-16 text-center transition-all duration-500 group ${dragActive
                        ? 'border-brand-500 bg-brand-500/5 shadow-2xl'
                        : 'border-slate-200 dark:border-slate-800 bg-white/30 dark:bg-slate-900/30'
                        }`}
                >
                    <div className="mb-6 relative">
                        <Upload className={`w-20 h-20 mx-auto transition-transform duration-500 ${dragActive ? 'scale-110 text-brand-600' : 'text-slate-300 group-hover:scale-105 group-hover:text-brand-400'}`} />
                        {uploading && (
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-0 border-4 border-t-brand-600 border-transparent rounded-full"
                            />
                        )}
                    </div>
                    <h4 className="text-2xl font-black mb-3 text-slate-900 dark:text-white">{t.upload.dropFiles}</h4>
                    <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium text-lg italic">{t.upload.supports}</p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={handleFileInput}
                        className="hidden"
                        id="file-upload"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    />
                    <LiveButton
                        variant="primary"
                        className="cursor-pointer px-10 py-5 rounded-2xl text-xl font-black shadow-xl shadow-brand-500/20 hover:scale-[1.05] active:scale-95 transition-all"
                        disabled={uploading}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {uploading ? <Loader2 className="animate-spin mr-3" size={24} /> : <Upload className="mr-3" size={24} />}
                        {uploading ? `${t.upload.uploading} ${uploadProgress}%` : t.upload.chooseFiles}
                    </LiveButton>

                    {uploading && (
                        <div className="w-full max-w-md mx-auto bg-slate-100 dark:bg-slate-800 rounded-full h-3 mt-8 overflow-hidden shadow-inner">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${uploadProgress}%` }}
                                className="bg-brand-600 h-full rounded-full shadow-[0_0_15px_rgba(37,99,235,0.5)]"
                            />
                        </div>
                    )}
                </div>
            </AnimatedCard>

            {files.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white px-2 mb-4 flex items-center gap-3">
                        <div className="w-2 h-8 bg-brand-600 rounded-full"></div>
                        {t.upload.uploaded}
                    </h3>
                    <div className="space-y-3">
                        {files.map((file) => (
                            <motion.div
                                layout
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                key={file.id}
                                className="flex flex-col glass-premium rounded-3xl border-none shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden group"
                            >
                                <div className="flex items-center justify-between p-6">
                                    <div className="flex items-center gap-5 flex-1">
                                        <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden shadow-md group-hover:scale-105 transition-transform">
                                            {file.type.startsWith('image/') ? (
                                                <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <FileText className="text-brand-600 dark:text-brand-400" size={32} />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-lg font-black text-slate-900 dark:text-white mb-1">{file.name}</p>
                                            <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">
                                                {formatFileSize(file.size)} • {new Date(file.uploadedAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <span className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                                            {t.upload.analyzed}
                                        </span>
                                    </div>
                                    <div className="flex gap-3 ml-6">
                                        {file.type.startsWith('image/') && (
                                            <>
                                                <LiveButton
                                                    variant="secondary"
                                                    className="px-4 py-3 rounded-xl font-black text-xs uppercase tracking-widest bg-slate-100 dark:bg-slate-800 hover:bg-slate-200"
                                                    disabled={analyzingIds.has(file.id)}
                                                    onClick={() => handleAnalyze(file)}
                                                >
                                                    {analyzingIds.has(file.id) ? (
                                                        <><Loader2 className="animate-spin mr-2" size={14} /> {t.upload.scanning}</>
                                                    ) : (
                                                        <><Scan className="mr-2" size={14} /> {t.upload.ocr}</>
                                                    )}
                                                </LiveButton>
                                                {ocrResults[file.id] && (
                                                    <LiveButton
                                                        variant="primary"
                                                        className="px-4 py-3 rounded-xl font-black text-xs uppercase tracking-widest text-white shadow-lg shadow-brand-500/10"
                                                        onClick={async () => {
                                                            try {
                                                                const resp = await apiRequest<{ reply: string }>("/ai/chat", {
                                                                    method: "POST",
                                                                    body: JSON.stringify({
                                                                        message: `Summarize the following document text, highlighting key dates, requirements, or next steps:\n\n${ocrResults[file.id]}`
                                                                    }),
                                                                });
                                                                toast({
                                                                    title: t.analytics.summary,
                                                                    description: resp.reply,
                                                                    duration: 10000,
                                                                });
                                                            } catch (e) {
                                                                toast({ title: t.upload.summaryFail, description: t.upload.summaryError, variant: "destructive" });
                                                            }
                                                        }}
                                                    >
                                                        <Sparkles className="mr-2 text-yellow-300" size={14} /> {t.upload.summarize}
                                                    </LiveButton>
                                                )}
                                            </>
                                        )}
                                        <LiveButton
                                            variant="ghost"
                                            className="w-12 h-12 rounded-xl flex items-center justify-center text-slate-400 hover:bg-brand-50 hover:text-brand-600 transition-all shadow-sm border border-slate-100 dark:border-slate-800"
                                            onClick={() => {
                                                const url = file.url.startsWith('http') ? file.url : window.location.origin + file.url;
                                                window.open(url, '_blank', 'noreferrer');
                                            }}
                                            title={t.upload.view}
                                        >
                                            <Eye size={20} />
                                        </LiveButton>
                                        <LiveButton
                                            variant="ghost"
                                            className="w-12 h-12 rounded-xl flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all shadow-sm border border-slate-100 dark:border-slate-800"
                                            onClick={() => deleteFile(file.id)}
                                            title={t.upload.delete}
                                        >
                                            <Trash2 size={20} />
                                        </LiveButton>
                                    </div>
                                </div>

                                {ocrResults[file.id] && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        className="p-8 bg-slate-50/50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800"
                                    >
                                        <div className="flex justify-between items-center mb-4">
                                            <h5 className="text-sm font-black flex items-center gap-3 uppercase tracking-widest text-slate-500">
                                                <div className="w-1.5 h-4 bg-brand-500 rounded-full"></div>
                                                {t.upload.extracted}
                                            </h5>
                                            <button
                                                onClick={() => copyToClipboard(ocrResults[file.id], file.id)}
                                                className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 hover:text-brand-600 transition-colors"
                                            >
                                                {copiedId === file.id ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                                                {copiedId === file.id ? "Copied!" : t.upload.copyText}
                                            </button>
                                        </div>
                                        <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap bg-white dark:bg-slate-950/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 max-h-60 overflow-y-auto leading-relaxed shadow-inner italic font-medium">
                                            {ocrResults[file.id]}
                                        </div>
                                    </motion.div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}
        </motion.div>
    );
};
