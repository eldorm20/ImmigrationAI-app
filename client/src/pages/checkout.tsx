import React, { useEffect, useState } from "react";
import type { Stripe, StripeElements } from '@stripe/stripe-js';
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Check, ArrowLeft, Lock, Loader } from "lucide-react";
import { LiveButton } from "@/components/ui/live-elements";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

declare global {
  interface Window {
    Stripe?: Stripe | null;
  }
}

export default function Checkout() {
  const [location, setLocation] = useLocation();
  const { t } = useI18n();
  const { user, isLoading } = useAuth();
  const { toast } = useToast();

  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [elements, setElements] = useState<StripeElements | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentComplete, setPaymentComplete] = useState(false);

  const params = new URLSearchParams(location.split('?')[1]);
  const clientSecret = params.get('clientSecret');
  // PlanId might be 'tier' in mock flow or 'planId' in stripe flow
  const planId = params.get('planId') || params.get('tier');
  const isMock = params.get('mock') === 'true';
  const sessionId = params.get('session_id');

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      setLocation('/auth');
      return;
    }

    // Handle success/canceled query params from Stripe redirect
    if (params.get('success') === 'true') {
      setPaymentComplete(true);
      toast({
        title: "Payment Successful!",
        description: "Your subscription has been activated.",
        className: "bg-green-50 text-green-900 border-green-200"
      });
      setTimeout(() => setLocation('/dashboard'), 2000);
      return;
    }

    if (params.get('canceled') === 'true') {
      toast({
        title: "Payment Canceled",
        description: "You can try again when ready.",
        className: "bg-yellow-50 text-yellow-900 border-yellow-200"
      });
      setLocation('/dashboard');
      return;
    }

    // MOCK FLOW: If this is a mock checkout, we don't need Stripe initialization
    if (isMock && sessionId) {
      // We can just stay on this page and let the user click "Pay" to "confirm" the mock payment
      // Or we could auto-confirm. Let's let them click "Pay" for UX consistency, 
      // but we won't load Stripe.
      return;
    }

    if (!clientSecret) {
      // No clientSecret and not a mock session -> invalid state
      // check planId just in case they navigated manually to /checkout
      if (!planId) {
        setLocation('/dashboard');
      }
      return;
    }

    // Initialize Stripe
    const loadStripe = async () => {
      try {
        const configRes = await apiRequest<{ publicKey: string | null }>('/stripe/config', { skipErrorToast: true });
        if (configRes.publicKey) {
          // Load Stripe.js dynamically
          const script = document.createElement('script');
          script.src = 'https://js.stripe.com/v3/';
          script.async = true;
          script.onload = () => {
            if (window.Stripe) {
              setStripe(window.Stripe(configRes.publicKey!) as any);
            }
          };
          document.body.appendChild(script);
        }
      } catch (err) {
        console.error("Failed to load Stripe config", err);
      }
    };
    loadStripe();
  }, [user, isLoading, clientSecret, isMock, sessionId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setProcessing(true);
    setError(null);

    // MOCK FLOW SUBMISSION
    if (isMock) {
      // Simulate processing delay
      setTimeout(() => {
        setPaymentComplete(true);
        toast({
          title: "Mock Payment Successful",
          description: "This was a simulated transaction.",
          className: "bg-blue-50 text-blue-900 border-blue-200"
        });
        setTimeout(() => setLocation('/dashboard'), 2000);
        setProcessing(false);
      }, 1500);
      return;
    }

    if (!stripe || !clientSecret) return;

    try {
      // Mock payment confirmation logic for when clientSecret IS present but we want to confirm via API?
      // Actually standard Stripe Elements flow usually uses stripe.confirmPayment() 
      // but here the existing code used /stripe/confirm endpoint.
      // We'll stick to existing logic for non-mock.

      const response = await apiRequest<any>('/stripe/confirm', {
        method: 'POST',
        body: JSON.stringify({
          paymentIntentId: clientSecret
        })
      });

      if (response.status === 'success') {
        setPaymentComplete(true);
        toast({
          title: "Payment Successful!",
          description: "Your subscription has been activated. Redirecting to dashboard...",
          className: "bg-green-50 text-green-900 border-green-200"
        });

        setTimeout(() => {
          setLocation('/dashboard');
        }, 2000);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || 'Payment failed. Please try again.');
      toast({
        title: 'Payment Failed',
        description: msg || 'Please try again',
        className: 'bg-red-50 text-red-900 border-red-200'
      });
    } finally {
      if (!isMock) setProcessing(false);
    }
  };

  const planNames: Record<string, string> = {
    starter: 'Starter - Free',
    professional: 'Professional - $99/month',
    enterprise: 'Enterprise - Custom'
  };

  if (paymentComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-50 to-slate-50 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-8 max-w-md w-full border border-slate-200 dark:border-slate-800"
        >
          <div className="w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-center mb-2 text-slate-900 dark:text-white">
            Payment Successful!
          </h2>
          <p className="text-center text-slate-600 dark:text-slate-400 mb-6">
            Your subscription has been activated. You'll be redirected to your dashboard shortly.
          </p>
          <div className="text-center">
            <Loader className="w-6 h-6 animate-spin mx-auto text-brand-600" />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-slate-50 dark:from-slate-950 dark:to-slate-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <LiveButton
            variant="ghost"
            className="mb-6"
            onClick={() => setLocation('/pricing')}
          >
            <ArrowLeft size={16} />
            Back to Pricing
          </LiveButton>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
            Complete Your Purchase
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Secure payment powered by Stripe
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Order Summary */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 md:col-span-1"
          >
            <h2 className="font-bold text-lg mb-6 text-slate-900 dark:text-white">
              Order Summary
            </h2>
            <div className="space-y-4 mb-6 pb-6 border-b border-slate-200 dark:border-slate-800">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {planNames[planId || 'professional']}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Monthly subscription
                  </p>
                </div>
                <p className="font-bold text-slate-900 dark:text-white">
                  {planId === 'professional' ? '$99.00' : 'Free'}
                </p>
              </div>
            </div>
            <div className="flex justify-between items-center font-bold text-lg">
              <span className="text-slate-900 dark:text-white">Total</span>
              <span className="text-brand-600 dark:text-brand-400">
                {planId === 'professional' ? '$99.00' : '$0.00'}
              </span>
            </div>

            {/* Features */}
            <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-800">
              <h3 className="font-bold mb-4 text-slate-900 dark:text-white">
                What's Included
              </h3>
              <ul className="space-y-3">
                {[
                  'Unlimited documents',
                  'Priority support',
                  'Advanced analytics',
                  'Export reports'
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <Check size={16} className="text-green-500 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

          {/* Payment Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 md:col-span-2"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Billing Details */}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={user?.name || ''}
                  disabled
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white disabled:opacity-60"
                />
              </div>

              {/* Card Details - Placeholder */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  💳 In production, Stripe Elements would load here for secure card entry
                </p>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300"
                >
                  {error}
                </motion.div>
              )}

              {/* Security Info */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-start gap-3">
                <Lock size={18} className="text-slate-600 dark:text-slate-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Your payment information is secure and encrypted. Stripe never stores your card details.
                </p>
              </div>

              {/* Submit Button */}
              <LiveButton
                variant="primary"
                className="w-full py-3 font-bold"
                disabled={processing}
              >
                {processing ? (
                  <>
                    <Loader size={18} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Lock size={18} />
                    Pay {planId === 'professional' ? '$99.00' : 'Now'}
                  </>
                )}
              </LiveButton>

              <p className="text-xs text-center text-slate-500 dark:text-slate-400">
                By completing this purchase, you agree to our Terms of Service and Privacy Policy
              </p>
            </form>
          </motion.div>
        </div>

        {/* Trust Badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-12 flex justify-center items-center gap-8 flex-wrap text-sm text-slate-600 dark:text-slate-400"
        >
          <div className="flex items-center gap-2">
            <Lock size={16} />
            SSL Secure
          </div>
          <div>•</div>
          <div className="flex items-center gap-2">
            <Check size={16} className="text-green-500" />
            Stripe Verified
          </div>
          <div>•</div>
          <div>Money-Back Guarantee</div>
        </motion.div>
      </div>
    </div>
  );
}
