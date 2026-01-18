import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import { AnimatedCard, LiveButton, GlassSelect, GlassInput } from "@/components/ui/live-elements";
import {
    Upload, Scan, FileText, Download, Copy, Shield, ShieldCheck,
    ChevronRight, RefreshCw, Loader2, Camera
} from "lucide-react";

interface ExtractedData {
    fullName?: string;
    passportNumber?: string;
    dateOfBirth?: string;
    nationality?: string;
    expiryDate?: string;
    issueDate?: string;
    placeOfBirth?: string;
    documentType?: string;
    rawText?: string;
    [key: string]: any;
}

const DOCUMENT_TYPES = [
    { value: "passport", label: "Passport" },
    { value: "visa", label: "Visa" },
    { value: "id_card", label: "National ID Card" },
    { value: "biometric_residence_permit", label: "Biometric Residence Permit" },
    { value: "drivers_license", label: "Driver's License" },
    { value: "birth_certificate", label: "Birth Certificate" },
    { value: "marriage_certificate", label: "Marriage Certificate" },
];

export default function DocumentScannerView() {
    const { toast } = useToast();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [documentType, setDocumentType] = useState<string>("passport");
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
    const [scanProgress, setScanProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [, setLocation] = useLocation();

    // Reset progress on new scan
    useEffect(() => {
        if (!isAnalyzing) {
            setScanProgress(0);
        }
    }, [isAnalyzing]);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (!file.type.startsWith("image/")) {
                toast({
                    title: "Invalid file type",
                    description: "Please upload an image file (JPG, PNG).",
                    variant: "destructive",
                });
                return;
            }

            setSelectedFile(file);
            setExtractedData(null);

            const reader = new FileReader();
            reader.onload = (e) => setPreviewUrl(e.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleAnalyze = async () => {
        if (!selectedFile) return;

        setIsAnalyzing(true);
        setExtractedData(null);
        setScanProgress(0);

        // Simulate progress for UX
        const progressInterval = setInterval(() => {
            setScanProgress(prev => {
                if (prev >= 95) return 95;
                return prev + 5;
            });
        }, 100);

        try {
            const formData = new FormData();
            formData.append("image", selectedFile);
            formData.append("documentType", documentType);

            const result = await apiRequest<any>("/api/vision/analyze", {
                method: "POST",
                body: formData,
            });

            if (result.success) {
                setExtractedData(result.data);
                setScanProgress(100);
                toast({
                    title: "Scan Complete",
                    description: `Successfully extracted data from ${documentType.replace('_', ' ')}.`,
                });
            } else {
                throw new Error(result.error || "Analysis returned no data");
            }
        } catch (error: any) {
            console.error("Scanner error:", error);
            toast({
                title: "Scan Failed",
                description: error.message || "Could not analyze the document.",
                variant: "destructive"
            });
            setScanProgress(0);
        } finally {
            clearInterval(progressInterval);
            setIsAnalyzing(false);
        }
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: "Copied to clipboard" });
    };

    return (
        <div className="grid lg:grid-cols-2 gap-8 m-4">
            {/* Left Panel: Upload & Preview */}
            <div className="space-y-6">
                <AnimatedCard className="p-1">
                    <div className="bg-slate-900/50 rounded-xl p-6 backdrop-blur-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-lg bg-brand-500/20 flex items-center justify-center">
                                <Scan className="text-brand-400" size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Document Scanner</h2>
                                <p className="text-slate-400 text-sm">AI-powered OCR & Verification</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-slate-300 mb-2 block">Document Type</label>
                                <GlassSelect
                                    value={documentType}
                                    onChange={(e) => setDocumentType(e.target.value)}
                                    options={DOCUMENT_TYPES}
                                />
                            </div>

                            <div
                                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${previewUrl
                                    ? "border-brand-500/50 bg-brand-500/5"
                                    : "border-slate-700 hover:border-brand-500/30 hover:bg-slate-800/50"
                                    }`}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    const file = e.dataTransfer.files[0];
                                    if (file) {
                                        const event = { target: { files: [file] } } as any;
                                        handleFileSelect(event);
                                    }
                                }}
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                    accept="image/*"
                                    className="hidden"
                                />

                                <AnimatePresence mode="wait">
                                    {previewUrl ? (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            className="relative rounded-lg overflow-hidden shadow-2xl"
                                        >
                                            <img
                                                src={previewUrl}
                                                alt="Preview"
                                                className="w-full h-auto max-h-[400px] object-contain rounded-lg"
                                            />
                                            {isAnalyzing && (
                                                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center flex-col gap-4">
                                                    <div className="relative w-24 h-24">
                                                        <motion.div
                                                            className="absolute inset-0 border-t-4 border-brand-500 rounded-full"
                                                            animate={{ rotate: 360 }}
                                                            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                                        />
                                                        <div className="absolute inset-0 flex items-center justify-center font-black text-xl text-white">
                                                            {scanProgress}%
                                                        </div>
                                                    </div>
                                                    <p className="text-brand-200 font-medium animate-pulse">Analyzing document structure...</p>
                                                </div>
                                            )}

                                            {/* Scanning Line Animation */}
                                            {isAnalyzing && (
                                                <motion.div
                                                    className="absolute left-0 right-0 h-1 bg-brand-400 shadow-[0_0_15px_rgba(56,189,248,0.8)] z-10"
                                                    animate={{ top: ["0%", "100%", "0%"] }}
                                                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                                />
                                            )}

                                            <div className="absolute top-2 right-2 flex gap-2">
                                                <button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="p-2 bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-md transition-colors"
                                                >
                                                    <RefreshCw size={16} />
                                                </button>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="py-8"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-brand-500/20 transition-colors cursor-pointer">
                                                <Camera className="text-slate-400 group-hover:text-brand-400" size={32} />
                                            </div>
                                            <h3 className="text-lg font-bold text-white mb-1">Drop image here</h3>
                                            <p className="text-slate-500 text-sm mb-4">or click to browse</p>
                                            <LiveButton variant="outline" size="sm" icon={Upload}>
                                                Select File
                                            </LiveButton>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <LiveButton
                                onClick={handleAnalyze}
                                disabled={!selectedFile || isAnalyzing}
                                className="w-full h-12 text-lg font-bold"
                                variant="primary"
                                icon={isAnalyzing ? Loader2 : Scan}
                            >
                                {isAnalyzing ? "Scanning..." : "Analyze Document"}
                            </LiveButton>
                        </div>
                    </div>
                </AnimatedCard>
            </div>

            {/* Right Panel: Results */}
            <div className="space-y-6">
                <AnimatePresence mode="wait">
                    {extractedData ? (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            <AnimatedCard className="h-full bg-slate-900/50 backdrop-blur-md border-brand-500/30">
                                <div className="p-6">
                                    <div className="flex items-center justify-between mb-6 pb-6 border-b border-white/10">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                                                <ShieldCheck className="text-emerald-400" size={24} />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-white">Analysis Complete</h3>
                                                <p className="text-emerald-400 text-sm font-medium">Valid {documentType.replace('_', ' ')} detected</p>
                                            </div>
                                        </div>
                                        <LiveButton
                                            variant="ghost"
                                            size="sm"
                                            icon={Download}
                                            onClick={() => {
                                                const blob = new Blob([JSON.stringify(extractedData, null, 2)], { type: "application/json" });
                                                const url = URL.createObjectURL(blob);
                                                const a = document.createElement("a");
                                                a.href = url;
                                                a.download = `scan_${Date.now()}.json`;
                                                a.click();
                                            }}
                                        >
                                            Export
                                        </LiveButton>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {Object.entries(extractedData).map(([key, value]) => {
                                                if (key === 'rawText' || typeof value === 'object') return null;
                                                return (
                                                    <div key={key} className="bg-white/5 rounded-xl p-4 border border-white/5 hover:border-brand-500/30 transition-colors group relative">
                                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                                                            {key.replace(/([A-Z])/g, ' $1').trim()}
                                                        </label>
                                                        <p className="text-white font-medium break-all">{String(value)}</p>
                                                        <button
                                                            onClick={() => handleCopy(String(value))}
                                                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 hover:bg-white/10 rounded-md transition-all text-slate-400 hover:text-white"
                                                            title="Copy"
                                                        >
                                                            <Copy size={14} />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {extractedData.rawText && (
                                            <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                                                <div className="flex justify-between items-center mb-2">
                                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Raw Extracted Text</label>
                                                    <button
                                                        onClick={() => handleCopy(extractedData.rawText!)}
                                                        className="text-xs flex items-center gap-1 text-brand-400 hover:text-brand-300"
                                                    >
                                                        <Copy size={12} /> Copy All
                                                    </button>
                                                </div>
                                                <p className="text-slate-400 text-xs font-mono whitespace-pre-wrap max-h-[200px] overflow-y-auto custom-scrollbar">
                                                    {extractedData.rawText}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-8 pt-6 border-t border-white/10 flex justify-end gap-3">
                                        <LiveButton
                                            variant="outline"
                                            onClick={() => {
                                                setSelectedFile(null);
                                                setExtractedData(null);
                                                setPreviewUrl(null);
                                            }}
                                        >
                                            Scan Another
                                        </LiveButton>
                                        <LiveButton
                                            variant="primary"
                                            className="bg-emerald-600 hover:bg-emerald-500"
                                            icon={ChevronRight}
                                            onClick={() => {
                                                toast({ title: "Saved", description: "Document data saved to application." });
                                                setLocation("/dashboard");
                                            }}
                                        >
                                            Use Data
                                        </LiveButton>
                                    </div>
                                </div>
                            </AnimatedCard>
                        </motion.div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center p-8 text-center opacity-50 space-y-4">
                            <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center">
                                <FileText className="text-slate-600" size={48} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-300">No Data Yet</h3>
                                <p className="text-slate-500 max-w-xs mx-auto">Upload a document and click Analyze to view extracted information here.</p>
                            </div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
