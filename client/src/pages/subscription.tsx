import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { CreditCard, AlertCircle, Check, X, Calendar, DollarSign, Settings, LogOut, History } from "lucide-react";
import { motion } from "framer-motion";
import { LiveButton, AnimatedCard } from "@/components/ui/live-elements";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { apiRequest } from "@/lib/api";
import { error as logError } from "@/lib/logger";
import { trackEvent } from "../lib/analytics";

interface Subscription {
  id: string;
  userId: string;
  plan: "starter" | "professional" | "enterprise";
  status: "active" | "cancelled" | "expired";
  amount: number;
  currency: string;
  startDate: string;
  renewalDate: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

interface BillingHistory {
  id: string;
  date: string;
  amount: number;
  status: string;
  invoice: string;
}

const plans = [
  {
    id: "starter",
    name: "Starter",
    price: 0,
    period: "forever",
    description: "Ideal for basic immigration needs",
    features: [
      "50 Document Uploads / Month",
      "20 AI Document Generations",
      "500 AI Monthly Requests",
      "5 Consultations / Month",
    ],
  },
  {
    id: "professional",
    name: "Professional",
    price: 375000,
    period: "month",
    description: "For active solo applicants",
    features: [
      "150 Document Uploads / Month",
      "75 AI Document Generations",
      "7,500 AI Monthly Requests",
      "30 Consultations / Month",
      "Priority Support",
      "Advanced Analytics",
    ],
    popular: true,
  },
  {
    id: "premium",
    name: "Premium",
    price: 1200000,
    period: "month",
    description: "For power users & families",
    features: [
      "500 Document Uploads / Month",
      "250 AI Document Generations",
      "25,000 AI Monthly Requests",
      "100 Consultations / Month",
      "Lawyer Directory Access",
      "Custom Reports",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 3850000,
    period: "month",
    description: "For large firms & organizations",
    features: [
      "10,000+ Document Uploads",
      "1,000+ AI Generations",
      "Unlimited AI Requests",
      "Full API Access",
      "White Label Options",
      "Dedicated AM",
    ],
  },
];

export default function SubscriptionPage() {
  const { user, logout, isLoading } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [billingHistory, setBillingHistory] = useState<BillingHistory[]>([]);
  const [usage, setUsage] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>("");

  useEffect(() => {
    if (!user) {
      setLocation("/auth");
      return;
    }

    const loadSubscription = async () => {
      try {
        setLoading(true);
        setError(null);
        const subs = await apiRequest<Subscription>("/subscription/current");
        setSubscription(subs);

        // fetch usage/quotas
        try {
          const u = await apiRequest<any>("/subscription/usage");
          setUsage(u);
        } catch (uErr) {
          // non-fatal
          console.warn("Failed to load usage:", uErr);
          setUsage(null);
        }

        const history = await apiRequest<BillingHistory[]>("/subscription/billing-history");
        setBillingHistory(history || []);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        logError("Failed to load subscription:", msg);
        setError(msg || "Failed to load subscription data");
        setSubscription({ id: "free", userId: user?.id || "", plan: "starter", status: "active", amount: 0, currency: "USD", startDate: new Date().toISOString(), renewalDate: new Date().toISOString() });
      } finally {
        setLoading(false);
      }
    };

    loadSubscription();
  }, [user, setLocation]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) return null;

  const handleUpgrade = async (planId: string) => {
    try {
      try { trackEvent('subscription_upgrade_initiated', { planId }); } catch { }
      const response = await apiRequest<{ checkoutUrl?: string }>("/subscription/upgrade", {
        method: "POST",
        body: JSON.stringify({ planId }),
      });

      if (response.checkoutUrl) {
        window.location.href = response.checkoutUrl;
      }

      toast({
        title: "Upgrade Started",
        description: "Redirecting to checkout...",
        className: "bg-green-50 text-green-900 border-green-200",
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      toast({
        title: "Error",
        description: msg || "Failed to upgrade plan",
        variant: "destructive",
      });
    }
  };

  const handleCancel = async () => {
    if (confirm("Are you sure you want to cancel your subscription?")) {
      try {
        try { trackEvent('subscription_cancelled', { userId: user?.id }); } catch { }
        await apiRequest("/subscription/cancel", { method: "POST" });
        toast({
          title: "Subscription Cancelled",
          description: "Your subscription has been cancelled",
          className: "bg-red-50 text-red-900 border-red-200",
        });
        setSubscription(null);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        toast({
          title: "Error",
          description: msg || "Failed to cancel subscription",
          variant: "destructive",
        });
      }
    }
  };

  if (!user) return null;

  const currentPlan = subscription?.plan || "starter";
  const currentPlanData = plans.find(p => p.id === currentPlan);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 px-6 py-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <motion.div
            className="flex items-center gap-3 font-extrabold text-2xl tracking-tight cursor-pointer"
            onClick={() => setLocation("/dashboard")}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-brand-600 to-brand-400 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20 text-white">
              <CreditCard size={20} />
            </div>
            <span className="text-slate-900 dark:text-white">ImmigrationAI</span>
          </motion.div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <LiveButton variant="ghost" onClick={() => setLocation("/payment-history")} className="text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/20" icon={History}>
              Payment History
            </LiveButton>
            <LiveButton variant="ghost" onClick={() => { logout(); setLocation("/"); }} className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20">
              <LogOut size={18} />
              {t.dash.logout}
            </LiveButton>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-6 lg:p-12">
        {/* Error Banner */}
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 flex items-start gap-3">
            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Failed to load subscription data</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </motion.div>
        )}

        {/* Current Subscription */}
        {subscription && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
            <AnimatedCard className="border-l-4 border-brand-500">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                    {currentPlanData?.name} Plan
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400">
                    {currentPlanData?.description}
                  </p>
                </div>
                <span className={`px-4 py-2 rounded-full text-sm font-bold ${(subscription?.status || "").toLowerCase() === "active" ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"}`}>
                  {(() => {
                    const st = subscription?.status || "";
                    if (!st) return "Unknown";
                    try {
                      return st.charAt(0).toUpperCase() + st.slice(1);
                    } catch {
                      return String(st);
                    }
                  })()}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">{t.subscription?.price || "Price"}</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">${subscription?.amount || 0}
                    {subscription?.plan !== "starter" && <span className="text-sm text-slate-500 dark:text-slate-400">/month</span>}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">{t.subscription?.billingCycle || "Billing Cycle"}</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{subscription?.plan === "starter" ? "Forever Free" : "Monthly"}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">{t.subscription?.started || "Started"}</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{subscription?.startDate ? (() => {
                    const d = new Date(subscription.startDate);
                    return isNaN(d.getTime()) ? "N/A" : d.toLocaleDateString();
                  })() : "N/A"}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">{t.subscription?.renewal || "Renewal"}</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{subscription?.plan === "starter" ? "N/A" : (subscription?.renewalDate ? (() => {
                    const d = new Date(subscription.renewalDate);
                    return isNaN(d.getTime()) ? "N/A" : d.toLocaleDateString();
                  })() : "N/A")}</p>
                </div>
              </div>

              {/* Usage / Quotas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Document Uploads (this month)</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{usage && usage.documentUploads ? `${usage.documentUploads.remaining} / ${usage.documentUploads.limit}` : "-"}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Used: {usage && usage.documentUploads ? usage.documentUploads.used : "-"}</p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">AI Document Generations (this month)</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{usage && usage.aiDocumentGenerations ? `${usage.aiDocumentGenerations.remaining} / ${usage.aiDocumentGenerations.limit}` : "-"}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Used: {usage && usage.aiDocumentGenerations ? usage.aiDocumentGenerations.used : "-"}</p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">AI Requests (this month)</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{usage && usage.aiMonthlyRequests ? `${usage.aiMonthlyRequests.remaining} / ${usage.aiMonthlyRequests.limit}` : "-"}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Used: {usage && usage.aiMonthlyRequests ? usage.aiMonthlyRequests.used : "-"}</p>
                </div>
              </div>

              <div className="flex gap-4">
                {subscription.status === "active" && currentPlan !== "enterprise" && (
                  <LiveButton variant="primary" onClick={() => {
                    setSelectedPlan(currentPlan === "starter" ? "professional" : "enterprise");
                    setShowUpgradeModal(true);
                  }}>
                    Upgrade Plan
                  </LiveButton>
                )}
                {subscription.status === "active" && (
                  <LiveButton variant="ghost" className="text-red-600 hover:bg-red-50" onClick={handleCancel}>
                    Cancel Subscription
                  </LiveButton>
                )}
              </div>
            </AnimatedCard>
          </motion.div>
        )}

        {/* Plans Comparison */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-12">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">{t.subscription?.upgradeYourPlan || "Scale Your Capacity"}</h2>

          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan, i) => (
              <motion.div key={plan.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <AnimatedCard className={`flex flex-col h-full ${plan.popular ? "border-2 border-brand-500 relative" : "border border-slate-200 dark:border-slate-700"}`}>
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-500 text-white px-4 py-1 rounded-full text-xs font-bold">
                      {t.subscription?.mostPopular || "Recommended"}
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{plan.name}</h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">{plan.description}</p>
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-slate-900 dark:text-white">{plan.price.toLocaleString()}</span>
                      <span className="text-xl font-medium text-slate-500">UZS</span>
                      <span className="text-slate-600 dark:text-slate-400">/{plan.period === "month" ? "mo" : "forever"}</span>
                    </div>
                  </div>

                  <div className="flex-1 mb-6">
                    <div className="space-y-3">
                      {plan.features.map((feature, j) => (
                        <div key={j} className="flex items-start gap-3">
                          <Check size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-slate-600 dark:text-slate-400 text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <LiveButton
                    variant={plan.id === currentPlan ? "ghost" : "primary"}
                    className="w-full"
                    disabled={plan.id === currentPlan}
                    onClick={() => {
                      if (plan.id !== currentPlan) {
                        handleUpgrade(plan.id);
                      }
                    }}
                  >
                    {plan.id === currentPlan ? (t.subscription?.currentPlan || "Current Plan") : (t.subscription?.upgrade || "Upgrade")}
                  </LiveButton>
                </AnimatedCard>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Billing History */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <AnimatedCard>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">{t.subscription?.billingHistory || "Transactional Archive"}</h3>

            {billingHistory.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <AlertCircle size={32} className="mx-auto mb-2 opacity-50" />
                <p>{t.subscription?.noBillingHistory || "No transaction records found"}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-3 px-4 font-bold text-slate-600 dark:text-slate-400">{t.subscription?.date || "Timestamp"}</th>
                      <th className="text-left py-3 px-4 font-bold text-slate-600 dark:text-slate-400">{t.subscription?.amount || "Value"}</th>
                      <th className="text-left py-3 px-4 font-bold text-slate-600 dark:text-slate-400">{t.subscription?.status || "State"}</th>
                      <th className="text-left py-3 px-4 font-bold text-slate-600 dark:text-slate-400">{t.subscription?.invoice || "Voucher"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billingHistory.map((item) => (
                      <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-3 px-4 text-slate-900 dark:text-white">{(() => {
                          const d = new Date(item.date);
                          return isNaN(d.getTime()) ? "N/A" : d.toLocaleDateString();
                        })()}</td>
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">${item.amount}</td>
                        <td className="py-3 px-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${item.status === "paid" ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400" : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400"}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <a href={`#invoice-${item.id}`} className="text-brand-600 hover:text-brand-700 dark:text-brand-400 font-medium">
                            {t.subscription?.download || "Retrieve PDF"}
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AnimatedCard>
        </motion.div>
      </div>
    </div>
  );
}
