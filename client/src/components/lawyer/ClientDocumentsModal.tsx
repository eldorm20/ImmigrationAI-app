import React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FileText, Download, Eye, Loader2 } from "lucide-react";
import { format } from "date-fns";

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
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>Documents: {clientName}</DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-auto mt-4">
                    {isLoading ? (
                        <div className="flex justify-center p-10">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : !documents || documents.length === 0 ? (
                        <div className="text-center p-10 text-muted-foreground">
                            <FileText className="h-12 w-12 mx-auto mb-2 opacity-20" />
                            <p>No documents found for this client.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Document Name</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {documents.map((doc) => (
                                    <TableRow key={doc.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-primary" />
                                                {doc.fileName}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="capitalize">{doc.documentType || "Other"}</span>
                                        </TableCell>
                                        <TableCell>
                                            {format(new Date(doc.createdAt), "MMM d, yyyy")}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="sm" asChild>
                                                    <a href={doc.url} target="_blank" rel="noopener noreferrer">
                                                        <Eye className="h-4 w-4 mr-1" />
                                                        View
                                                    </a>
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
