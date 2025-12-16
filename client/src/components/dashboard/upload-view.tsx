import React, { useState, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import { trackEvent } from "@/lib/analytics";
import { motion } from "framer-motion";
import { LiveButton, AnimatedCard } from "@/components/ui/live-elements";
import { FileUp, Upload, Loader2, FileText, Eye, Trash2, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

export const UploadView = ({ applicationId }: { applicationId?: string }) => {
    interface UploadedFile {
        id: string | number;
        name: string;
        size: number;
        type: string;
        uploadedAt: string;
        status: 'analyzed' | 'pending';
        url: string;
        aiAnalysis?: {
            issues: string[];
            quality: 'excellent' | 'good' | 'poor';
            suggestions: string[];
        };
    }

    const { user } = useAuth();
    const { toast } = useToast();
    const { t } = useI18n();
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch existing documents on mount
    React.useEffect(() => {
        const fetchDocs = async () => {
            try {
                const url = applicationId ? `/documents?applicationId=${applicationId}` : '/documents';
                const docs = await apiRequest<any[]>(url);
                setFiles(docs.map(d => ({
                    id: d.id,
                    name: d.fileName,
                    size: d.fileSize,
                    type: d.mimeType,
                    uploadedAt: d.createdAt,
                    status: 'analyzed',
                    url: d.url,
                    aiAnalysis: d.aiAnalysis
                })));
            } catch (err) {
                console.error("Failed to fetch documents", err);
            }
        };
        fetchDocs();
    }, [applicationId]);

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
        let uploadedCount = 0;

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
                if (applicationId) {
                    formData.append('applicationId', applicationId);
                }

                try {
                    // Use apiRequest so auth/refresh logic and error handling are consistent
                    const uploadedDoc = await apiRequest<any>("/documents/upload", {
                        method: 'POST',
                        body: formData,
                        // apiRequest now omits Content-Type when body is FormData
                    });

                    try { trackEvent('document_uploaded', { mimeType: uploadedDoc.mimeType, fileSize: uploadedDoc.fileSize }); } catch { };

                    const newFile = {
                        id: uploadedDoc.id,
                        name: uploadedDoc.fileName,
                        size: uploadedDoc.fileSize,
                        type: uploadedDoc.mimeType,
                        uploadedAt: uploadedDoc.createdAt || new Date().toISOString(),
                        status: 'analyzed' as const,
                        url: uploadedDoc.url,
                        aiAnalysis: uploadedDoc.aiAnalysis
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

            setUploading(false);
            if (uploadedCount > 0) {
                toast({
                    title: t.upload.uploadedSuccess,
                    description: `${uploadedCount} of ${fileList.length} file(s) ${t.upload.uploadedDesc}`,
                    className: "bg-green-50 text-green-900 border-green-200"
                });
            }
        } catch (error) {
            setUploading(false);
            const errorMessage = error instanceof Error ? error.message : 'Upload failed';
            toast({
                title: 'Upload Error',
                description: errorMessage,
                className: "bg-red-50 text-red-900 border-red-200",
                variant: 'destructive'
            });
        }
    };

    const deleteFile = (id: string | number) => {
        setFiles(prev => prev.filter(f => f.id !== id));
        toast({ title: t.upload.deleted, description: t.upload.deletedDesc });
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
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
                        {uploading ? t.upload.uploading : t.upload.chooseFiles}
                    </LiveButton>
                </div>
            </AnimatedCard>

            {files.length > 0 && (
                <AnimatedCard>
                    <h3 className="font-bold text-xl mb-4 text-slate-900 dark:text-white">{t.upload.uploaded}</h3>
                    <div className="space-y-3">
                        {files.map((file) => (
                            <div key={file.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                <div className="flex items-center gap-4 flex-1">
                                    <div className="w-12 h-12 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                                        <FileText className="text-brand-600 dark:text-brand-400" size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-slate-900 dark:text-white">{file.name}</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                            {formatFileSize(file.size)} • {new Date(file.uploadedAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    {file.aiAnalysis ? (
                                        <div className="flex gap-2">
                                            {file.aiAnalysis.quality === 'good' || file.aiAnalysis.quality === 'excellent' ? (
                                                <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-100 dark:bg-green-900/20 px-2 py-1 rounded-full">
                                                    <CheckCircle size={12} /> Valid
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-100 dark:bg-amber-900/20 px-2 py-1 rounded-full">
                                                    <AlertTriangle size={12} /> {file.aiAnalysis.issues.length} Issues
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400">
                                            {t.upload.analyzed}
                                        </span>
                                    )}
                                </div>
                                <div className="flex gap-2 ml-4">
                                    <LiveButton variant="ghost" size="sm" icon={Eye} onClick={() => {
                                        if (file.url) {
                                            window.open(file.url, '_blank');
                                        } else {
                                            toast({ title: "Error", description: "File URL not available", variant: "destructive" });
                                        }
                                    }}>{t.upload.view}</LiveButton>
                                    <LiveButton variant="ghost" size="sm" icon={Trash2} onClick={() => deleteFile(file.id)}>{t.upload.delete}</LiveButton>
                                </div>
                            </div>
                        ))}
                    </div>
                </AnimatedCard>
            )
            }
        </motion.div >
    );
};
