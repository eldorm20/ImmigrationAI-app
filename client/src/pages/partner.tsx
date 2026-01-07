import React, { useState } from "react";
import { motion } from "framer-motion";
import { Plane, ArrowRight, Check, Users, TrendingUp, Globe, Zap, Shield, MessageSquare, Phone, Mail, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import { LiveButton } from "@/components/ui/live-elements";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import type { Language } from "@/lib/i18n";

export default function PartnerPage() {
  const [_, setLocation] = useLocation();
  const [contactForm, setContactForm] = useState({ name: "", email: "", company: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In production, this would send to your backend
    const body = `Partnership Interest from ${contactForm.company}\nLicense: ${(contactForm as any).license}\nTax ID: ${(contactForm as any).taxId}\n\nMessage:\n${contactForm.message}`;
    window.location.href = `mailto:partners@immigrationai.com?subject=Partnership Interest from ${contactForm.company}&body=${encodeURIComponent(body)}`;
    setSubmitted(true);
  };

  const partnerTypes = [
    {
      title: "Immigration Lawyers & Law Firms",
      description: "Enhance your practice with AI-powered document generation and case management",
      icon: Shield,
      benefits: ["White-label solutions", "Client portal integration", "API access", "Dedicated account manager"]
    },
    {
      title: "Immigration Consultants & Agents",
      description: "Add AI assessments to your service offerings and increase client satisfaction",
      icon: Users,
      benefits: ["Reseller pricing", "Co-branded materials", "Training & certification", "Commission structure"]
    },
    {
      title: "HR & Recruitment Firms",
      description: "Streamline visa sponsorship and employee relocation processes",
      icon: TrendingUp,
      benefits: ["Bulk discounts", "Custom integrations", "Multi-team support", "Priority support"]
    },
    {
      title: "Educational Institutions",
      description: "Help international students with visa guidance and documentation",
      icon: Globe,
      benefits: ["Student discounts", "Free staff training", "Institutional branding", "Lifetime license"]
    }
  ];

  const benefits = [
    {
      icon: Zap,
      title: "High Commission Structure",
      description: "Earn 20-30% recurring commission on every referred customer"
    },
    {
      icon: Shield,
      title: "White-Label Options",
      description: "Offer immigration services under your own brand with our technology"
    },
    {
      icon: Globe,
      title: "API Access",
      description: "Integrate ImmigrationAI seamlessly into your existing platforms"
    },
    {
      icon: Users,
      title: "Dedicated Support",
      description: "Personal account manager and priority technical support"
    },
    {
      icon: TrendingUp,
      title: "Revenue Growth",
      description: "Average partner revenue increases by 45% within 6 months"
    },
    {
      icon: MessageSquare,
      title: "Sales & Marketing",
      description: "Co-marketing opportunities and promotional materials provided"
    }
  ];

  const features = [
    {
      label: "Commission",
      starter: "15%",
      professional: "20%",
      enterprise: "30%"
    },
    {
      label: "Clients per Month",
      starter: "Unlimited",
      professional: "Unlimited",
      enterprise: "Unlimited"
    },
    {
      label: "Dedicated Manager",
      starter: false,
      professional: true,
      enterprise: true
    },
    {
      label: "White-Label",
      starter: false,
      professional: true,
      enterprise: true
    },
    {
      label: "API Access",
      starter: false,
      professional: true,
      enterprise: true
    },
    {
      label: "Training & Onboarding",
      starter: "Email",
      professional: "Phone+Email",
      enterprise: "24/7"
    }
  ];

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
            <ThemeToggle />
            <LiveButton variant="ghost" onClick={() => setLocation('/')}> Back to Home</LiveButton>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="pt-32 pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-50 dark:bg-brand-900/30 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 text-sm font-bold mb-8"
          >
            <TrendingUp size={16} />
            Partnership Opportunity
          </motion.div>

          <h1 className="text-5xl md:text-6xl font-extrabold mb-6 text-slate-900 dark:text-white">
            Grow Your Business with ImmigrationAI
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-12">
            Partner with us and unlock a new revenue stream. Get access to white-label solutions, high commission rates, and dedicated support.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <LiveButton size="lg" onClick={() => document.getElementById('apply')?.scrollIntoView({ behavior: 'smooth' })}>
              Apply Now <ArrowRight size={18} />
            </LiveButton>
            <LiveButton size="lg" variant="secondary" onClick={() => window.open('https://docs.immigrationai.com/partners', '_blank')}>
              View Documentation
            </LiveButton>
          </div>

          {/* Stats */}
          <div className="grid md:grid-cols-3 gap-8 max-w-2xl mx-auto pt-16 border-t border-slate-200 dark:border-slate-800">
            <div className="space-y-2">
              <div className="text-3xl font-bold text-brand-600 dark:text-brand-400">$50K+</div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Average Partner Revenue per Month</p>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-brand-600 dark:text-brand-400">30%</div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Commission Rate (up to 30%)</p>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-brand-600 dark:text-brand-400">150+</div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Active Partners Worldwide</p>
            </div>
          </div>
        </div>
      </div>

      {/* Partner Types */}
      <div className="py-24 px-6 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">Which Partner are You?</h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">We work with various partners to expand access to quality immigration services</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {partnerTypes.map((type, i) => {
              const Icon = type.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="p-8 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-600 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400 mb-4">
                    <Icon size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{type.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-6">{type.description}</p>
                  <div className="space-y-2">
                    {type.benefits.map((benefit, j) => (
                      <div key={j} className="flex items-start gap-2 text-sm">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-700 dark:text-slate-300">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Key Benefits */}
      <div className="py-24 px-6 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">Why Partner With Us?</h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">Comprehensive support to help you succeed</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {benefits.map((benefit, i) => {
              const Icon = benefit.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="p-6 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                >
                  <div className="w-10 h-10 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400 mb-4">
                    <Icon size={20} />
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white mb-2">{benefit.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{benefit.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Pricing Tiers */}
      <div className="py-24 px-6 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">Partner Tiers</h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">Choose the plan that fits your business model</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-slate-200 dark:border-slate-800">
                  <th className="text-left py-4 px-6 font-bold text-slate-900 dark:text-white">Features</th>
                  <th className="text-center py-4 px-4 font-bold text-slate-900 dark:text-white">Starter</th>
                  <th className="text-center py-4 px-4 font-bold text-slate-900 dark:text-white">Professional</th>
                  <th className="text-center py-4 px-4 font-bold text-slate-900 dark:text-white">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {features.map((feature, i) => (
                  <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-4 px-6 font-medium text-slate-900 dark:text-white">{feature.label}</td>
                    <td className="text-center py-4 px-4 text-slate-600 dark:text-slate-400">
                      {typeof feature.starter === 'boolean' ? (feature.starter ? <Check className="w-5 h-5 text-green-500 inline" /> : '-') : feature.starter}
                    </td>
                    <td className="text-center py-4 px-4 text-slate-600 dark:text-slate-400">
                      {typeof feature.professional === 'boolean' ? (feature.professional ? <Check className="w-5 h-5 text-green-500 inline" /> : '-') : feature.professional}
                    </td>
                    <td className="text-center py-4 px-4 text-slate-600 dark:text-slate-400">
                      {typeof feature.enterprise === 'boolean' ? (feature.enterprise ? <Check className="w-5 h-5 text-green-500 inline" /> : '-') : feature.enterprise}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Application Form */}
      <div id="apply" className="py-24 px-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">Ready to Partner?</h2>
            <p className="text-slate-600 dark:text-slate-400">Tell us about your business and we'll get in touch within 24 hours</p>
          </div>

          {!submitted ? (
            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">Full Name</label>
                  <input
                    type="text"
                    required
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">Email</label>
                  <input
                    type="email"
                    required
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition"
                    placeholder="john@company.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">Company Name</label>
                <input
                  type="text"
                  required
                  value={contactForm.company}
                  onChange={(e) => setContactForm({ ...contactForm, company: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition"
                  placeholder="Your Company"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">Business License Number</label>
                  <input
                    type="text"
                    value={(contactForm as any).license || ""}
                    onChange={(e) => setContactForm({ ...contactForm, license: e.target.value } as any)}
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition"
                    placeholder="License #"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">Tax ID / EIN</label>
                  <input
                    type="text"
                    value={(contactForm as any).taxId || ""}
                    onChange={(e) => setContactForm({ ...contactForm, taxId: e.target.value } as any)}
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition"
                    placeholder="Tax ID"
                  />
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg flex gap-3 text-sm text-blue-700 dark:text-blue-300">
                <Shield className="w-5 h-5 flex-shrink-0" />
                <p>To prevent fraud, all partners must undergo a business verification process. Please provide valid registration details.</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">Tell us about your business</label>
                <textarea
                  required
                  rows={5}
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition resize-none"
                  placeholder="What type of business do you run? How many clients do you serve annually? What are your goals?"
                />
              </div>

              <LiveButton type="submit" className="w-full">
                Submit Application <ChevronRight size={18} />
              </LiveButton>
            </form>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-8 text-center space-y-4"
            >
              <Check className="w-12 h-12 text-green-600 dark:text-green-400 mx-auto" />
              <h3 className="text-2xl font-bold text-green-900 dark:text-green-100">Application Submitted!</h3>
              <p className="text-green-700 dark:text-green-300">We'll review your application and contact you within 24 hours.</p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Contact Info */}
      <div className="py-16 px-6 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="w-12 h-12 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400 mx-auto mb-4">
                <Mail size={20} />
              </div>
              <p className="font-bold text-slate-900 dark:text-white mb-1">Email</p>
              <a href="mailto:partners@immigrationai.com" className="text-brand-600 dark:text-brand-400 hover:underline">
                partners@immigrationai.com
              </a>
            </div>
            <div>
              <div className="w-12 h-12 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400 mx-auto mb-4">
                <Phone size={20} />
              </div>
              <p className="font-bold text-slate-900 dark:text-white mb-1">Phone</p>
              <a href="tel:+1-800-555-0100" className="text-brand-600 dark:text-brand-400 hover:underline">
                +1 (800) 555-0100
              </a>
            </div>
            <div>
              <div className="w-12 h-12 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400 mx-auto mb-4">
                <MessageSquare size={20} />
              </div>
              <p className="font-bold text-slate-900 dark:text-white mb-1">Live Chat</p>
              <p className="text-slate-600 dark:text-slate-400">Available Monday-Friday, 9am-5pm EST</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
