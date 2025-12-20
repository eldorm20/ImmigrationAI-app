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

export const UploadView = () => {
    interface UploadedFile {
        id: string | number;
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
    const [copiedId, setCopiedId] = useState<string | number | null>(null);
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
                        title: 'File Too Large',
                        description: `${file.name} exceeds 10MB limit`,
                        className: "bg-orange-50 text-orange-900 border-orange-200",
                        variant: 'destructive'
                    });
                    continue;
                }

                const formData = new FormData();
                formData.append('file', file);
                formData.append('documentType', 'application_document');

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
                    const errorMsg = fileError instanceof Error ? fileError.message : 'Upload failed';
                    toast({
                        title: 'Upload Error',
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
                    description: `${uploadedCount} of ${fileList.length} file(s) ${t.upload.uploadedDesc}`,
                    className: "bg-green-50 text-green-900 border-green-200"
                });
            }
        } catch (error) {
            clearInterval(progressInterval);
            const errorMessage = error instanceof Error ? error.message : 'Upload failed';
            toast({
                title: 'Upload Error',
                description: errorMessage,
                className: "bg-red-50 text-red-900 border-red-200",
                variant: 'destructive'
            });
        } finally {
            setTimeout(() => setUploading(false), 500);
        }
    };

    const deleteFile = async (id: number) => {
        try {
            await apiRequest(`/documents/${id}`, { method: 'DELETE' });
            setFiles(prev => prev.filter(f => f.id !== id));
            toast({ title: t.upload.deleted, description: t.upload.deletedDesc });
        } catch (err: any) {
            toast({ title: "Delete Failed", description: err.message || "Could not delete file", variant: "destructive" });
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
                title: "Unsupported File Type",
                description: "OCR currently only supports image files (JPG, PNG).",
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
                title: "Analysis Complete",
                description: "Text extracted successfully.",
                className: "bg-green-50 text-green-900 border-green-200"
            });
        } catch (error) {
            console.error(error);
            toast({
                title: "OCR Failed",
                description: "Failed to extract text from image.",
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

    const copyToClipboard = (text: string, id: string | number) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
        toast({ title: "Copied", description: "Text copied to clipboard" });
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            <AnimatedCard>
                <h3 className="font-bold text-xl mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
                    <FileUp className="text-brand-500" /> {t.upload.title}
                </h3>

                <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all ${dragActive
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                        : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50'
                        }`}
                >
                    <Upload className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                    <h4 className="text-lg font-bold mb-2 text-slate-900 dark:text-white">{t.upload.dropFiles}</h4>
                    <p className="text-slate-500 dark:text-slate-400 mb-4">{t.upload.supports}</p>
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
                        className="cursor-pointer"
                        disabled={uploading}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {uploading ? <Loader2 className="animate-spin" /> : <Upload size={18} />}
                        {uploading ? `${t.upload.uploading} ${uploadProgress}%` : t.upload.chooseFiles}
                    </LiveButton>

                    {uploading && (
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 mt-4 overflow-hidden">
                            <div className="bg-brand-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                        </div>
                    )}
                </div>
            </AnimatedCard>

            {files.length > 0 && (
                <AnimatedCard>
                    <h3 className="font-bold text-xl mb-4 text-slate-900 dark:text-white">{t.upload.uploaded}</h3>
                    <div className="space-y-3">
                        {files.map((file) => (
                            <div key={file.id} className="flex flex-col bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                <div className="flex items-center justify-between p-4">
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className="w-12 h-12 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center overflow-hidden">
                                            {file.type.startsWith('image/') ? (
                                                <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <FileText className="text-brand-600 dark:text-brand-400" size={20} />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-slate-900 dark:text-white">{file.name}</p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                                {formatFileSize(file.size)} • {new Date(file.uploadedAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400">
                                            {t.upload.analyzed}
                                        </span>
                                    </div>
                                    <div className="flex gap-2 ml-4">
                                        {file.type.startsWith('image/') && (
                                            <>
                                                <LiveButton
                                                    variant="secondary"
                                                    size="sm"
                                                    icon={analyzingIds.has(file.id) ? Loader2 : Scan}
                                                    disabled={analyzingIds.has(file.id)}
                                                    onClick={() => handleAnalyze(file)}
                                                >
                                                    {analyzingIds.has(file.id) ? "Scanning..." : "OCR"}
                                                </LiveButton>
                                                {ocrResults[file.id] && (
                                                    <LiveButton
                                                        variant="secondary"
                                                        size="sm"
                                                        icon={Sparkles}
                                                        onClick={async () => {
                                                            try {
                                                                const resp = await apiRequest<{ reply: string }>("/ai/chat", {
                                                                    method: "POST",
                                                                    body: JSON.stringify({
                                                                        message: `Summarize the following document text, highlighting key dates, requirements, or next steps:\n\n${ocrResults[file.id]}`
                                                                    }),
                                                                });
                                                                toast({
                                                                    title: "AI Summary",
                                                                    description: resp.reply,
                                                                    duration: 10000,
                                                                });
                                                            } catch (e) {
                                                                toast({ title: "Summary Failed", description: "Could not generate summary.", variant: "destructive" });
                                                            }
                                                        }}
                                                    >
                                                        Summarize
                                                    </LiveButton>
                                                )}
                                            </>
                                        )}
                                        <LiveButton variant="ghost" size="sm" icon={Eye} onClick={() => {
                                            if (file.type.startsWith('image/') || file.type === 'application/pdf') {
                                                window.open(file.url, '_blank');
                                            } else {
                                                toast({ title: "Preview Unavailable", description: `Cannot preview ${file.type}`, variant: "destructive" });
                                            }
                                        }}>{t.upload.view}</LiveButton>
                                        <LiveButton variant="ghost" size="sm" icon={Trash2} onClick={() => deleteFile(Number(file.id))}>{t.upload.delete}</LiveButton>
                                    </div>
                                </div>

                                {ocrResults[file.id] && (
                                    <div className="p-4 bg-slate-100 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700">
                                        <div className="flex justify-between items-center mb-2">
                                            <h5 className="text-sm font-bold flex items-center gap-2">
                                                <Scan size={14} className="text-brand-500" /> Extracted Text
                                            </h5>
                                            <button
                                                onClick={() => copyToClipboard(ocrResults[file.id], file.id)}
                                                className="text-xs flex items-center gap-1 text-slate-500 hover:text-brand-600"
                                            >
                                                {copiedId === file.id ? <Check size={12} /> : <Copy size={12} />}
                                                {copiedId === file.id ? "Copied!" : "Copy Text"}
                                            </button>
                                        </div>
                                        <div className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 max-h-40 overflow-y-auto">
                                            {ocrResults[file.id]}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </AnimatedCard>
            )}
        </motion.div>
    );
};
