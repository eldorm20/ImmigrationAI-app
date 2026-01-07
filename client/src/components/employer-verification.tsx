import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

interface EmployerVerificationProps {
    onVerificationComplete?: () => void;
}

export function EmployerVerification({ onVerificationComplete }: EmployerVerificationProps) {
    const [companyName, setCompanyName] = useState('');
    const [selectedCountry, setSelectedCountry] = useState('');
    const [registries, setRegistries] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [verifyLoading, setVerifyLoading] = useState(false);
    const [verifyError, setVerifyError] = useState('');
    const [verifySuccess, setVerifySuccess] = useState(false);

    useEffect(() => {
        fetchRegistries();
    }, []);

    const fetchRegistries = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/employers/registries');
            if (res.ok) {
                const data = await res.json();
                setRegistries(data.registries || []);
            }
        } catch (error) {
            console.error('Failed to fetch registries', error);
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setVerifyLoading(true);
        setVerifyError('');
        setVerifySuccess(false);

        try {
            const res = await fetch('/api/employers/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    companyName,
                    country: selectedCountry,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Verification failed');
            }

            setVerifySuccess(true);
            setCompanyName('');
            setSelectedCountry('');
            if (onVerificationComplete) {
                onVerificationComplete();
            }
        } catch (err: any) {
            setVerifyError(err.message || 'Failed to verify employer');
        } finally {
            setVerifyLoading(false);
        }
    };

    return (
        <form onSubmit={handleVerify} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                        Company Name *
                    </label>
                    <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
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
                        value={selectedCountry}
                        onChange={(e) => setSelectedCountry(e.target.value)}
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
                disabled={verifyLoading || !companyName || !selectedCountry}
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
    );
}
