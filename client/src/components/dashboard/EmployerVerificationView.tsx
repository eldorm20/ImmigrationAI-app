import React, { useState, useEffect } from "react";
import { LiveButton } from "@/components/ui/live-elements";
import { BadgeCheck, CheckCircle, Clock, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { apiRequest } from "@/lib/api";

interface VerificationStatus {
    status: 'not_verified' | 'pending' | 'verified' | 'rejected';
    companyName?: string;
    lastUpdated?: string;
}

const STATUS_CONFIG = {
    not_verified: {
        label: 'Not Verified',
        description: 'No employer verification on file',
        bgColor: 'bg-slate-100 dark:bg-slate-800',
        borderColor: 'border-slate-300 dark:border-slate-700',
        textColor: 'text-slate-600 dark:text-slate-400',
        icon: AlertCircle,
    },
    pending: {
        label: 'Under Review',
        description: 'Verification in progress',
        bgColor: 'bg-amber-50 dark:bg-amber-900/20',
        borderColor: 'border-amber-300 dark:border-amber-700',
        textColor: 'text-amber-600 dark:text-amber-400',
        icon: Clock,
    },
    verified: {
        label: 'Verified',
        description: 'Employer successfully verified',
        bgColor: 'bg-green-50 dark:bg-green-900/20',
        borderColor: 'border-green-300 dark:border-green-700',
        textColor: 'text-green-600 dark:text-green-400',
        icon: CheckCircle,
    },
    rejected: {
        label: 'Rejected',
        description: 'Verification failed - please resubmit',
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        borderColor: 'border-red-300 dark:border-red-700',
        textColor: 'text-red-600 dark:text-red-400',
        icon: XCircle,
    },
};

export const EmployerVerificationView = () => {
    const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>({ status: 'not_verified' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadStatus = async () => {
            try {
                const verifications = await apiRequest<any[]>('/employers/verifications');
                if (verifications && verifications.length > 0) {
                    const latest = verifications[0];
                    const statusMap: Record<string, VerificationStatus['status']> = {
                        'pending': 'pending',
                        'verified': 'verified',
                        'invalid': 'rejected',
                        'error': 'rejected',
                    };
                    setVerificationStatus({
                        status: statusMap[latest.verificationStatus] || 'pending',
                        companyName: latest.companyName,
                        lastUpdated: latest.updatedAt,
                    });
                }
            } catch (err) {
                // No verifications found, keep default
            } finally {
                setLoading(false);
            }
        };
        loadStatus();
    }, []);

    const config = STATUS_CONFIG[verificationStatus.status];
    const StatusIcon = config.icon;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-2xl p-8"
        >
            <div className="max-w-3xl mx-auto">
                <div className="text-center mb-8">
                    <BadgeCheck className="w-16 h-16 mx-auto mb-4 text-blue-600 dark:text-blue-400" />
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                        Employer Verification
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400">
                        Verify employers across European company registries to validate employment information for visa applications
                    </p>
                </div>

                {/* Status Badge - NEW */}
                <div className={`mb-8 p-6 rounded-xl border-2 ${config.bgColor} ${config.borderColor}`}>
                    {loading ? (
                        <div className="flex items-center justify-center gap-3">
                            <Loader2 className="animate-spin" />
                            <span className="text-slate-600 dark:text-slate-400">Loading status...</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-full ${config.bgColor} flex items-center justify-center`}>
                                <StatusIcon className={`w-6 h-6 ${config.textColor}`} />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className={`text-lg font-bold ${config.textColor}`}>{config.label}</span>
                                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${config.bgColor} ${config.textColor} border ${config.borderColor}`}>
                                        {verificationStatus.status.toUpperCase().replace('_', ' ')}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{config.description}</p>
                                {verificationStatus.companyName && (
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-1">
                                        Company: {verificationStatus.companyName}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="grid md:grid-cols-2 gap-6 mb-8">
                    <div className="p-6 bg-white dark:bg-slate-800 rounded-lg border border-blue-200 dark:border-blue-900 shadow-sm dark:shadow-black/30">
                        <CheckCircle className="w-8 h-8 text-blue-600 dark:text-blue-400 mb-3" />
                        <h3 className="font-bold text-slate-900 dark:text-white mb-2">UK Companies</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Verify against Companies House registry</p>
                    </div>
                    <div className="p-6 bg-white dark:bg-slate-800 rounded-lg border border-green-200 dark:border-green-900 shadow-sm dark:shadow-black/30">
                        <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400 mb-3" />
                        <h3 className="font-bold text-slate-900 dark:text-white mb-2">German Companies</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Verify against HWR Register</p>
                    </div>
                </div>

                <div className="text-center">
                    <LiveButton
                        variant="primary"
                        onClick={() => window.location.href = '/employer-verification'}
                        className="inline-flex items-center gap-2"
                    >
                        <BadgeCheck size={18} />
                        {verificationStatus.status === 'not_verified' ? 'Start Verification' : 'Manage Verification'}
                    </LiveButton>
                </div>
            </div>
        </motion.div>
    );
};
