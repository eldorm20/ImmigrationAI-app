import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { EmployerVerification } from '../components/employer-verification';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { Loader2, Globe, CheckCircle2, AlertCircle, Trash2, ExternalLink } from 'lucide-react';

interface VerificationRecord {
  id: string;
  companyName: string;
  country: string;
  registryType: string;
  registryId: string | null;
  verificationStatus: string;
  verificationDate: string;
  registeredAddress?: string;
  businessType?: string;
  status?: string;
}

export default function EmployerVerificationPage() {
  const [history, setHistory] = useState<VerificationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Fetch verification history
  const { data: historyData, isLoading: historyLoading, refetch } = useQuery({
    queryKey: ['employer-history'],
    queryFn: async () => {
      const res = await fetch('/api/employers/history');
      if (!res.ok) throw new Error('Failed to fetch history');
      return res.json();
    },
  });

  // Fetch available registries
  const { data: registriesData } = useQuery({
    queryKey: ['employer-registries'],
    queryFn: async () => {
      const res = await fetch('/api/employers/registries');
      if (!res.ok) throw new Error('Failed to fetch registries');
      return res.json();
    },
  });

  useEffect(() => {
    if (historyData?.history) {
      setHistory(historyData.history);
    }
  }, [historyData]);

  const handleDeleteRecord = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/employers/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setHistory(history.filter((h) => h.id !== id));
        setDeleteId(null);
      }
    } catch (error) {
      console.error('Error deleting record:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationComplete = () => {
    refetch();
  };

  const getRegistryInfo = (registryType: string) => {
    const registries = registriesData?.registries || [];
    return registries.find((r: any) => r.id === registryType);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto py-12 px-4 max-w-6xl">
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-2 text-slate-900 dark:text-white">
            <div className="w-10 h-10 bg-gradient-to-br from-brand-600 to-brand-400 rounded-lg flex items-center justify-center text-white">
              <Globe className="w-6 h-6" />
            </div>
            Employer Verification
          </h1>
          <p className="text-slate-600 dark:text-slate-400 max-w-2xl">
            Verify employers across European company registries to validate employment
            information for visa applications
          </p>
        </div>

      <Tabs defaultValue="verify" className="space-y-6">
        <TabsList>
          <TabsTrigger value="verify">Verify Employer</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="registries">Available Registries</TabsTrigger>
        </TabsList>

        <TabsContent value="verify" className="space-y-6">
          <Card className="border-2 border-brand-200 dark:border-brand-900/50 bg-gradient-to-br from-brand-50 to-blue-50 dark:from-slate-800 dark:to-slate-800/50">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-white">Search Employer Information</CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Enter a company name to verify it exists in European business registries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmployerVerification onVerificationComplete={handleVerificationComplete} />
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
            <CardHeader>
              <CardTitle className="text-lg text-slate-900 dark:text-white">Supported Countries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex items-start gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">United Kingdom</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Companies House</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Germany</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">HWR Register</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">France</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">INPI Register</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Netherlands</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">KvK Register</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Spain</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Mercantil Register</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          {historyLoading ? (
            <Card className="border-slate-200 dark:border-slate-700">
              <CardContent className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
              </CardContent>
            </Card>
          ) : history.length > 0 ? (
            <div className="space-y-4">
              <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
                <CardHeader>
                  <CardTitle className="text-slate-900 dark:text-white">Verification History</CardTitle>
                  <CardDescription className="text-slate-600 dark:text-slate-400">
                    Your previous employer verification checks
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {history.map((record) => {
                      const registry = getRegistryInfo(record.registryType);
                      return (
                        <div
                          key={record.id}
                          className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-start gap-3">
                              {record.verificationStatus === 'verified' ? (
                                <CheckCircle2 className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                              ) : (
                                <AlertCircle className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                              )}
                              <div>
                                <h4 className="font-semibold text-slate-900 dark:text-white">
                                  {record.companyName}
                                </h4>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                  {registry?.name || record.registryType}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                                  Verified:{' '}
                                  {new Date(
                                    record.verificationDate
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </div>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteId(record.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Delete Verification Record?</DialogTitle>
                                <DialogDescription>
                                  This action cannot be undone. The verification
                                  record for {record.companyName} will be permanently
                                  deleted.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="flex gap-2 justify-end">
                                <Button variant="outline">Cancel</Button>
                                <Button
                                  variant="destructive"
                                  onClick={() => handleDeleteRecord(record.id)}
                                  disabled={loading}
                                >
                                  {loading ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Deleting...
                                    </>
                                  ) : (
                                    'Delete'
                                  )}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
              <CardContent className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <p className="text-slate-600 dark:text-slate-400">
                  No verification history yet. Start by verifying an employer above.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="registries" className="space-y-6">
          <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-white">Available Company Registries</CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Information about the European company registries integrated with this
                platform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {registriesData?.registries ? (
                registriesData.registries.map((registry: any) => (
                  <div
                    key={registry.id}
                    className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold flex items-center gap-2 text-slate-900 dark:text-white">
                          {registry.name}
                          {registry.available ? (
                            <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 px-2 py-1 rounded">
                              Connected
                            </span>
                          ) : (
                            <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-400 px-2 py-1 rounded">
                              Not Connected
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Country: <span className="font-mono">{registry.country}</span>
                        </p>
                      </div>
                      <a
                        href={registry.documentationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline text-sm"
                      >
                        Visit
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-500">ID: {registry.id}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-600 dark:text-slate-400" />
                </div>
              )}
            </CardContent>
          </Card>

          <Alert className="border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <AlertCircle className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            <AlertDescription className="text-slate-700 dark:text-slate-300">
              To integrate additional registries or configure API keys for real-time
              verification, contact your administrator.
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}
