<<<<<<< HEAD
import React from 'react';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { EmployerVerificationPanel } from '@/components/employer-verification-panel';

export default function EmployerVerificationPage() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
        <div className="container mx-auto py-12 px-4 max-w-6xl">
          <EmployerVerificationPanel />
        </div>
=======
import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useLocation } from 'wouter';
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

interface Registry {
  id: string;
  name: string;
  country: string;
  available: boolean;
  documentationUrl?: string;
}

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
  const { user } = useAuth();
  const [_, setLocation] = useLocation();

  // Verify auth
  useEffect(() => {
    if (!user) setLocation('/auth');
  }, [user, setLocation]);

  // State for registries
  const [registries, setRegistries] = useState<Registry[]>([]);
  const [registriesLoading, setRegistriesLoading] = useState(true);
  const [registriesError, setRegistriesError] = useState<string | null>(null);

  // State for history
  const [history, setHistory] = useState<VerificationRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // State for verification form
  const [companyName, setCompanyName] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('GB');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifySuccess, setVerifySuccess] = useState<string | null>(null);

  // State for delete dialog
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Fetch registries
  const fetchRegistries = async () => {
    try {
      setRegistriesError(null);
      setRegistriesLoading(true);
      const data = await apiRequest<{ registries: Registry[] }>('/employers/registries');
      setRegistries(data.registries || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load registries';
      setRegistriesError(msg);
      setRegistries([]);
    } finally {
      setRegistriesLoading(false);
    }
  };

  // Fetch history
  const fetchHistory = async () => {
    try {
      setHistoryError(null);
      setHistoryLoading(true);
      const data = await apiRequest<{ history: VerificationRecord[] }>('/employers/history');
      setHistory(data.history || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load verification history';
      setHistoryError(msg);
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (user) {
      fetchRegistries();
      fetchHistory();
    }
  }, [user]);

  // Handle employer verification
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setVerifyError('Company name is required');
      return;
    }

    try {
      setVerifyError(null);
      setVerifySuccess(null);
      setVerifyLoading(true);

      const data = await apiRequest<any>('/employers/verify', {
        method: 'POST',
        body: JSON.stringify({
          companyName: companyName.trim(),
          country: selectedCountry,
        }),
      });

      if (data.success) {
        setVerifySuccess(`Verification completed: ${data.results?.length || 0} result(s) found`);
        setCompanyName('');
        await fetchHistory(); // Refresh history
      } else {
        setVerifyError(data.message || 'Verification failed');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Verification error';
      setVerifyError(msg);
    } finally {
      setVerifyLoading(false);
    }
  };

  // Handle delete
  const handleDeleteRecord = async (id: string) => {
    try {
      setDeleteLoading(true);
      await apiRequest(`/employers/${id}`, {
        method: 'DELETE',
      });
      setHistory(history.filter((h) => h.id !== id));
      setDeleteId(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete record';
      alert(`Delete failed: ${msg}`);
    } finally {
      setDeleteLoading(false);
    }
  };

  const getRegistryInfo = (registryType: string) => {
    return registries.find((r) => r.id === registryType);
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

      {/* Error Banner */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-900 dark:text-red-400">Error Loading Data</h3>
              <p className="text-sm text-red-800 dark:text-red-300 mt-1">{error}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setError(null);
              fetchRegistries();
              fetchHistory();
            }}
            className="flex-shrink-0"
          >
            Retry
          </Button>
        </div>
      )}

      <Tabs defaultValue="verify" className="space-y-6">
        <TabsList>
          <TabsTrigger value="verify">Verify Employer</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="registries">Available Registries</TabsTrigger>
        </TabsList>

        {/* Verify Tab */}
        <TabsContent value="verify" className="space-y-6">
          <Card className="border-2 border-brand-200 dark:border-brand-900/50 bg-gradient-to-br from-brand-50 to-blue-50 dark:from-slate-800 dark:to-slate-800/50">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-white">Search Employer Information</CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Enter a company name and select a country to verify it exists in European business registries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVerify} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      value={verifyFormData.companyName}
                      onChange={(e) =>
                        setVerifyFormData({
                          ...verifyFormData,
                          companyName: e.target.value,
                        })
                      }
                      placeholder="e.g., Acme Corporation"
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                      Country *
                    </label>
                    <select
                      value={verifyFormData.registryType}
                      onChange={(e) =>
                        setVerifyFormData({
                          ...verifyFormData,
                          registryType: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                      required
                    >
                      <option value="">Select a country...</option>
                      {registries.map((registry) => (
                        <option key={registry.id} value={registry.id}>
                          {registry.country} - {registry.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={verifyLoading || !verifyFormData.companyName || !verifyFormData.registryType}
                  className="w-full px-6 py-2 bg-brand-600 dark:bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-700 dark:hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {verifyLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify Employer'
                  )}
                </button>

                {verifyError && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-300 text-sm">
                    {verifyError}
                  </div>
                )}

                {verifySuccess && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-800 dark:text-green-300 text-sm flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Verification successful!</p>
                      <p>The employer has been saved to your verification history.</p>
                    </div>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
            <CardHeader>
              <CardTitle className="text-lg text-slate-900 dark:text-white">Supported Registries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {registriesLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
                  </div>
                ) : registries.length > 0 ? (
                  registries.map((registry) => (
                    <div
                      key={registry.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                    >
                      <CheckCircle2 className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {registry.country}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {registry.name}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-600 dark:text-slate-400">No registries available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          {historyLoading ? (
            <Card className="border-slate-200 dark:border-slate-700">
              <CardContent className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
              </CardContent>
            </Card>
          ) : historyError ? (
            <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
              <CardContent className="py-8">
                <div className="flex flex-col items-center gap-4">
                  <AlertCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
                  <p className="text-red-800 dark:text-red-300 text-center">{historyError}</p>
                  <Button onClick={fetchHistory} variant="outline" size="sm">
                    Retry
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : history.length > 0 ? (
            <div className="space-y-4">
              <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
                <CardHeader>
                  <CardTitle className="text-slate-900 dark:text-white">
                    Verification History ({history.length})
                  </CardTitle>
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
                                <Button
                                  variant="outline"
                                  onClick={() => setDeleteId(null)}
                                  disabled={deleteLoading}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  variant="destructive"
                                  onClick={() => handleDeleteRecord(record.id)}
                                  disabled={deleteLoading}
                                >
                                  {deleteLoading ? (
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

        {/* Registries Tab */}
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
              {registriesLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-600" />
                </div>
              ) : registriesError ? (
                <div className="flex flex-col items-center gap-4 py-8">
                  <AlertCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
                  <p className="text-red-800 dark:text-red-300 text-center">{registriesError}</p>
                  <Button onClick={fetchRegistries} variant="outline" size="sm">
                    Retry
                  </Button>
                </div>
              ) : registries.length > 0 ? (
                registries.map((registry) => (
                  <div
                    key={registry.id}
                    className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          {registry.country}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {registry.name}
                        </p>
                      </div>
                      <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 px-2 py-1 rounded">
                        Connected
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-500">ID: {registry.id}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-600 dark:text-slate-400">No registries available</p>
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
>>>>>>> 21777a5db682a904c683ac49d1b69d018063706e
      </div>
    </div>
  );
}
