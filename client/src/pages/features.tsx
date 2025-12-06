import React from "react";
import { useLocation } from "wouter";
import { 
  Sparkles, FileText, Globe, Shield, MessageSquare, Download, 
  Upload, Search, Zap, BarChart3, Users, Lock, ArrowRight,
  CheckCircle, Brain, Languages, FileCheck, Clock, TrendingUp
} from "lucide-react";
import { motion } from "framer-motion";
import { LiveButton } from "@/components/ui/live-elements";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useI18n } from "@/lib/i18n";
import { Plane } from "lucide-react";

export default function Features() {
  const [_, setLocation] = useLocation();
  const { t, lang, setLang } = useI18n();

  const features = [
    {
      icon: Brain,
      title: "AI-Powered Research",
      description: "Access curated immigration law library with AI-powered search and analysis. Get instant answers from millions of cases and regulations.",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: FileText,
      title: "Document Drafting",
      description: "Generate professional immigration documents, petitions, and briefs with AI assistance. Save hours on document preparation.",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: MessageSquare,
      title: "AI Chat Assistant",
      description: "24/7 AI immigration assistant that understands context and provides accurate, up-to-date information about visa requirements.",
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: Upload,
      title: "Document Analysis",
      description: "Upload and analyze your documents. Get instant feedback on completeness, accuracy, and potential issues before submission.",
      color: "from-orange-500 to-red-500"
    },
    {
      icon: Languages,
      title: "AI Translation",
      description: "Secure AI-powered translation with certified options available. Translate documents while maintaining legal accuracy.",
      color: "from-indigo-500 to-purple-500"
    },
    {
      icon: Shield,
      title: "Eligibility Checker",
      description: "Advanced AI analyzes your profile and calculates approval probability. Get personalized recommendations for best visa routes.",
      color: "from-yellow-500 to-orange-500"
    },
    {
      icon: BarChart3,
      title: "Analytics Dashboard",
      description: "Track your application progress, view statistics, and monitor case status in real-time with comprehensive analytics.",
      color: "from-teal-500 to-cyan-500"
    },
    {
      icon: Users,
      title: "Case Management",
      description: "Organize and manage all your immigration cases in one place. Collaborate with lawyers and track deadlines.",
      color: "from-pink-500 to-rose-500"
    },
    {
      icon: Lock,
      title: "Enterprise Security",
      description: "Bank-level encryption, SOC 2 compliance, and regular security audits. Your data is protected with industry-leading security.",
      color: "from-slate-700 to-slate-900"
    }
  ];

  const stats = [
    { label: "Hours Saved", value: "10+", icon: Clock },
    { label: "Success Rate", value: "92%", icon: TrendingUp },
    { label: "Active Users", value: "10K+", icon: Users },
    { label: "Documents Generated", value: "50K+", icon: FileCheck }
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
            <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex border border-slate-200 dark:border-slate-700">
              {['en','uz','ru'].map(l => (
                <button key={l} onClick={()=>setLang(l as any)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all uppercase ${lang===l ? 'bg-white dark:bg-slate-700 shadow-sm text-brand-600 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>
                  {l}
                </button>
              ))}
            </div>
            <ThemeToggle />
            <LiveButton variant="ghost" onClick={() => setLocation('/pricing')}>{t.nav.pricing}</LiveButton>
            <LiveButton onClick={() => setLocation('/auth')}>{t.nav.start}</LiveButton>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-50 dark:bg-brand-900/30 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 text-sm font-bold mb-8"
          >
            <Sparkles size={16} />
            Powerful Features
          </motion.div>
          
          <h1 className="text-5xl md:text-6xl font-extrabold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
            {t.features.title}
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            {t.features.subtitle}
          </p>
        </div>

        {/* Stats */}
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 mb-20">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="text-center p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
            >
              <stat.icon className="w-8 h-8 mx-auto mb-3 text-brand-500" />
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white mb-1">{stat.value}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Features Grid */}
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8 mb-20">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -5 }}
              className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500 transition-all group"
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-r ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                <feature.icon className="text-white" size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">{feature.title}</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="max-w-4xl mx-auto text-center p-12 rounded-3xl bg-gradient-to-r from-brand-600 to-purple-600 text-white">
          <h2 className="text-3xl font-bold mb-4">{t.features.ready}</h2>
          <p className="text-xl mb-8 opacity-90">{t.features.join}</p>
          <LiveButton 
            variant="secondary" 
            size="lg"
            onClick={() => setLocation('/auth')}
          >
            {t.features.startTrial} <ArrowRight size={20} />
          </LiveButton>
        </div>
      </div>
    </div>
  );
}



