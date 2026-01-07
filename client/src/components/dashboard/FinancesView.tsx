import React, { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import {
    CreditCard, Receipt, Clock, CheckCircle,
    AlertCircle, ExternalLink, Download, ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AnimatedCard, LiveButton } from "@/components/ui/live-elements";

export function FinancesView() {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const { t } = useI18n();

    const fetchInvoices = async () => {
        try {
            const data = await apiRequest<any[]>("/invoices");
            setInvoices(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoices();
    }, []);

    const handlePay = async (invoiceId: string) => {
        try {
            const { url } = await apiRequest<{ url: string }>(`/invoices/${invoiceId}/pay`, {
                method: "POST"
            });
            window.location.href = url;
        } catch (err: any) {
            toast({
                title: "Payment Error",
                description: err.message || "Failed to initiate payment",
                variant: "destructive"
            });
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'paid': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            case 'sent': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
            case 'overdue': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <AnimatedCard className="bg-gradient-to-br from-brand-600 to-blue-600 text-white border-none">
                    <p className="text-[10px] font-bold uppercase opacity-80 mb-1">Unpaid Balance</p>
                    <h3 className="text-2xl font-black">
                        {invoices.filter(i => i.status !== 'paid').reduce((sum, i) => sum + parseFloat(i.totalAmount || i.amount), 0).toLocaleString()} UZS
                    </h3>
                </AnimatedCard>
                <AnimatedCard>
                    <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">Paid Invoices</p>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                        {invoices.filter(i => i.status === 'paid').length}
                    </h3>
                </AnimatedCard>
            </div>

            <div className="space-y-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                    <Receipt className="text-brand-600" size={20} />
                    Invoices & Payments
                </h3>

                {loading ? (
                    <div className="p-12 text-center text-slate-400 animate-pulse">Loading financial data...</div>
                ) : invoices.length === 0 ? (
                    <AnimatedCard className="p-12 text-center border-dashed">
                        <Receipt size={48} className="mx-auto text-slate-200 mb-4" />
                        <p className="text-slate-500 font-medium">No invoices found for your account.</p>
                    </AnimatedCard>
                ) : (
                    <div className="grid gap-4">
                        {invoices.map((inv) => (
                            <AnimatedCard key={inv.id} className="p-0 overflow-hidden hover:shadow-lg transition-shadow border-slate-100 dark:border-white/5">
                                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-2xl ${inv.status === 'paid' ? 'bg-green-50 text-green-600' : 'bg-brand-50 text-brand-600'}`}>
                                            <Receipt size={24} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 dark:text-white">Invoice #{inv.number || inv.id.slice(0, 8)}</h4>
                                            <p className="text-xs text-slate-500 flex items-center gap-1">
                                                <Clock size={12} /> Issued on {new Date(inv.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <p className="text-xs font-bold text-slate-500 uppercase mb-0.5">Amount Due</p>
                                            <p className="text-xl font-black text-slate-900 dark:text-white">
                                                {parseFloat(inv.totalAmount || inv.amount).toLocaleString()} {inv.currency || 'UZS'}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${getStatusStyle(inv.status)}`}>
                                                {inv.status}
                                            </span>

                                            {inv.status !== 'paid' && (
                                                <LiveButton
                                                    size="sm"
                                                    variant="primary"
                                                    onClick={() => handlePay(inv.id)}
                                                    icon={ArrowRight}
                                                >
                                                    Pay Now
                                                </LiveButton>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {inv.items && inv.items.length > 0 && (
                                    <div className="bg-slate-50 dark:bg-black/20 p-4 border-t border-slate-100 dark:border-white/5">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">Service Breakdown</div>
                                        <div className="space-y-1">
                                            {inv.items.map((item: any, idx: number) => (
                                                <div key={idx} className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                                                    <span>{item.description}</span>
                                                    <span className="font-semibold">{parseFloat(item.amount).toLocaleString()} {inv.currency || 'UZS'}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </AnimatedCard>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
