import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Shield, FileCheck, AlertCircle, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { AnimatedCard, LiveButton } from "@/components/ui/live-elements";

interface RTWResult {
    full_name?: string;
    dob?: string;
    status?: string;
    expiry_date?: string;
    details?: string;
    image_url?: string;
}

interface ImmigrationResult {
    status?: string;
    full_name?: string;
    visa_type?: string;
    valid_until?: string;
    conditions?: string[];
}

export function GovChecksView() {
    const { toast } = useToast();
    const { t } = useI18n();
    const [activeCheck, setActiveCheck] = useState<'rtw' | 'immigration'>('rtw');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    // Form states
    const [formData, setFormData] = useState({
        code: "",
        dob: "",
        forename: "",
        surname: "",
        company_name: "ImmigrationAI",
        checker_job_title: "HR Manager",
        check_reason: "PERSONAL_FINANCE" as const,
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        // Auto-format DOB: DD-MM-YYYY
        if (name === 'dob') {
            const digits = value.replace(/\D/g, '').substring(0, 8);
            let formatted = '';
            if (digits.length > 0) {
                formatted += digits.substring(0, 2);
                if (digits.length > 2) {
                    formatted += '-' + digits.substring(2, 4);
                    if (digits.length > 4) {
                        formatted += '-' + digits.substring(4, 8);
                    }
                }
            }
            setFormData(prev => ({ ...prev, [name]: formatted }));
            return;
        }

        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const runRTWCheck = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setResult(null);
        try {
            const res = await apiRequest("/ukrtwchecker/rtw", {
                method: "POST",
                body: JSON.stringify({
                    code: formData.code,
                    dob: formData.dob,
                    forename: formData.forename,
                    surname: formData.surname,
                    company_name: formData.company_name,
                }),
            });
            setResult({ type: 'rtw', data: res });
            toast({ title: "RTW Check Successful", description: "Verification details retrieved." });
        } catch (err: any) {
            toast({
                title: "Check Failed",
                description: err.message || "Could not verify Share Code. Check your details and try again.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const runImmigrationCheck = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setResult(null);
        try {
            const res = await apiRequest("/ukrtwchecker/immigration", {
                method: "POST",
                body: JSON.stringify({
                    code: formData.code,
                    dob: formData.dob,
                    forename: formData.forename,
                    surname: formData.surname,
                    company_name: formData.company_name,
                    checker_job_title: formData.checker_job_title,
                    check_reason: formData.check_reason,
                }),
            });
            setResult({ type: 'immigration', data: res });
            toast({ title: "Immigration Check Successful", description: "Status details retrieved." });
        } catch (err: any) {
            toast({
                title: "Check Failed",
                description: err.message || "Could not verify immigration status.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
                    <Shield className="text-brand-600" size={32} />
                    {t.gov.title}
                </h2>
                <p className="text-slate-500 dark:text-slate-400">
                    {t.gov.desc}
                </p>
            </div>

            {/* Tabs */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl w-fit">
                <button
                    onClick={() => { setActiveCheck('rtw'); setResult(null); }}
                    className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeCheck === 'rtw' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-sm' : 'text-slate-500'}`}
                >
                    {t.gov.rtw}
                </button>
                <button
                    onClick={() => { setActiveCheck('immigration'); setResult(null); }}
                    className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeCheck === 'immigration' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-sm' : 'text-slate-500'}`}
                >
                    {t.gov.immigration}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Form Section */}
                <AnimatedCard className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm p-8">
                    <form onSubmit={activeCheck === 'rtw' ? runRTWCheck : runImmigrationCheck} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">{t.gov.shareCode}</label>
                            <input
                                name="code"
                                value={formData.code}
                                onChange={handleInputChange}
                                placeholder="e.g. W12 345 678"
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 font-mono"
                                required
                            />
                            <p className="text-[10px] text-slate-400">{t.gov.shareCodeHint}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">{t.gov.forename}</label>
                                <input
                                    name="forename"
                                    value={formData.forename}
                                    onChange={handleInputChange}
                                    placeholder={t.gov.forename}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">{t.gov.surname}</label>
                                <input
                                    name="surname"
                                    value={formData.surname}
                                    onChange={handleInputChange}
                                    placeholder={t.gov.surname}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">{t.gov.dob}</label>
                            <input
                                name="dob"
                                value={formData.dob}
                                onChange={handleInputChange}
                                placeholder="DD-MM-YYYY"
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 font-mono"
                                required
                            />
                        </div>

                        {activeCheck === 'immigration' && (
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">{t.gov.reason}</label>
                                <select
                                    name="check_reason"
                                    value={formData.check_reason}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                                >
                                    <option value="PERSONAL_FINANCE">Personal Finance</option>
                                    <option value="LOAN">Loan</option>
                                    <option value="EDUCATION_OR_TRAINING">Education/Training</option>
                                    <option value="TRAVEL">Travel</option>
                                    <option value="HEALTH_INSURANCE_CARD">Health Insurance</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>
                        )}

                        <LiveButton
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 text-white font-extrabold text-lg"
                            variant="primary"
                        >
                            {loading ? (
                                <><Loader2 className="animate-spin mr-2" size={20} /> {t.gov.processing}</>
                            ) : (
                                <><Search className="mr-2" size={20} /> {t.gov.runCheck}</>
                            )}
                        </LiveButton>
                    </form>
                </AnimatedCard>

                {/* Results Section */}
                <div className="space-y-6">
                    {!result && !loading && (
                        <div className="h-full flex flex-col items-center justify-center text-center p-10 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl opacity-50">
                            <FileCheck size={64} className="mb-4 text-slate-300" />
                            <h4 className="font-bold text-slate-400">{t.gov.noCheck}</h4>
                            <p className="text-sm text-slate-500">{t.gov.noCheckDesc}</p>
                        </div>
                    )}

                    {loading && (
                        <div className="h-full flex flex-col items-center justify-center text-center p-10">
                            <Loader2 size={48} className="animate-spin text-brand-600 mb-4" />
                            <h4 className="font-bold">{t.gov.contacting}</h4>
                            <p className="text-sm text-slate-500">{t.gov.typicalWait}</p>
                        </div>
                    )}

                    <AnimatePresence>
                        {result && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden"
                            >
                                <div className={`p-6 flex items-center gap-3 ${result.data.status === 'valid' || result.data.status === 'success' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                                    {result.data.status === 'valid' || result.data.status === 'success' ? (
                                        <CheckCircle2 className="text-green-500" size={28} />
                                    ) : (
                                        <XCircle className="text-red-500" size={28} />
                                    )}
                                    <div>
                                        <h4 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">{t.gov.result}</h4>
                                        <p className={`text-xs font-bold uppercase ${result.data.status === 'valid' || result.data.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                                            {result.data.status || 'Status Unknown'}
                                        </p>
                                    </div>
                                </div>

                                <div className="p-8 space-y-6">
                                    {result.type === 'rtw' ? (
                                        <>
                                            <div className="grid grid-cols-2 gap-6">
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.gov.fullName}</p>
                                                    <p className="font-bold text-slate-900 dark:text-white">{result.data.full_name || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.gov.dob}</p>
                                                    <p className="font-bold text-slate-900 dark:text-white">{result.data.dob || 'N/A'}</p>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t.gov.rtw} Details</p>
                                                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-sm leading-relaxed">
                                                    {result.data.details || 'No additional details provided.'}
                                                </div>
                                            </div>
                                            {result.data.expiry_date && (
                                                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl flex items-center gap-3">
                                                    <AlertCircle className="text-blue-500" size={20} />
                                                    <div>
                                                        <p className="text-[10px] font-bold text-blue-500 uppercase">{t.gov.expiry}</p>
                                                        <p className="font-bold text-blue-700 dark:text-blue-300">{result.data.expiry_date}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <div className="grid grid-cols-2 gap-6">
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.gov.fullName}</p>
                                                    <p className="font-bold text-slate-900 dark:text-white">{result.data.full_name || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.gov.visaType}</p>
                                                    <p className="font-bold text-slate-900 dark:text-white">{result.data.visa_type || 'N/A'}</p>
                                                </div>
                                            </div>
                                            {result.data.conditions && result.data.conditions.length > 0 && (
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{t.gov.conditions}</p>
                                                    <ul className="space-y-2">
                                                        {result.data.conditions.map((c: string, i: number) => (
                                                            <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 shrink-0" />
                                                                {c}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
