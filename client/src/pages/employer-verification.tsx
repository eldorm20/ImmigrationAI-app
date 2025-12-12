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
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-2">
          <Globe className="w-8 h-8" />
          Employer Verification
        </h1>
        <p className="text-gray-600">
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
          <Card className="border-2 border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle>Search Employer Information</CardTitle>
              <CardDescription>
                Enter a company name to verify it exists in European business registries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmployerVerification onVerificationComplete={handleVerificationComplete} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Supported Countries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">United Kingdom</p>
                    <p className="text-sm text-gray-600">Companies House</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Germany</p>
                    <p className="text-sm text-gray-600">HWR Register</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">France</p>
                    <p className="text-sm text-gray-600">INPI Register</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Netherlands</p>
                    <p className="text-sm text-gray-600">KvK Register</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Spain</p>
                    <p className="text-sm text-gray-600">Mercantil Register</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          {historyLoading ? (
            <Card>
              <CardContent className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </CardContent>
            </Card>
          ) : history.length > 0 ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Verification History</CardTitle>
                  <CardDescription>
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
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex-1">
                            <div className="flex items-start gap-3">
                              {record.verificationStatus === 'verified' ? (
                                <CheckCircle2 className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                              ) : (
                                <AlertCircle className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                              )}
                              <div>
                                <h4 className="font-semibold">
                                  {record.companyName}
                                </h4>
                                <p className="text-sm text-gray-600">
                                  {registry?.name || record.registryType}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
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
            <Card>
              <CardContent className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">
                  No verification history yet. Start by verifying an employer above.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="registries" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Available Company Registries</CardTitle>
              <CardDescription>
                Information about the European company registries integrated with this
                platform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {registriesData?.registries ? (
                registriesData.registries.map((registry: any) => (
                  <div
                    key={registry.id}
                    className="border rounded-lg p-4 space-y-2 hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold flex items-center gap-2">
                          {registry.name}
                          {registry.available ? (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                              Connected
                            </span>
                          ) : (
                            <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                              Not Connected
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Country: <span className="font-mono">{registry.country}</span>
                        </p>
                      </div>
                      <a
                        href={registry.documentationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:underline text-sm"
                      >
                        Visit
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                    <p className="text-xs text-gray-500">ID: {registry.id}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                </div>
              )}
            </CardContent>
          </Card>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              To integrate additional registries or configure API keys for real-time
              verification, contact your administrator.
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  );
}
