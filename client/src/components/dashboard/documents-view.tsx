import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UploadView } from "./upload-view";
import { OCRUploadView } from "./ocr-upload-view";
import { FileText, ScanLine } from "lucide-react";

export function DocumentsView() {
    return (
        <div className="h-full space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Documents</h2>
            </div>

            <Tabs defaultValue="files" className="h-full space-y-6">
                <TabsList className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1">
                    <TabsTrigger value="files" className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800">
                        <FileText className="w-4 h-4" /> My Documents
                    </TabsTrigger>
                    <TabsTrigger value="scan" className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800">
                        <ScanLine className="w-4 h-4" /> Scan & Extract
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="files" className="m-0 outline-none">
                    <UploadView />
                </TabsContent>

                <TabsContent value="scan" className="m-0 outline-none">
                    <OCRUploadView />
                </TabsContent>
            </Tabs>
        </div>
    );
}
