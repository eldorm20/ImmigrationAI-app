import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Scan, FileText, CheckCircle, AlertCircle, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/api';

interface ExtractedData {
    firstName: string;
    lastName: string;
    dateOfBirth: string | null;
    passportNumber: string | null;
    nationality: string | null;
    expirationDate: string | null;
    country: string | null;
}

export function OCRUploadView() {
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [data, setData] = useState<ExtractedData | null>(null);
    const [rawText, setRawText] = useState<string>('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedInfo = e.target.files[0];
            setFile(selectedInfo);
            const reader = new FileReader();
            reader.onload = (e) => setPreview(e.target?.result as string);
            reader.readAsDataURL(selectedInfo);
            setData(null); // Reset previous data
        }
    };

    const handleScan = async () => {
        if (!file) return;

        setIsScanning(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await apiRequest<{ rawText: string; data: ExtractedData }>('/ocr/extract', {
                method: 'POST',
                body: formData,
            });

            setRawText(res.rawText);
            setData(res.data);
            toast({
                title: "Scan Complete",
                description: "Document scanned successfully. Please verify the details.",
                className: "bg-green-50 text-green-900 border-green-200"
            });
        } catch (err) {
            console.error(err);
            toast({
                title: "Scan Failed",
                description: "Could not extract text. Please ensure the image is clear.",
                variant: "destructive"
            });
        } finally {
            setIsScanning(false);
        }
    };

    const handleUpdateField = (key: keyof ExtractedData, value: string) => {
        if (data) {
            setData({ ...data, [key]: value });
        }
    };

    const handleSave = () => {
        // In a real app, this would save to user profile or application form
        toast({
            title: "Data Saved",
            description: "Information has been stored for your application.",
            className: "bg-blue-50 text-blue-900 border-blue-200"
        });
        // Reset or navigate
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Smart Document Scanner</h2>
                    <p className="text-muted-foreground">Upload your passport or ID to auto-fill your application.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Upload & Preview */}
                <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                    <CardHeader>
                        <CardTitle>Document Image</CardTitle>
                        <CardDescription>Supported formats: JPG, PNG (Max 10MB)</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {!preview ? (
                            <div
                                className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-10 flex flex-col items-center justify-center text-center hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-full flex items-center justify-center mb-4">
                                    <Upload className="w-8 h-8" />
                                </div>
                                <h3 className="font-semibold text-lg mb-1">Click to Upload</h3>
                                <p className="text-sm text-slate-500">or drag and drop your file here</p>
                            </div>
                        ) : (
                            <div className="relative rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                <img src={preview} alt="Document Preview" className="w-full h-auto object-contain max-h-[400px]" />

                                {isScanning && (
                                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm">
                                        <div className="relative">
                                            {/* Scanning Line Animation */}
                                            <motion.div
                                                initial={{ top: "0%" }}
                                                animate={{ top: "100%" }}
                                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                                className="absolute left-0 right-0 h-1 bg-brand-500 shadow-[0_0_20px_rgba(59,130,246,0.5)] z-10"
                                            />
                                            <Scan className="w-20 h-20 text-white opacity-50" />
                                        </div>
                                        <p className="text-white mt-4 font-medium animate-pulse">Scanning Document...</p>
                                    </div>
                                )}

                                {!isScanning && (
                                    <button
                                        onClick={() => { setFile(null); setPreview(null); setData(null); }}
                                        className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full hover:bg-red-500 transition-colors"
                                    >
                                        <AlertCircle className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        )}

                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileChange}
                        />

                        {file && !data && !isScanning && (
                            <Button
                                onClick={handleScan}
                                className="w-full bg-brand-600 hover:bg-brand-700 text-white"
                                size="lg"
                            >
                                <Scan className="w-5 h-5 mr-2" />
                                Scan Document
                            </Button>
                        )}
                    </CardContent>
                </Card>

                {/* Right: Extracted Data */}
                <div className="space-y-6">
                    <AnimatePresence mode="wait">
                        {!data && !isScanning ? (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl"
                            >
                                <FileText className="w-12 h-12 mb-4 opacity-50" />
                                <p>Scan a document to see extracted details here.</p>
                            </motion.div>
                        ) : data ? (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                            >
                                <Card className="border-green-100 dark:border-green-900/30 shadow-md">
                                    <CardHeader className="bg-green-50/50 dark:bg-green-900/10 pb-4">
                                        <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                                            <CheckCircle className="w-5 h-5" />
                                            <CardTitle className="text-lg">Extraction Complete</CardTitle>
                                        </div>
                                        <CardDescription>Please verify the information below is correct.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4 pt-6">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>First Name</Label>
                                                <Input
                                                    value={data.firstName || ''}
                                                    onChange={(e) => handleUpdateField('firstName', e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Last Name</Label>
                                                <Input
                                                    value={data.lastName || ''}
                                                    onChange={(e) => handleUpdateField('lastName', e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Passport / ID Number</Label>
                                            <Input
                                                value={data.passportNumber || ''}
                                                onChange={(e) => handleUpdateField('passportNumber', e.target.value)}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Date of Birth</Label>
                                                <Input
                                                    type="date"
                                                    value={data.dateOfBirth || ''}
                                                    onChange={(e) => handleUpdateField('dateOfBirth', e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Expiration Date</Label>
                                                <Input
                                                    type="date"
                                                    value={data.expirationDate || ''}
                                                    onChange={(e) => handleUpdateField('expirationDate', e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Nationality</Label>
                                                <Input
                                                    value={data.nationality || ''}
                                                    onChange={(e) => handleUpdateField('nationality', e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Issuing Country</Label>
                                                <Input
                                                    value={data.country || ''}
                                                    onChange={(e) => handleUpdateField('country', e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <Button onClick={handleSave} className="w-full mt-4" size="lg">
                                            <Save className="w-4 h-4 mr-2" />
                                            Confirm & Save Data
                                        </Button>
                                    </CardContent>
                                </Card>

                                {/* Debug Raw Text */}
                                <div className="mt-4">
                                    <details className="text-xs text-slate-500">
                                        <summary className="cursor-pointer hover:text-brand-500">View Raw OCR Text</summary>
                                        <pre className="mt-2 p-2 bg-slate-100 dark:bg-slate-900 rounded overflow-auto max-h-40 whitespace-pre-wrap">
                                            {rawText}
                                        </pre>
                                    </details>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="h-full flex items-center justify-center">
                                <Loader2 className="w-10 h-10 animate-spin text-brand-500" />
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
