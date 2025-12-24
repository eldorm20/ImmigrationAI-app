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
            const res = await apiRequest("/gov-check/right-to-work", {
                method: "POST",
                body: JSON.stringify({
                    shareCode: formData.code,
                    dateOfBirth: formData.dob,
                }),
            });
            setResult({ type: 'rtw', data: res });
            toast({ title: t.gov.successTitle, description: t.gov.successDesc });
        } catch (err: any) {
            toast({
                title: t.gov.failTitle,
                description: err.message || t.gov.failDesc,
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
            const res = await apiRequest("/gov-check/immigration-status", {
                method: "POST",
                body: JSON.stringify({
                    shareCode: formData.code,
                    dateOfBirth: formData.dob,
                }),
            });
            setResult({ type: 'immigration', data: res });
            toast({ title: t.gov.successTitle, description: t.gov.successDesc });
        } catch (err: any) {
            toast({
                title: t.gov.failTitle,
                description: err.message || t.gov.failDesc,
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div className="flex flex-col gap-3 mb-12">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-3xl bg-brand-600 flex items-center justify-center shadow-xl shadow-brand-500/20">
                        <Shield className="text-white" size={32} />
                    </div>
                    <div>
                        <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                            {t.gov.title}
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">
                            {t.gov.desc}
                        </p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-slate-100 dark:border-slate-800 p-1.5 rounded-2xl w-fit shadow-lg mb-8">
                <button
                    onClick={() => { setActiveCheck('rtw'); setResult(null); }}
                    className={`px-8 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all duration-300 ${activeCheck === 'rtw' ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    {t.gov.rtw}
                </button>
                <button
                    onClick={() => { setActiveCheck('immigration'); setResult(null); }}
                    className={`px-8 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all duration-300 ${activeCheck === 'immigration' ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    {t.gov.immigration}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Form Section */}
                <AnimatedCard className="glass-premium p-8 rounded-3xl border-none shadow-2xl">
                    <form onSubmit={activeCheck === 'rtw' ? runRTWCheck : runImmigrationCheck} className="space-y-5">
                        <div className="space-y-3">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-500">{t.gov.shareCode}</label>
                            <input
                                name="code"
                                value={formData.code}
                                onChange={handleInputChange}
                                placeholder="e.g. W12 345 678"
                                className="w-full px-6 py-4 bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-brand-500/20 font-mono text-lg transition-all shadow-inner"
                                required
                            />
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight ml-1 italic">{t.gov.shareCodeHint}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-500">{t.gov.forename}</label>
                                <input
                                    name="forename"
                                    value={formData.forename}
                                    onChange={handleInputChange}
                                    placeholder={t.gov.forename}
                                    className="w-full px-6 py-4 bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-brand-500/20 transition-all shadow-inner"
                                    required
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-500">{t.gov.surname}</label>
                                <input
                                    name="surname"
                                    value={formData.surname}
                                    onChange={handleInputChange}
                                    placeholder={t.gov.surname}
                                    className="w-full px-6 py-4 bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-brand-500/20 transition-all shadow-inner"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-500">{t.gov.dob}</label>
                            <input
                                name="dob"
                                value={formData.dob}
                                onChange={handleInputChange}
                                placeholder="DD-MM-YYYY"
                                className="w-full px-6 py-4 bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-brand-500/20 font-mono text-lg transition-all shadow-inner"
                                required
                            />
                        </div>

                        {activeCheck === 'immigration' && (
                            <div className="space-y-3">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-500">{t.gov.reason}</label>
                                <select
                                    name="check_reason"
                                    value={formData.check_reason}
                                    onChange={handleInputChange}
                                    className="w-full px-6 py-4 bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-brand-500/20 transition-all appearance-none"
                                >
                                    <option value="PERSONAL_FINANCE">{t.gov.reasons.finance}</option>
                                    <option value="LOAN">{t.gov.reasons.loan}</option>
                                    <option value="EDUCATION_OR_TRAINING">{t.gov.reasons.edu}</option>
                                    <option value="TRAVEL">{t.gov.reasons.travel}</option>
                                    <option value="HEALTH_INSURANCE_CARD">{t.gov.reasons.health}</option>
                                    <option value="OTHER">{t.gov.reasons.other}</option>
                                </select>
                            </div>
                        )}

                        <LiveButton
                            type="submit"
                            disabled={loading}
                            className="w-full py-5 text-white font-black text-xl rounded-2xl shadow-xl shadow-brand-500/20 hover:scale-[1.02] transition-transform active:scale-95"
                            variant="primary"
                        >
                            {loading ? (
                                <><Loader2 className="animate-spin mr-3" size={24} /> {t.gov.processing}</>
                            ) : (
                                <><Search className="mr-3" size={24} /> {t.gov.runCheck}</>
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
                        <div className="h-full flex flex-col items-center justify-center text-center p-12 glass-premium rounded-3xl">
                            <div className="relative mb-8">
                                <Loader2 size={64} className="animate-spin text-brand-600" />
                                <Shield className="absolute inset-0 m-auto text-brand-400 opacity-20" size={32} />
                            </div>
                            <h4 className="text-2xl font-black text-slate-900 dark:text-white mb-2">{t.gov.contacting}</h4>
                            <p className="text-slate-500 dark:text-slate-400 font-medium">{t.gov.typicalWait}</p>
                        </div>
                    )}

                    <AnimatePresence>
                        {result && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden"
                            >
                                <div className={`p-8 flex items-center gap-4 ${result.data.status === 'valid' || result.data.status === 'success' ? 'bg-green-500/10 border-b border-green-500/20' : 'bg-red-500/10 border-b border-red-500/20'}`}>
                                    {result.data.status === 'valid' || result.data.status === 'success' ? (
                                        <div className="w-14 h-14 rounded-2xl bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/20">
                                            <CheckCircle2 className="text-white" size={32} />
                                        </div>
                                    ) : (
                                        <div className="w-14 h-14 rounded-2xl bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/20">
                                            <XCircle className="text-white" size={32} />
                                        </div>
                                    )}
                                    <div>
                                        <h4 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.gov.result}</h4>
                                        <p className={`text-2xl font-black uppercase tracking-tight ${result.data.status === 'valid' || result.data.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                                            {result.data.status || t.gov.statusUnknown}
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
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{t.gov.rtw} Details</p>
                                                <div className="p-6 bg-white/50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 leading-relaxed font-medium shadow-inner">
                                                    {result.data.details || t.gov.noDetails}
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
