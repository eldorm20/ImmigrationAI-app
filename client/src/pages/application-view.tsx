import React, { useEffect, useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, FileText, CheckCircle, AlertCircle, Send } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ChecklistManager from "@/components/lawyer/ChecklistManager";

export default function ApplicationView() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { user, isLoading: authLoading } = useAuth();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();

  const [app, setApp] = useState<any | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user && !authLoading) setLocation('/auth');
  }, [user, authLoading]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [appRes, docsRes] = await Promise.all([
        apiRequest(`/applications/${id}`),
        apiRequest<any[]>(`/documents?applicationId=${id}`)
      ]);
      setApp(appRes);
      setDocuments(docsRes);
    } catch (err) {
      toast({
        title: "Error loading application",
        description: err instanceof Error ? err.message : "Failed to load data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);
    formData.append("applicationId", id!);
    formData.append("documentType", "client_upload"); // Default type

    try {
      setUploading(true);
      await fetch("/api/documents/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}` // Make sure auth is passed
        },
        body: formData
      }).then(async (res) => {
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.message || "Upload failed");
        }
        return res.json();
      });

      toast({
        title: "Document uploaded",
        description: "Your document has been securely uploaded and analyzed.",
      });
      fetchData(); // Refresh list
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Could not upload document",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmitApplication = async () => {
    if (!confirm("Are you sure you want to submit your application to the lawyer? You won't be able to edit it afterwards.")) return;

    try {
      setSubmitting(true);
      const res = await apiRequest(`/applications/${id}/submit`, { method: "POST" });
      setApp(res);
      toast({
        title: "Application Submitted!",
        description: "Your lawyer has been notified and will review your case shortly.",
      });
    } catch (err) {
      toast({
        title: "Submission failed",
        description: err instanceof Error ? err.message : "Could not submit application",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate completeness
  const requiredDocs = app?.visaType === "Student Visa" ? 4 : app?.visaType === "Skilled Worker" ? 5 : 3;
  const completeness = Math.min((documents.length / requiredDocs) * 100, 100);
  const canSubmit = completeness >= 70 && app?.status !== "submitted" && app?.status !== "under_review";

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!app) return <div className="p-8 text-center">Application not found</div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-12">
      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={app.status === 'submitted' ? 'default' : 'outline'}>
                {app.status.replace('_', ' ').toUpperCase()}
              </Badge>
              <span className="text-sm text-slate-500">ID: #{app.id.slice(0, 8)}</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{app.visaType} Application</h1>
            <p className="text-slate-500">Target Country: {app.country}</p>
          </div>

          <div className="flex items-center gap-3">
            {app.status === 'submitted' ? (
              <Button disabled className="bg-green-600 text-white">
                <CheckCircle className="mr-2 h-4 w-4" /> Submitted to Lawyer
              </Button>
            ) : (
              <Button
                onClick={handleSubmitApplication}
                disabled={!canSubmit || submitting}
                className={canSubmit ? "bg-green-600 hover:bg-green-700" : ""}
              >
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                {canSubmit ? "Submit to Lawyer" : `Complete ${Math.round(70 - completeness)}% more to submit`}
              </Button>
            )}
          </div>
        </div>

        {/* Progress Section */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex justify-between text-sm mb-1">
              <span>Application Completeness</span>
              <span className="font-semibold">{Math.round(completeness)}%</span>
            </div>
            <Progress value={completeness} className="h-2" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">
              You need to upload at least {Math.ceil(requiredDocs * 0.7)} documents to submit your application for legal review.
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="documents">
              <TabsList className="w-full">
                <TabsTrigger value="documents" className="flex-1">Documents</TabsTrigger>
                <TabsTrigger value="checklist" className="flex-1">Checklist</TabsTrigger>
                <TabsTrigger value="details" className="flex-1">Application Details</TabsTrigger>
                <TabsTrigger value="timeline" className="flex-1">Timeline</TabsTrigger>
              </TabsList>

              <TabsContent value="documents" className="space-y-4 mt-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Uploaded Documents ({documents.length})</h3>
                  <div className="relative">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading || app.status === 'submitted'}
                      variant="outline"
                    >
                      {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                      Upload Document
                    </Button>
                  </div>
                </div>

                {documents.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                    <FileText className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500">No documents uploaded yet</p>
                    <Button variant="link" onClick={() => fileInputRef.current?.click()}>Upload your first document</Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border rounded-lg hover:shadow-sm transition-shadow">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-50 text-blue-600 rounded">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium text-sm truncate max-w-[200px]">{doc.fileName}</p>
                            <p className="text-xs text-slate-400">{(doc.fileSize / 1024).toFixed(1)} KB • {new Date(doc.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {doc.aiAnalysis?.issues?.length > 0 ? (
                            <Badge variant="destructive" className="flex gap-1 text-[10px] h-5">
                              <AlertCircle className="h-3 w-3" /> {doc.aiAnalysis.issues.length} Issues
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="flex gap-1 text-[10px] h-5 text-green-600 border-green-200 bg-green-50">
                              <CheckCircle className="h-3 w-3" /> Verified
                            </Badge>
                          )}
                          <a href={doc.url} target="_blank" rel="noreferrer">
                            <Button size="sm" variant="ghost">View</Button>
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="checklist" className="mt-4">
                <ChecklistManager applicationId={id!} />
              </TabsContent>

              <TabsContent value="details">
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase">Applicant Name</label>
                        <p>{user?.firstName} {user?.lastName}</p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase">Email</label>
                        <p>{user?.email}</p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase">Visa Type</label>
                        <p>{app.visaType}</p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase">Target Country</label>
                        <p>{app.country}</p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase">Application Fee</label>
                        <p>${app.fee}</p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase">Application ID</label>
                        <p className="font-mono text-xs">{app.id}</p>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase">Notes</label>
                      <p className="text-sm mt-1">{app.notes || "No notes provided."}</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="timeline">
                <div className="p-4 text-center text-slate-500 bg-white rounded-lg border">
                  Timeline and roadmap integration coming soon...
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Need Help?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500 mb-4">
                  Our AI assistant is available 24/7 to answer your questions about document requirements.
                </p>
                <Button className="w-full" variant="secondary">Chat with AI</Button>
              </CardContent>
            </Card>

            {app.lawyerId && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Assigned Lawyer</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600">
                      {/* Ideally fetch lawyer name */}
                      L
                    </div>
                    <div>
                      <p className="font-medium">Immigration Lawyer</p>
                      <p className="text-xs text-slate-500">Legal Expert</p>
                    </div>
                  </div>
                  <Button className="w-full" variant="outline">Send Message</Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
