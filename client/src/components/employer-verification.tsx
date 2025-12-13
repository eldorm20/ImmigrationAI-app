import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, CheckCircle2, AlertCircle, Search, Globe } from 'lucide-react';

interface EmployerVerificationProps {
  applicationId?: string;
  onVerificationComplete?: (result: any) => void;
}

interface VerificationResult {
  found: boolean;
  companyName: string;
  country: string;
  registryType: string;
  registryId: string | null;
  registeredAddress?: string;
  businessType?: string;
  status?: string;
  registrationDate?: string;
  directors?: string[];
  sic_codes?: string[];
  confidence?: number;
}

interface VerificationResponse {
  status: 'verified' | 'unverified' | 'error';
  results: VerificationResult[];
  message: string;
  timestamp: string;
}

const COUNTRIES = [
  { code: 'GB', name: 'United Kingdom', registryType: 'uk_companies_house' },
  { code: 'DE', name: 'Germany', registryType: 'eu_germany_hwr' },
  { code: 'FR', name: 'France', registryType: 'eu_france_inpi' },
  { code: 'NL', name: 'Netherlands', registryType: 'eu_netherlands_kvk' },
  { code: 'ES', name: 'Spain', registryType: 'eu_spain_mercantil' },
];

export const EmployerVerification: React.FC<EmployerVerificationProps> = ({
  applicationId,
  onVerificationComplete,
}) => {
  const [companyName, setCompanyName] = useState('');
  const [country, setCountry] = useState('GB');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<VerificationResult[]>([]);
  const [error, setError] = useState('');
  const [response, setResponse] = useState<VerificationResponse | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setError('Please enter a company name');
      return;
    }

    setLoading(true);
    setError('');
    setResults([]);

    try {
      const body: any = {
        companyName,
        country,
      };

      if (applicationId) {
        body.applicationId = applicationId;
      }

      // Use apiRequest helper for proper authentication
      const { apiRequest } = await import('@/lib/api');
      const data: VerificationResponse = await apiRequest<VerificationResponse>('/employers/verify', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setResponse(data);
      setResults(data.results || []);

      if (onVerificationComplete) {
        onVerificationComplete(data);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Verification failed';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleMultiCountrySearch = async () => {
    if (!companyName.trim()) {
      setError('Please enter a company name');
      return;
    }

    setLoading(true);
    setError('');
    setResults([]);

    try {
      const body: any = {
        companyName,
        countries: COUNTRIES.map((c) => c.code),
      };

      if (applicationId) {
        body.applicationId = applicationId;
      }

      // Use apiRequest helper for proper authentication
      const { apiRequest } = await import('@/lib/api');
      const data: VerificationResponse = await apiRequest<VerificationResponse>('/employers/search-multi', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setResponse(data);
      setResults(data.results || []);

      if (onVerificationComplete) {
        onVerificationComplete(data);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
            <Globe className="w-5 h-5" />
            Employer Verification
          </CardTitle>
          <CardDescription className="text-slate-600 dark:text-slate-400">
            Verify employers across European company registries
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-900 dark:text-white">Company Name</label>
              <Input
                type="text"
                placeholder="Enter company name (e.g., Apple Ltd)"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                disabled={loading}
                className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-900 dark:text-white">Country</label>
              <Select value={country} onValueChange={setCountry} disabled={loading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={loading || !companyName.trim()}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Verify in {COUNTRIES.find((c) => c.code === country)?.name}
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleMultiCountrySearch}
                disabled={loading || !companyName.trim()}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Globe className="h-4 w-4" />
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {response && (
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              {response.status === 'verified' ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                  Verification Results
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  Verification Results
                </>
              )}
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400">{response.message}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {results.length > 0 ? (
              results.map((result, index) => (
                <div
                  key={index}
                  className="border rounded-lg p-4 space-y-3 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-lg text-slate-900 dark:text-white">
                        {result.companyName}
                      </h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {COUNTRIES.find((c) => c.code === result.country)?.name ||
                          result.country}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-medium">
                        {result.found ? (
                          <span className="text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">
                            ✓ Found
                          </span>
                        ) : (
                          <span className="text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                            Not Found
                          </span>
                        )}
                      </div>
                      {result.confidence && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          Confidence: {result.confidence}%
                        </p>
                      )}
                    </div>
                  </div>

                  {result.found && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      {result.registryId && (
                        <div>
                          <p className="text-slate-600 dark:text-slate-400">Registration Number</p>
                          <p className="font-mono font-semibold text-slate-900 dark:text-white">
                            {result.registryId}
                          </p>
                        </div>
                      )}
                      {result.businessType && (
                        <div>
                          <p className="text-slate-600 dark:text-slate-400">Business Type</p>
                          <p className="font-semibold text-slate-900 dark:text-white">{result.businessType}</p>
                        </div>
                      )}
                      {result.status && (
                        <div>
                          <p className="text-slate-600 dark:text-slate-400">Company Status</p>
                          <p className="font-semibold capitalize text-slate-900 dark:text-white">
                            {result.status}
                          </p>
                        </div>
                      )}
                      {result.registrationDate && (
                        <div>
                          <p className="text-slate-600 dark:text-slate-400">Registration Date</p>
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {new Date(result.registrationDate).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      {result.registeredAddress && (
                        <div className="col-span-2">
                          <p className="text-slate-600 dark:text-slate-400">Registered Address</p>
                          <p className="font-semibold text-slate-900 dark:text-white">{result.registeredAddress}</p>
                        </div>
                      )}
                      {result.directors && result.directors.length > 0 && (
                        <div className="col-span-2">
                          <p className="text-slate-600 dark:text-slate-400">Directors</p>
                          <ul className="mt-1">
                            {result.directors.map((director, idx) => (
                              <li key={idx} className="text-sm text-slate-900 dark:text-white">
                                • {director}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Registry: {result.registryType} | Verified:{' '}
                    {new Date(response.timestamp).toLocaleDateString()}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-6">
                <p className="text-slate-600 dark:text-slate-400">No results found</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
