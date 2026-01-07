import React, { useState } from 'react';
import { CreditCard, ShieldCheck, Loader2, Video, CheckCircle, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LiveButton } from './ui/live-elements';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';

interface ConsultationPaymentCardProps {
    consultationId: string;
    price?: number;
    currency?: string;
    onSuccess?: () => void;
}

export default function ConsultationPaymentCard({
    consultationId,
    price = 25000,
    currency = 'UZS',
    onSuccess
}: ConsultationPaymentCardProps) {
    const { t } = useI18n();
    const { toast } = useToast();
    const [loading, setLoading] = useState<string | null>(null);
    const [paid, setPaid] = useState(false);

    const handlePayment = async (provider: 'stripe' | 'click' | 'payme') => {
        try {
            setLoading(provider);

            // Simulate payment processing
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Update consultation status to 'accepted' (meaning paid/confirmed)
            await apiRequest(`/consultations/${consultationId}`, {
                method: 'PATCH',
                body: JSON.stringify({ status: 'accepted' }),
            });

            setPaid(true);
            toast({
                title: "Payment Successful",
                description: `Your consultation has been confirmed via ${provider.toUpperCase()}.`,
            });

            if (onSuccess) onSuccess();
        } catch (err) {
            toast({
                title: "Payment Failed",
                description: "Could not process payment. Please try again.",
                variant: 'destructive',
            });
        } finally {
            setLoading(null);
        }
    };

    if (paid) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-2xl flex flex-col items-center text-center gap-3"
            >
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-green-500/30">
                    <CheckCircle size={24} />
                </div>
                <div>
                    <h4 className="font-black text-green-900 dark:text-green-100 uppercase tracking-widest text-xs">Consultation Confirmed</h4>
                    <p className="text-xs text-green-700 dark:text-green-300 mt-1">Please check your schedule for the meeting link.</p>
                </div>
            </motion.div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col gap-4 max-w-sm">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                    <Video size={20} />
                </div>
                <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">Video Consultation</h4>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Professional Session</p>
                </div>
                <div className="ml-auto text-right">
                    <p className="text-lg font-black text-slate-900 dark:text-white">
                        {price.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-brand-500 font-bold uppercase">{currency}</p>
                </div>
            </div>

            <div className="flex flex-col gap-2">
                <LiveButton
                    onClick={() => handlePayment('stripe')}
                    disabled={!!loading}
                    className="w-full bg-slate-900 hover:bg-black text-white py-6 rounded-xl relative overflow-hidden group"
                >
                    {loading === 'stripe' ? (
                        <Loader2 className="animate-spin" size={20} />
                    ) : (
                        <div className="flex items-center justify-center gap-2">
                            <CreditCard size={18} />
                            <span className="font-bold">Pay with Card</span>
                        </div>
                    )}
                </LiveButton>

                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => handlePayment('click')}
                        disabled={!!loading}
                        className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 transition-all hover:bg-blue-50 dark:hover:bg-blue-900/20 group"
                    >
                        {loading === 'click' ? (
                            <Loader2 className="animate-spin text-blue-500" size={16} />
                        ) : (
                            <>
                                <Smartphone size={20} className="text-blue-500 group-hover:scale-110 transition-transform" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Click.uz</span>
                            </>
                        )}
                    </button>

                    <button
                        onClick={() => handlePayment('payme')}
                        disabled={!!loading}
                        className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 hover:border-teal-500 dark:hover:border-teal-500 transition-all hover:bg-teal-50 dark:hover:bg-teal-900/20 group"
                    >
                        {loading === 'payme' ? (
                            <Loader2 className="animate-spin text-teal-500" size={16} />
                        ) : (
                            <>
                                <ShieldCheck size={20} className="text-teal-500 group-hover:scale-110 transition-transform" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Payme</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            <div className="mt-2 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 justify-center">
                <ShieldCheck size={14} className="text-green-500" />
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Secure 256-bit Encrypted</span>
            </div>
        </div>
    );
}
