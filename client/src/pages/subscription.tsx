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
    description: "Perfect for getting started",
    features: [
      "5 Document Uploads/Month",
      "Basic AI Analysis",
      "Email Support",
      "1 Free Consultation",
    ],
  },
  {
    id: "professional",
    name: "Professional",
    price: 29,
    period: "month",
    description: "For serious applicants",
    features: [
      "Unlimited Documents",
      "Advanced AI Analysis",
      "Priority Email Support",
      "4 Consultations/Month",
      "Real-time Chat",
      "Video Consultations",
    ],
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 99,
    period: "month",
    description: "For immigration firms",
    features: [
      "Unlimited Everything",
      "Dedicated Account Manager",
      "24/7 Phone Support",
      "Unlimited Consultations",
      "Custom Integrations",
      "White Label Options",
    ],
  },
];

export default function SubscriptionPage() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [billingHistory, setBillingHistory] = useState<BillingHistory[]>([]);
  const [loading, setLoading] = useState(true);
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
        const subs = await apiRequest<Subscription>("/subscription/current");
        setSubscription(subs);

        const history = await apiRequest<BillingHistory[]>("/subscription/billing-history");
        setBillingHistory(history || []);
      } catch (error: any) {
        console.error("Failed to load subscription:", error);
      } finally {
        setLoading(false);
      }
    };

    loadSubscription();
  }, [user, setLocation]);

  const handleUpgrade = async (planId: string) => {
    try {
      const response = await apiRequest("/subscription/upgrade", {
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
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upgrade plan",
        variant: "destructive",
      });
    }
  };

  const handleCancel = async () => {
    if (confirm("Are you sure you want to cancel your subscription?")) {
      try {
        await apiRequest("/subscription/cancel", { method: "POST" });
        toast({
          title: "Subscription Cancelled",
          description: "Your subscription has been cancelled",
          className: "bg-red-50 text-red-900 border-red-200",
        });
        setSubscription(null);
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to cancel subscription",
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
                <span className={`px-4 py-2 rounded-full text-sm font-bold ${subscription.status === "active" ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"}`}>
                  {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Price</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">${subscription.amount}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Billing Cycle</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">Monthly</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Started</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{new Date(subscription.startDate).toLocaleDateString()}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Renews</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{new Date(subscription.renewalDate).toLocaleDateString()}</p>
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
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">Upgrade Your Plan</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan, i) => (
              <motion.div key={plan.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <AnimatedCard className={`flex flex-col h-full ${plan.popular ? "border-2 border-brand-500 relative" : "border border-slate-200 dark:border-slate-700"}`}>
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-500 text-white px-4 py-1 rounded-full text-xs font-bold">
                      Most Popular
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{plan.name}</h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">{plan.description}</p>
                    <div className="mt-4">
                      <span className="text-4xl font-bold text-slate-900 dark:text-white">${plan.price}</span>
                      <span className="text-slate-600 dark:text-slate-400">/{plan.period}</span>
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
                    {plan.id === currentPlan ? "Current Plan" : "Upgrade Now"}
                  </LiveButton>
                </AnimatedCard>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Billing History */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <AnimatedCard>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Billing History</h3>
            
            {billingHistory.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <AlertCircle size={32} className="mx-auto mb-2 opacity-50" />
                <p>No billing history yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-3 px-4 font-bold text-slate-600 dark:text-slate-400">Date</th>
                      <th className="text-left py-3 px-4 font-bold text-slate-600 dark:text-slate-400">Amount</th>
                      <th className="text-left py-3 px-4 font-bold text-slate-600 dark:text-slate-400">Status</th>
                      <th className="text-left py-3 px-4 font-bold text-slate-600 dark:text-slate-400">Invoice</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billingHistory.map((item) => (
                      <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-3 px-4 text-slate-900 dark:text-white">{new Date(item.date).toLocaleDateString()}</td>
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">${item.amount}</td>
                        <td className="py-3 px-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${item.status === "paid" ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400" : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400"}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <a href={`#invoice-${item.id}`} className="text-brand-600 hover:text-brand-700 dark:text-brand-400 font-medium">
                            Download
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
