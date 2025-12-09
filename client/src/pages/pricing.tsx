import React, { useState } from "react";
import { useLocation } from "wouter";
import { Check, Zap, Crown, Building2, ArrowRight, Sparkles, FileText, Globe, Shield, Users, MessageSquare, Download, Loader } from "lucide-react";
import { motion } from "framer-motion";
import { LiveButton } from "@/components/ui/live-elements";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Plane } from "lucide-react";
import { apiRequest } from "@/lib/api";

export default function Pricing() {
  const [_, setLocation] = useLocation();
  const { t, lang, setLang } = useI18n();
  const { user } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');

  const plans = [
    {
      id: "starter",
      name: t.pricing.starter,
      price: t.pricing.free,
      priceValue: 0,
      annualPrice: null,
      period: t.pricing.forever,
      description: "Perfect for individuals exploring immigration options",
      audience: "Individual visa applicants and students",
      icon: Zap,
      color: "from-blue-500 to-cyan-500",
      features: [
        "AI Eligibility Checker",
        "Basic AI Chat Assistant",
        "Document Templates (3/month)",
        "Community Support",
        "Basic Roadmap Tracking",
        "Email Support"
      ],
      cta: t.pricing.getStarted,
      popular: false
    },
    {
      id: "professional",
      name: t.pricing.professional,
      price: billingPeriod === 'monthly' ? "$99" : "$990",
      priceValue: billingPeriod === 'monthly' ? 9900 : 99000,
      annualPrice: 99000,
      period: billingPeriod === 'monthly' ? t.pricing.perMonth : "/year (Save 25%)",
      description: "For serious applicants and professionals",
      audience: "Active visa applicants, professionals relocating",
      icon: Crown,
      color: "from-purple-500 to-pink-500",
      features: [
        "Everything in Starter",
        "Unlimited AI Document Generation",
        "Advanced AI Chat with Legal Context",
        "Document Upload & Analysis",
        "AI Translation (10/month)",
        "Priority Support",
        "Case Management",
        "Export Reports (CSV/JSON)",
        "Advanced Analytics"
      ],
      cta: t.pricing.startTrial,
      popular: true
    },
    {
      id: "enterprise",
      name: t.pricing.enterprise,
      price: "Custom",
      priceValue: 0,
      annualPrice: null,
      period: t.pricing.contactUs,
      description: "For law firms and organizations",
      audience: "Immigration lawyers, agencies, HR departments, staffing firms",
      icon: Building2,
      color: "from-orange-500 to-red-500",
      features: [
        "Everything in Professional",
        "Unlimited Everything",
        "White-label Options",
        "Custom AI Training",
        "Dedicated Account Manager",
        "API Access",
        "On-premise Deployment",
        "Custom Integrations",
        "SLA Guarantee"
      ],
      cta: t.pricing.contactSales,
      popular: false
    }
  ];

  const handleCheckout = async (plan: typeof plans[0]) => {
    try {
      // If user not logged in, redirect to auth first
      if (!user) {
        setLocation('/auth');
        return;
      }

      setLoadingPlan(plan.id);

      // If free plan, just redirect to dashboard
      if (plan.priceValue === 0) {
        setLocation('/dashboard');
        return;
      }

      // If enterprise, send email
      if (plan.id === 'enterprise') {
        window.location.href = 'mailto:sales@immigrationai.com?subject=Enterprise Pricing Inquiry';
        setLoadingPlan(null);
        return;
      }

      // Create payment intent
      const response = await apiRequest<any>('/stripe/create-intent', {
        method: 'POST',
        body: JSON.stringify({
          amount: plan.priceValue / 100,
          description: `${plan.name} Subscription (${billingPeriod})`
        })
      });

      if (response.clientSecret) {
        // Redirect to checkout page with payment intent
        setLocation(`/checkout?clientSecret=${response.clientSecret}&planId=${plan.id}&billingPeriod=${billingPeriod}`);
      }
    } catch (error) {
      console.error('Checkout error:', error);
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Navigation */}
      <nav className="fixed w-full z-50 px-6 py-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <motion.div 
            className="flex items-center gap-3 font-extrabold text-2xl tracking-tight cursor-pointer"
            onClick={() => setLocation('/')}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-brand-600 to-brand-400 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20 text-white">
              <Plane className="transform -rotate-45" size={20} strokeWidth={2.5} />
            </div>
            <span className="text-slate-900 dark:text-white">Immigration<span className="text-brand-600 dark:text-brand-400">AI</span></span>
          </motion.div>
          <div className="flex items-center gap-4">
            <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex border border-slate-200 dark:border-slate-700">
              {['en','uz','ru'].map(l => (
                <button key={l} onClick={()=>setLang(l as any)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all uppercase ${lang===l ? 'bg-white dark:bg-slate-700 shadow-sm text-brand-600 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>
                  {l}
                </button>
              ))}
            </div>
            <ThemeToggle />
            <LiveButton variant="ghost" onClick={() => setLocation('/auth')}>{t.nav.login}</LiveButton>
            <LiveButton onClick={() => setLocation('/auth')}>{t.nav.start}</LiveButton>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-50 dark:bg-brand-900/30 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 text-sm font-bold mb-8"
          >
            <Sparkles size={16} />
            Simple, Transparent Pricing
          </motion.div>
          
          <h1 className="text-5xl md:text-6xl font-extrabold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
            {t.pricing.title}
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            {t.pricing.subtitle}
          </p>
        </div>

        {/* Billing Period Toggle */}
        <div className="flex justify-center mb-16">
          <div className="inline-flex items-center gap-4 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-6 py-3 rounded-xl font-bold transition-all ${
                billingPeriod === 'monthly'
                  ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('annual')}
              className={`px-6 py-3 rounded-xl font-bold transition-all relative ${
                billingPeriod === 'annual'
                  ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Annual
              <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                Save 25%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative rounded-3xl p-8 border-2 transition-all ${
                plan.popular
                  ? 'bg-white dark:bg-slate-900 border-brand-500 shadow-2xl shadow-brand-500/20 scale-105'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-brand-500 to-purple-500 text-white text-xs font-bold rounded-full">
                  {t.pricing.mostPopular}
                </div>
              )}

              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-r ${plan.color} flex items-center justify-center mb-6`}>
                <plan.icon className="text-white" size={28} />
              </div>

              <h3 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">{plan.name}</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-2 text-sm">{plan.description}</p>
              <p className="text-xs text-brand-600 dark:text-brand-400 font-bold mb-6 bg-brand-50 dark:bg-brand-900/30 px-3 py-1.5 rounded-lg inline-block">
                For: {plan.audience}
              </p>

              <div className="mb-8">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-extrabold text-slate-900 dark:text-white">{plan.price}</span>
                  {plan.price !== "Custom" && plan.price !== "Free" && (
                    <span className="text-slate-500 dark:text-slate-400">/mo</span>
                  )}
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{plan.period}</p>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700 dark:text-slate-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <LiveButton
                variant={plan.popular ? "primary" : "secondary"}
                className="w-full"
                disabled={loadingPlan === plan.id}
                onClick={() => handleCheckout(plan)}
              >
                {loadingPlan === plan.id ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    {plan.cta} <ArrowRight size={16} />
                  </>
                )}
              </LiveButton>
            </motion.div>
          ))}
        </div>

        {/* Feature Comparison Table */}
        <div className="max-w-7xl mx-auto mt-32 mb-32">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Plan Comparison</h2>
            <p className="text-slate-600 dark:text-slate-400">See which features are included in each plan</p>
          </div>
          
          <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-800">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800">
                  <th className="px-6 py-4 text-left font-bold text-slate-900 dark:text-white">Feature</th>
                  <th className="px-6 py-4 text-center font-bold text-slate-900 dark:text-white">Starter (Free)</th>
                  <th className="px-6 py-4 text-center font-bold text-slate-900 dark:text-white">Professional</th>
                  <th className="px-6 py-4 text-center font-bold text-slate-900 dark:text-white">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: "AI Eligibility Checker", starter: true, pro: true, enterprise: true },
                  { feature: "AI Chat Assistant", starter: true, pro: true, enterprise: true },
                  { feature: "Document Templates", starter: "3/month", pro: "Unlimited", enterprise: "Unlimited" },
                  { feature: "Document Upload & Analysis", starter: false, pro: true, enterprise: true },
                  { feature: "AI Translation", starter: false, pro: "10/month", enterprise: "Unlimited" },
                  { feature: "Case Management", starter: false, pro: true, enterprise: true },
                  { feature: "Advanced Analytics", starter: false, pro: true, enterprise: true },
                  { feature: "Export Reports", starter: false, pro: true, enterprise: true },
                  { feature: "Priority Support", starter: false, pro: true, enterprise: true },
                  { feature: "API Access", starter: false, pro: false, enterprise: true },
                  { feature: "White-label", starter: false, pro: false, enterprise: true },
                  { feature: "Dedicated Manager", starter: false, pro: false, enterprise: true }
                ].map((row, i) => (
                  <tr key={i} className={`border-t border-slate-200 dark:border-slate-800 ${i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800/50'}`}>
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{row.feature}</td>
                    <td className="px-6 py-4 text-center">
                      {row.starter === true ? (
                        <Check className="w-5 h-5 text-green-500 mx-auto" />
                      ) : row.starter === false ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <span className="text-sm text-slate-600 dark:text-slate-400">{row.starter}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {row.pro === true ? (
                        <Check className="w-5 h-5 text-green-500 mx-auto" />
                      ) : row.pro === false ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <span className="text-sm text-slate-600 dark:text-slate-400">{row.pro}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {row.enterprise === true ? (
                        <Check className="w-5 h-5 text-green-500 mx-auto" />
                      ) : row.enterprise === false ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <span className="text-sm text-slate-600 dark:text-slate-400">{row.enterprise}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-4xl mx-auto mt-32 mb-20">
          <h2 className="text-3xl font-bold text-center mb-12 text-slate-900 dark:text-white">{t.pricing.faq}</h2>
          <div className="space-y-6">
            {[
              {
                q: t.pricing.changePlans,
                a: t.pricing.changePlansA
              },
              {
                q: t.pricing.paymentMethods,
                a: t.pricing.paymentMethodsA
              },
              {
                q: t.pricing.freeTrial,
                a: t.pricing.freeTrialA
              },
              {
                q: t.pricing.refunds,
                a: t.pricing.refundsA
              }
            ].map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
              >
                <h3 className="font-bold text-lg mb-2 text-slate-900 dark:text-white">{faq.q}</h3>
                <p className="text-slate-600 dark:text-slate-400">{faq.a}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}



