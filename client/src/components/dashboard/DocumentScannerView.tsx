import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, Check, XCircle, Loader2 } from "lucide-react";
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

        try {
            const formData = new FormData();
            formData.append("image", selectedFile);
            formData.append("documentType", documentType);

            const response = await fetch("/api/vision/analyze", {
                method: "POST",
                body: formData,
                credentials: "include",
            });

            if (!response.ok) {
                throw new Error("Analysis failed");
            }

            const result = await response.json();

            if (result.success) {
                setExtractedData(result.data);
                toast({
                    title: "✅ Analysis Complete",
                    description: `Extracted data from ${documentType} with ${Math.round((result.confidence || 0.85) * 100)}% confidence`,
                });
            } else {
                throw new Error(result.error || "Analysis failed");
            }
        } catch (error: any) {
            toast({
                title: "Analysis Failed",
                description: error.message || "Failed to analyze document. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const formatFieldName = (key: string): string => {
        return key
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (str) => str.toUpperCase())
            .trim();
    };

    return (
        <div className="container max-w-6xl mx-auto p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold">AI Document Scanner</h1>
                <p className="text-muted-foreground mt-2">
                    Upload passport, visa, ID card, or bank statement for automatic data extraction
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Upload Section */}
                <Card>
                    <CardHeader>
                        <CardTitle>Upload Document</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Document Type Selector */}
                        <div className="space-y-2">
                            <Label htmlFor="document-type">Document Type</Label>
                            <Select value={documentType} onValueChange={setDocumentType}>
                                <SelectTrigger id="document-type">
                                    <SelectValue placeholder="Select document type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="passport">Passport</SelectItem>
                                    <SelectItem value="visa">Visa</SelectItem>
                                    <SelectItem value="id_card">ID Card</SelectItem>
                                    <SelectItem value="bank_statement">Bank Statement</SelectItem>
                                    <SelectItem value="general">General Document</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* File Upload */}
                        <div className="space-y-2">
                            <Label>Document Image</Label>
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                            >
                                {previewUrl ? (
                                    <div className="space-y-2">
                                        <img
                                            src={previewUrl}
                                            alt="Document preview"
                                            className="max-h-60 mx-auto rounded-lg"
                                        />
                                        <p className="text-sm text-muted-foreground">{selectedFile?.name}</p>
                                    </div>
                                ) : (
                                    <>
                                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                                        <p className="mt-2 text-sm text-gray-600">
                                            Click to upload or drag and drop
                                        </p>
                                        <p className="text-xs text-gray-500">PNG, JPG, JPEG (max 10MB)</p>
                                    </>
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

                        <Button
                            onClick={handleAnalyze}
                            disabled={!selectedFile || isAnalyzing}
                            className="w-full"
                            size="lg"
                        >
                            {isAnalyzing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Analyzing with LLAVA AI...
                                </>
                            ) : (
                                <>
                                    <FileText className="mr-2 h-4 w-4" />
                                    Scan Document
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {/* Results Section */}
                <Card>
                    <CardHeader>
                        <CardTitle>Extracted Data</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {extractedData ? (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-green-600 font-medium">
                                    <Check className="h-5 w-5" />
                                    Extraction Successful
                                </div>

                                <div className="space-y-3">
                                    {Object.entries(extractedData).map(([key, value]) => (
                                        value && (
                                            <div key={key} className="border-b pb-2">
                                                <p className="text-sm font-medium text-gray-600">
                                                    {formatFieldName(key)}
                                                </p>
                                                <p className="text-base mt-1">{String(value)}</p>
                                            </div>
                                        )
                                    ))}
                                </div>

                                {/* Copy JSON Button */}
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        navigator.clipboard.writeText(JSON.stringify(extractedData, null, 2));
                                        toast({
                                            title: "Copied!",
                                            description: "Extracted data copied to clipboard",
                                        });
                                    }}
                                    className="w-full"
                                >
                                    Copy as JSON
                                </Button>
                            </div>
                        ) : (
                            <div className="text-center py-12 text-muted-foreground">
                                <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                                <p>Upload and scan a document to see extracted data here</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* AI Notice */}
            <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                    <p className="text-sm text-blue-900">
                        <strong>🤖 Powered by LLAVA Vision AI</strong> - This feature uses LLAVA 7B, an open-source
                        multimodal AI model running on your server. All data processing happens securely on your
                        infrastructure with no external API calls.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
