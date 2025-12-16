import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/api";
import { SignaturePad } from "@/components/ui/signature-pad";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, PenTool, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";

export default function SignaturesPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState<any | null>(null);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const data = await apiRequest<any[]>("/signatures");
            setRequests(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSign = async (dataUrl: string) => {
        if (!selectedRequest) return;
        try {
            await apiRequest(`/signatures/${selectedRequest.id}/sign`, {
                method: "POST",
                body: JSON.stringify({ signatureData: dataUrl })
            });
            toast({ title: "Signed!", description: "Document signed successfully." });
            setSelectedRequest(null);
            fetchRequests();
        } catch (err) {
            toast({ title: "Error", description: "Failed to save signature.", variant: "destructive" });
        }
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold flex items-center gap-2">
                <PenTool className="w-8 h-8 text-brand-600" />
                E-Signatures
            </h1>

            {selectedRequest ? (
                <Card>
                    <CardHeader>
                        <CardTitle>Sign Document</CardTitle>
                        <CardDescription>
                            Please provide your signature below for request #{selectedRequest.id.slice(0, 8)}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <SignaturePad onSave={handleSign} />
                        <div className="mt-4">
                            <Button variant="ghost" onClick={() => setSelectedRequest(null)}>Cancel</Button>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {requests.length === 0 ? (
                        <div className="text-center py-12 text-slate-500 border-2 border-dashed rounded-xl">
                            No signature requests found.
                        </div>
                    ) : (
                        requests.map(req => (
                            <Card key={req.id} className="cursor-pointer hover:shadow-md transition-all">
                                <CardContent className="p-6 flex justify-between items-center">
                                    <div>
                                        <h3 className="font-bold text-lg mb-1">
                                            {req.documentId ? `Document #${req.documentId.slice(0, 8)}` : "General Authorization"}
                                        </h3>
                                        <p className="text-sm text-slate-500">
                                            Created: {format(new Date(req.createdAt), "PPP")}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {req.status === 'signed' ? (
                                            <div className="flex items-center text-green-600 font-bold bg-green-50 px-3 py-1 rounded-full text-sm">
                                                <CheckCircle className="w-4 h-4 mr-1" /> Signed
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center text-amber-600 font-bold bg-amber-50 px-3 py-1 rounded-full text-sm">
                                                    <Clock className="w-4 h-4 mr-1" /> Pending
                                                </div>
                                                {req.signerId === user?.id && (
                                                    <Button onClick={() => setSelectedRequest(req)}>Sign Now</Button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
