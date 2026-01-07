// Lawyer Subscription Management Component

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/lib/i18n';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    SUBSCRIPTION_TIERS,
    getAnnualPrice,
    ANNUAL_DISCOUNT,
    type SubscriptionTier
} from '@/lib/subscriptionTiers';
import { PaymentGateway } from '@/components/payment/PaymentGateway';
import {
    Check,
    X,
    Crown,
    Zap,
    TrendingUp,
    Calendar,
    CreditCard,
    AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';

export function LawyerSubscription() {
    const { user } = useAuth();
    const { t, lang } = useI18n();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
    const [selectedTier, setSelectedTier] = useState<SubscriptionTier | null>(null);
    const [showPayment, setShowPayment] = useState(false);

    // Fetch current subscription
    const { data: currentSubscription } = useQuery({
        queryKey: ['/subscriptions/current'],
        queryFn: () => apiRequest<{ tier: string; expiresAt: string; status: string }>('/subscriptions/current'),
    });

    // Subscribe mutation
    const subscribeMutation = useMutation({
        mutationFn: (data: { tierId: string; billingPeriod: 'monthly' | 'annual' }) =>
            apiRequest('/subscriptions/subscribe', {
                method: 'POST',
                body: JSON.stringify(data),
            }),
        onSuccess: () => {
            toast({
                title: t.common?.success || 'Success',
                description: 'Subscription activated successfully!',
                className: 'bg-green-50 text-green-900 border-green-200'
            });
            queryClient.invalidateQueries({ queryKey: ['/subscriptions/current'] });
            setShowPayment(false);
            setSelectedTier(null);
        },
        onError: (error: any) => {
            toast({
                title: t.common?.error || 'Error',
                description: error.message || 'Failed to activate subscription',
                variant: 'destructive'
            });
        },
    });

    const handleSelectTier = (tier: SubscriptionTier) => {
        setSelectedTier(tier);
        setShowPayment(true);
    };

    const handlePaymentSuccess = (transactionId: string) => {
        if (selectedTier) {
            subscribeMutation.mutate({
                tierId: selectedTier.id,
                billingPeriod,
            });
        }
    };

    const getTierPrice = (tier: SubscriptionTier) => {
        return billingPeriod === 'annual' ? getAnnualPrice(tier) : tier.price;
    };

    const getTierName = (tier: SubscriptionTier) => {
        if (lang === 'uz') return tier.nameUz;
        if (lang === 'ru') return tier.nameRu;
        return tier.name;
    };

    if (showPayment && selectedTier) {
        const price = getTierPrice(selectedTier);
        return (
            <div className="max-w-2xl mx-auto py-8">
                <Button
                    onClick={() => setShowPayment(false)}
                    variant="ghost"
                    className="mb-6"
                >
                    ← Back to plans
                </Button>

                <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
                    Subscribe to {getTierName(selectedTier)}
                </h2>
                <p className="text-slate-600 dark:text-slate-400 mb-8">
                    {billingPeriod === 'annual' && `Save ${(ANNUAL_DISCOUNT * 100).toFixed(0)}% with annual billing!`}
                </p>

                <PaymentGateway
                    amount={price}
                    currency={selectedTier.currency}
                    description={`${getTierName(selectedTier)} Subscription - ${billingPeriod === 'annual' ? 'Annual' : 'Monthly'}`}
                    onSuccess={handlePaymentSuccess}
                    onCancel={() => setShowPayment(false)}
                />
            </div>
        );
    }

    return (
        <div className="py-8 space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-black text-slate-900 dark:text-white">
                    Choose Your Plan
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                    Powerful subscription plans designed for immigration lawyers in Uzbekistan
                </p>
            </div>

            {/* Current Subscription Alert */}
            {currentSubscription && (
                <Card className="glass-card p-6 max-w-2xl mx-auto border-brand-500">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-brand-100 dark:bg-brand-900/20 flex items-center justify-center flex-shrink-0">
                            <Crown className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                                Active Subscription
                            </h3>
                            <p className="text-slate-600 dark:text-slate-400 text-sm">
                                You're currently on the <span className="font-semibold">{currentSubscription.tier}</span> plan.
                                {currentSubscription.expiresAt && (
                                    <> Renews on {new Date(currentSubscription.expiresAt).toLocaleDateString()}.</>
                                )}
                            </p>
                        </div>
                    </div>
                </Card>
            )}

            {/* Billing Period Toggle */}
            <div className="flex items-center justify-center gap-4">
                <button
                    onClick={() => setBillingPeriod('monthly')}
                    className={`px-6 py-2 rounded-full font-semibold transition-all ${billingPeriod === 'monthly'
                            ? 'bg-brand-600 text-white'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                >
                    Monthly
                </button>
                <button
                    onClick={() => setBillingPeriod('annual')}
                    className={`px-6 py-2 rounded-full font-semibold transition-all relative ${billingPeriod === 'annual'
                            ? 'bg-brand-600 text-white'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                >
                    Annual
                    <Badge className="absolute -top-2 -right-2 bg-green-600 text-white text-xs">
                        Save {(ANNUAL_DISCOUNT * 100).toFixed(0)}%
                    </Badge>
                </button>
            </div>

            {/* Pricing Cards */}
            <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
                {SUBSCRIPTION_TIERS.map((tier, index) => {
                    const price = getTierPrice(tier);
                    const isCurrentPlan = currentSubscription?.tier.toLowerCase() === tier.id;

                    return (
                        <motion.div
                            key={tier.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="relative"
                        >
                            {tier.popular && (
                                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                                    <Badge className="bg-gradient-to-r from-brand-600 to-blue-500 text-white px-4 py-1 font-bold">
                                        ⭐ Most Popular
                                    </Badge>
                                </div>
                            )}

                            <Card
                                className={`glass-card p-8 h-full flex flex-col ${tier.popular ? 'border-2 border-brand-500 shadow-xl' : ''
                                    } ${isCurrentPlan ? 'ring-2 ring-green-500' : ''}`}
                            >
                                {/* Header */}
                                <div className="text-center mb-6">
                                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${tier.color} mx-auto mb-4 flex items-center justify-center`}>
                                        {tier.id === 'starter' && <Zap className="w-8 h-8 text-white" />}
                                        {tier.id === 'professional' && <TrendingUp className="w-8 h-8 text-white" />}
                                        {tier.id === 'enterprise' && <Crown className="w-8 h-8 text-white" />}
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
                                        {getTierName(tier)}
                                    </h3>
                                    <div className="flex items-baseline justify-center gap-2">
                                        <span className="text-4xl font-black text-brand-600 dark:text-brand-400">
                                            {(price / 1000).toFixed(0)}k
                                        </span>
                                        <span className="text-slate-600 dark:text-slate-400">
                                            {tier.currency}/{billingPeriod === 'annual' ? 'year' : 'mo'}
                                        </span>
                                    </div>
                                    {billingPeriod === 'annual' && (
                                        <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                                            ~{((price / 12) / 1000).toFixed(0)}k {tier.currency}/mo
                                        </p>
                                    )}
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                                        {tier.commission}% commission on payments
                                    </p>
                                </div>

                                {/* Features */}
                                <div className="space-y-3 flex-1 mb-6">
                                    {tier.features.map((feature, idx) => (
                                        <div key={idx} className="flex items-start gap-3">
                                            {feature.included ? (
                                                <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                                            ) : (
                                                <X className="w-5 h-5 text-slate-400 dark:text-slate-600 flex-shrink-0 mt-0.5" />
                                            )}
                                            <div className="flex-1">
                                                <span className={`text-sm ${feature.included ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-500'}`}>
                                                    {feature.name}
                                                </span>
                                                {feature.details && (
                                                    <span className="text-xs text-slate-500 dark:text-slate-500 ml-1">
                                                        ({feature.details})
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* CTA */}
                                <Button
                                    onClick={() => handleSelectTier(tier)}
                                    disabled={isCurrentPlan}
                                    className={`w-full py-6 text-lg font-bold ${tier.popular
                                            ? 'bg-gradient-to-r from-brand-600 to-blue-500 hover:from-brand-700 hover:to-blue-600 text-white'
                                            : ''
                                        }`}
                                    variant={tier.popular ? 'default' : 'outline'}
                                >
                                    {isCurrentPlan ? (
                                        <>
                                            <Check className="w-5 h-5 mr-2" />
                                            Current Plan
                                        </>
                                    ) : (
                                        'Subscribe Now'
                                    )}
                                </Button>
                            </Card>
                        </motion.div>
                    );
                })}
            </div>

            {/* Additional Info */}
            <Card className="glass-card p-6 max-w-4xl mx-auto">
                <div className="flex items-start gap-4">
                    <AlertCircle className="w-6 h-6 text-brand-600 dark:text-brand-400 flex-shrink-0" />
                    <div className="space-y-2">
                        <h4 className="font-bold text-slate-900 dark:text-white">What happens after subscription?</h4>
                        <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                            <li>• Instant access to all tier features</li>
                            <li>• Lower commission rates on client payments</li>
                            <li>• Priority support and dedicated resources</li>
                            <li>• Cancel or upgrade anytime</li>
                        </ul>
                    </div>
                </div>
            </Card>
        </div>
    );
}
