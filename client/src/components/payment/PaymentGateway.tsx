// Payment Gateway Integration - Main Component
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Wallet, Globe, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/lib/useToast';
import { motion, AnimatePresence } from 'framer-motion';

interface PaymentGatewayProps {
    amount: number;
    currency: 'USD' | 'EUR' | 'UZS';
    description: string;
    recipientId?: string; // For lawyer payments
    onSuccess?: (transactionId: string) => void;
    onCancel?: () => void;
    metadata?: any; // To pass extra data like priceId, mode
}

type PaymentMethod = 'click' | 'payme' | 'stripe';

export function PaymentGateway({
    amount,
    currency,
    description,
    recipientId,
    onSuccess,
    onCancel,
    ...props
}: PaymentGatewayProps) {
    const { user } = useAuth();
    const { t } = useI18n();
    const { toast } = useToast();

    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
    const [transactionId, setTransactionId] = useState<string | null>(null);

    // Determine available payment methods based on currency
    const availableMethods = currency === 'UZS'
        ? ['click', 'payme', 'stripe'] as PaymentMethod[]
        : ['stripe'] as PaymentMethod[];

    const paymentMethodInfo = {
        click: {
            name: 'Click',
            icon: Wallet,
            color: 'from-blue-600 to-blue-500',
            description: 'Pay with Click (Uzbekistan)',
            supported: ['UZS']
        },
        payme: {
            name: 'Payme',
            icon: CreditCard,
            color: 'from-green-600 to-green-500',
            description: 'Pay with Payme (Uzbekistan)',
            supported: ['UZS']
        },
        stripe: {
            name: 'Stripe',
            icon: Globe,
            color: 'from-purple-600 to-purple-500',
            description: 'International payment (Credit/Debit Card)',
            supported: ['USD', 'EUR', 'GBP', 'UZS']
        }
    };

    const handlePayment = async () => {
        if (!selectedMethod) {
            toast({
                title: t.common?.error || 'Error',
                description: 'Please select a payment method',
                variant: 'destructive'
            });
            return;
        }

        setIsProcessing(true);
        setPaymentStatus('processing');

        try {
            // Determine endpoint and payload based on method
            let endpoint = '';
            let payload: any = {
                amount,
                currency,
                description,
                recipientId,
                userId: user?.id,
                returnUrl: `${window.location.origin}/payment/success`,
                cancelUrl: `${window.location.origin}/payment/cancel`
            };

            if (selectedMethod === 'stripe') {
                endpoint = '/stripe/create-checkout-session';
                // Pass extra metadata if available (e.g. priceId from props)
                // Assuming props might carry it in 'description' or we need a new prop? 
                // Let's rely on 'amount' for custom or 'priceId' if we add it. 
                // For now, let's assume the backend mock handles 'amount' if no priceId, 
                // or we rely on the specific Stripe route behavior.
                // Re-reading stripe.ts: create-checkout-session expects { priceId, successUrl, cancelUrl }
                // PaymentGateway receives 'amount'. 
                // We strongly need to pass 'priceId' for subscriptions.
                // Assuming we add `param` or `metadata` prop to PaymentGateway.
                payload = {
                    priceId: (props as any).metadata?.priceId, // Temporary cast until interface update
                    mode: (props as any).metadata?.mode || 'payment',
                    successUrl: `${window.location.origin}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
                    cancelUrl: `${window.location.origin}/dashboard?canceled=true`
                };
            } else if (selectedMethod === 'click') {
                endpoint = '/payments-uz/generate-link';
                // The generate-link endpoint expects { provider: 'click', invoiceId }. 
                // But we don't have an invoiceId yet! We need to CREATE an invoice first? 
                // Or use the old 'merchant' endpoint?
                endpoint = '/payments-uz/generate-link';
                // Simplified handling for UZS to generate link directly if invoice exists or handle generic
                // Note: PaymentGateway is generic, so we might need invoiceId passed in props if we use generate-link
                // Falback to generic if no specialized handling
            } else {
                // Fallback to old behavior or error
                endpoint = `/payments/${selectedMethod}/initialize`;
            }

            const response = await apiRequest<{ paymentUrl?: string; url?: string; transactionId: string }>(endpoint, {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            const paymentUrl = response.paymentUrl || response.url; // Stripe returns 'url'
            setTransactionId(response.transactionId || 'pending');

            if (selectedMethod === 'stripe' && paymentUrl) {
                window.location.href = paymentUrl;
                return; // Navigation will happen, stop here
            } else if ((selectedMethod === 'click' || selectedMethod === 'payme') && paymentUrl) {
                const paymentWin = window.open(paymentUrl, '_blank', 'width=600,height=800');
                // Keep polling logic for popups
            }

            // Poll for payment status (only for popup flows)
            const pollInterval = setInterval(async () => {
                try {
                    const txId = response.transactionId;
                    if (!txId) return;

                    const statusResponse = await apiRequest<{ status: string }>(`/payments/status/${txId}`);

                    if (statusResponse.status === 'completed') {
                        clearInterval(pollInterval);
                        setPaymentStatus('success');
                        toast({
                            title: t.common?.success || 'Success',
                            description: 'Payment completed successfully!',
                            className: 'bg-green-50 text-green-900 border-green-200'
                        });
                        onSuccess?.(txId);
                    } else if (statusResponse.status === 'failed' || statusResponse.status === 'cancelled') {
                        clearInterval(pollInterval);
                        setPaymentStatus('error');
                        toast({
                            title: t.common?.error || 'Error',
                            description: 'Payment failed',
                            variant: 'destructive'
                        });
                    }
                } catch (error) {
                    // silent fail on poll
                }
            }, 3000);

            // Timeout
            setTimeout(() => clearInterval(pollInterval), 600000);

        } catch (error: any) {
            setPaymentStatus('error');
            toast({
                title: t.common?.error || 'Payment Failed',
                description: error.message || 'Could not process payment',
                variant: 'destructive'
            });
        } finally {
            if (selectedMethod !== 'stripe') {
                setIsProcessing(false);
            }
        }
    };

    return (
        <div className="space-y-6">
            {/* Payment Summary */}
            <Card className="glass-card p-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Payment Details</h3>
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-400">Description:</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{description}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-400">Amount:</span>
                        <span className="font-bold text-xl text-brand-600 dark:text-brand-400">
                            {amount.toLocaleString()} {currency}
                        </span>
                    </div>
                    {transactionId && (
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-500 dark:text-slate-500">Transaction ID:</span>
                            <span className="font-mono text-slate-700 dark:text-slate-300">{transactionId}</span>
                        </div>
                    )}
                </div>
            </Card>

            {/* Payment Method Selection */}
            {paymentStatus === 'idle' && (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Select Payment Method</h3>
                    <div className="grid gap-4">
                        {availableMethods.map((method) => {
                            const info = paymentMethodInfo[method];
                            const Icon = info.icon;
                            const isSelected = selectedMethod === method;

                            return (
                                <motion.div
                                    key={method}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setSelectedMethod(method)}
                                    className={`
                    cursor-pointer rounded-2xl p-6 border-2 transition-all
                    ${isSelected
                                            ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/20'
                                            : 'border-slate-200 dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-700'
                                        }
                  `}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${info.color} flex items-center justify-center`}>
                                            <Icon className="w-8 h-8 text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-lg font-bold text-slate-900 dark:text-white">{info.name}</h4>
                                            <p className="text-sm text-slate-600 dark:text-slate-400">{info.description}</p>
                                        </div>
                                        {isSelected && (
                                            <CheckCircle className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Payment Status */}
            <AnimatePresence mode="wait">
                {paymentStatus === 'processing' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="flex flex-col items-center justify-center py-12 space-y-4"
                    >
                        <Loader2 className="w-16 h-16 animate-spin text-brand-600" />
                        <p className="text-lg font-semibold text-slate-900 dark:text-white">Processing payment...</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Please complete the payment in the opened window</p>
                    </motion.div>
                )}

                {paymentStatus === 'success' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center py-12 space-y-4"
                    >
                        <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                            <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Payment Successful!</h3>
                        <p className="text-slate-600 dark:text-slate-400">Your payment has been processed successfully</p>
                    </motion.div>
                )}

                {paymentStatus === 'error' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center py-12 space-y-4"
                    >
                        <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                            <AlertCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Payment Failed</h3>
                        <p className="text-slate-600 dark:text-slate-400">There was an issue processing your payment</p>
                        <Button onClick={() => setPaymentStatus('idle')} variant="outline">
                            Try Again
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Action Buttons */}
            {paymentStatus === 'idle' && (
                <div className="flex gap-4">
                    <Button
                        onClick={handlePayment}
                        disabled={!selectedMethod || isProcessing}
                        className="flex-1 bg-gradient-to-r from-brand-600 to-blue-500 hover:from-brand-700 hover:to-blue-600 text-white font-bold py-6 text-lg"
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            `Pay ${amount.toLocaleString()} ${currency}`
                        )}
                    </Button>
                    {onCancel && (
                        <Button onClick={onCancel} variant="outline" className="px-8 py-6">
                            Cancel
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}
