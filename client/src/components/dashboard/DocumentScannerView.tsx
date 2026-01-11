import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, FileText, Check, Loader2, Scan, Copy, ShieldCheck, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

export default function DocumentScannerView() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [documentType, setDocumentType] = useState<string>("passport");
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (!file.type.startsWith("image/")) {
                toast({
                    title: "Invalid file type",
                    description: "Please upload an image file (JPG, PNG, etc.)",
                    variant: "destructive",
                });
                return;
            }

            setSelectedFile(file);
            setExtractedData(null);

            // Create preview
            const reader = new FileReader();
            reader.onload = (e) => {
                setPreviewUrl(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAnalyze = async () => {
        if (!selectedFile) {
            toast({
                title: "No file selected",
                description: "Please select a document image to analyze",
                variant: "destructive",
            });
            return;
        }

        setIsAnalyzing(true);
        setExtractedData(null);

        try {
            const formData = new FormData();
            formData.append("image", selectedFile);
            formData.append("documentType", documentType);

            const response = await fetch("/api/vision/analyze", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Analysis failed: ${response.statusText}`);
            }

            const result = await response.json();

            if (result.success) {
                setExtractedData(result.data);
                toast({
                    title: "✅ Analysis Complete",
                    description: `Extracted data from ${documentType} successfully`,
                });
            } else {
                throw new Error(result.error || "Analysis failed to extract data");
            }
        } catch (error: any) {
            console.error("Scanner error:", error);
            toast({
                title: "Analysis Failed",
                description: "Could not analyze document. Ensure image is clear and text is visible.",
                variant: "destructive",
            });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleClear = () => {
        setSelectedFile(null);
        setPreviewUrl(null);
        setExtractedData(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const formatFieldName = (key: string): string => {
        return key
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (str) => str.toUpperCase())
            .trim();
    };

    return (
        <div className="container max-w-6xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent flex items-center gap-3">
                        <Scan className="h-8 w-8 text-primary" />
                        AI Document Scanner
                    </h1>
                    <p className="text-muted-foreground mt-2 max-w-2xl">
                        Securely scan and extract data from passports, visas, and official documents using our local AI engine.
                    </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border">
                    <ShieldCheck className="h-4 w-4 text-green-500" />
                    <span>Privacy First: Processed Locally</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Upload Section */}
                <Card className="border-2 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                    <CardHeader>
                        <CardTitle>Source Document</CardTitle>
                        <CardDescription>Upload a clear image of your document</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Document Type Selector */}
                        <div className="space-y-2">
                            <Label htmlFor="document-type">Document Type</Label>
                            <Select value={documentType} onValueChange={setDocumentType}>
                                <SelectTrigger id="document-type" className="h-11">
                                    <SelectValue placeholder="Select document type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="passport">Passport</SelectItem>
                                    <SelectItem value="visa">Visa</SelectItem>
                                    <SelectItem value="id_card">National ID Card</SelectItem>
                                    <SelectItem value="bank_statement">Bank Statement</SelectItem>
                                    <SelectItem value="general">General Document</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* File Upload Area */}
                        <div className="space-y-2">
                            <Label>Document Image</Label>
                            <div
                                onClick={() => !isAnalyzing && fileInputRef.current?.click()}
                                className={`
                                    relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer 
                                    transition-all duration-200 min-h-[320px] flex flex-col items-center justify-center
                                    ${isAnalyzing ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'hover:border-primary hover:bg-slate-50 dark:hover:bg-slate-900'}
                                    ${previewUrl ? 'border-primary/50' : 'border-slate-300'}
                                `}
                            >
                                {previewUrl ? (
                                    <div className="relative w-full h-full flex items-center justify-center group">
                                        <img
                                            src={previewUrl}
                                            alt="Document preview"
                                            className="max-h-[300px] max-w-full object-contain rounded-lg shadow-sm"
                                        />
                                        {!isAnalyzing && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                                                <p className="text-white font-medium flex items-center gap-2">
                                                    <Upload className="h-4 w-4" /> Change Image
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="bg-primary/10 p-4 rounded-full mx-auto w-fit">
                                            <Upload className="h-8 w-8 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-lg font-medium text-foreground">Click to upload or drag and drop</p>
                                            <p className="text-sm text-muted-foreground mt-1">PNG, JPG, JPEG (max 10MB)</p>
                                        </div>
                                    </div>
                                )}

                                {isAnalyzing && (
                                    <div className="absolute inset-0 bg-white/80 dark:bg-black/80 flex flex-col items-center justify-center backdrop-blur-sm rounded-xl z-20">
                                        <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                                        <p className="text-xl font-semibold animate-pulse text-primary">Analyzing Document...</p>
                                        <p className="text-sm text-muted-foreground mt-2">LLAVA AI is extracting data</p>
                                    </div>
                                )}
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                        </div>

                        <div className="flex gap-3">
                            <Button
                                onClick={handleAnalyze}
                                disabled={!selectedFile || isAnalyzing}
                                className="flex-1 h-12 text-lg font-medium shadow-md transition-all hover:scale-[1.02]"
                                size="lg"
                            >
                                {isAnalyzing ? (
                                    "Processing..."
                                ) : (
                                    <>
                                        <FileText className="mr-2 h-5 w-5" />
                                        Scan & Extract Data
                                    </>
                                )}
                            </Button>
                            {selectedFile && !isAnalyzing && (
                                <Button
                                    variant="outline"
                                    onClick={handleClear}
                                    className="h-12 px-4 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                >
                                    <RefreshCw className="h-5 w-5" />
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Results Section */}
                <Card className={`border-2 shadow-sm h-full flex flex-col transition-all duration-500 ${extractedData ? 'border-green-200 bg-green-50/10' : ''}`}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            Extracted Data
                            {extractedData && <Check className="h-6 w-6 text-green-500 animate-in zoom-in spin-in-90" />}
                        </CardTitle>
                        <CardDescription>
                            AI-identified fields from your document
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                        {extractedData ? (
                            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                                <ScrollArea className="h-[400px] pr-4">
                                    <div className="space-y-4">
                                        {Object.entries(extractedData).map(([key, value]) => {
                                            if (!value || key === 'documentType' || key === 'rawText') return null;
                                            return (
                                                <div key={key} className="bg-background/50 p-4 rounded-xl border hover:shadow-sm transition-shadow">
                                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                                        {formatFieldName(key)}
                                                    </p>
                                                    <p className="text-lg font-medium break-words text-foreground">{String(value)}</p>
                                                </div>
                                            );
                                        })}

                                        {extractedData.rawText && (
                                            <div className="mt-6 pt-4 border-t">
                                                <p className="text-sm font-semibold mb-2">Raw Text Analysis</p>
                                                <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed font-mono bg-slate-100 dark:bg-slate-900 p-3 rounded-lg">
                                                    {extractedData.rawText}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>

                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        navigator.clipboard.writeText(JSON.stringify(extractedData, null, 2));
                                        toast({
                                            title: "Copied!",
                                            description: "Data copied to clipboard",
                                        });
                                    }}
                                    className="w-full h-12 border-dashed border-2 hover:border-solid hover:bg-slate-100 dark:hover:bg-slate-900 mt-4"
                                >
                                    <Copy className="mr-2 h-4 w-4" />
                                    Copy as JSON
                                </Button>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 border-2 border-dashed rounded-xl border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30 min-h-[300px]">
                                <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-full mb-4">
                                    <Scan className="h-10 w-10 opacity-40" />
                                </div>
                                <p className="text-lg font-medium opacity-60">Ready to Scan</p>
                                <p className="text-sm opacity-40 max-w-[200px] text-center mt-2">
                                    Uploaded documents will be analyzed instantly
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
