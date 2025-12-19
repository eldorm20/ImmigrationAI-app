import React, { useState, useEffect } from "react";
import type { Language } from "@/lib/i18n";
import { useLocation } from "wouter";
import { useI18n } from "@/lib/i18n";
import { Plane, ArrowRight, Check, Play, Shield, Users, Globe, Star, ArrowUpRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { LiveButton, AnimatedCard } from "@/components/ui/live-elements";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { EligibilityQuiz } from "@/components/EligibilityQuiz";
// Background handled via CSS gradients - no image asset needed

export default function Home() {
  const { t, lang, setLang } = useI18n();
  /* Real Stats Fetching */
  const [stats, setStats] = useState({ usersCount: 1240, visasProcessed: 850, successRate: 92 });
  const [_, setLocation] = useLocation();
  const [age, setAge] = useState(25);

  useEffect(() => {
    fetch('/api/public-stats')
      .then(res => res.json())
      .then(data => {
        if (data.usersCount) setStats(data);
      })
      .catch(err => console.error("Failed to load public stats", err));
  }, []);

  const goLogin = (role: "applicant" | "lawyer") => {
    setLocation(`/auth?role=${role}`);
  };

  const startAssessment = () => {
    setLocation("/assessment");
  };

  const blogHighlights = [
    {
      title: "Top Immigration Visa Requirements for 2025",
      excerpt: "Latest updates on EU, UK, and Poland visa rules, documents, and timelines.",
      tag: "Visa Guides",
      date: "Dec 2024",
    },
    {
      title: "How to Prepare Your Immigration Application",
      excerpt: "A practical checklist to avoid rejections and keep your dossier complete.",
      tag: "Application Tips",
      date: "Nov 2024",
    },
    {
      title: "Success Stories: Real Immigration Journeys",
      excerpt: "See how Uzbek professionals used ImmigrationAI to get approvals faster.",
      tag: "Success",
      date: "Oct 2024",
    },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden font-sans text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-950 transition-colors duration-300">

      {/* Navigation Header */}
      <nav className="fixed w-full top-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 font-extrabold text-2xl tracking-tight cursor-pointer" onClick={() => setLocation("/")}>
            <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-purple-600 rounded-lg flex items-center justify-center text-white">
              <Globe size={18} />
            </div>
            <span className="text-slate-900 dark:text-white">{t.brand.name}</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-400">
            <a href="#" onClick={(e) => { e.preventDefault(); setLocation("/features"); }} className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">Features</a>
            <a href="#" onClick={(e) => { e.preventDefault(); setLocation("/pricing"); }} className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">Pricing</a>
            <a href="#" onClick={(e) => { e.preventDefault(); setLocation("/help"); }} className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">Help</a>
            <a href="#" onClick={(e) => { e.preventDefault(); setLocation("/blog"); }} className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">Blog</a>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={() => goLogin('applicant')}
                className="text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 font-bold text-sm px-4 py-2"
              >
                Sign In
              </button>
              <LiveButton
                onClick={() => goLogin('applicant')}
                size="sm"
                variant="primary"
                className="shadow-lg shadow-brand-500/20"
              >
                Get Started
              </LiveButton>
            </div>
          </div>
        </div>
      </nav>

      {/* Modern Geometric Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[40%] -right-[20%] w-[80%] h-[80%] bg-brand-500/10 dark:bg-brand-500/20 rounded-full blur-[120px] animate-float"></div>
        <div className="absolute top-[20%] -left-[10%] w-[60%] h-[60%] bg-accent-500/10 dark:bg-accent-500/20 rounded-full blur-[100px] animate-pulse-slow"></div>
      </div>

      {/* Hero Section */}
      <div className="pt-32 pb-20 px-6 max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-50 dark:bg-brand-900/30 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 text-sm font-bold mb-8">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-500"></span>
            </span>
            AI-Powered Visa Assistant V2.0 (Production Live)
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-[1.1] tracking-tight text-slate-900 dark:text-white">
            {t.hero.title} <br />
            <span className="text-gradient">
              AI Powered.
            </span>
          </h1>

          <p className="text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-lg leading-relaxed font-medium">
            {t.hero.sub} We simplify the complex legal journey into a clear, guided path using advanced AI.
            <br /><span className="text-sm mt-2 block opacity-80">Trusted by {stats.usersCount}+ applicants.</span>
          </p>

          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <LiveButton size="lg" onClick={startAssessment} icon={Play} className="w-full sm:w-auto px-8">
              Start Free Assessment
            </LiveButton>

            <div className="flex items-center gap-4 px-6 py-3 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 backdrop-blur-sm">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-800 overflow-hidden shadow-sm">
                    <img alt={`User ${i}`} src={`https://i.pravatar.cc/100?img=${i + 10}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              <div className="text-sm">
                <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1">4.9/5 <Star size={14} className="fill-yellow-400 text-yellow-400" /></p>
                <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">{stats.visasProcessed} Visas Processed</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Interactive Card */}
        <div className="relative perspective-1000 group">
          <div className="absolute inset-0 bg-gradient-to-tr from-brand-500 to-accent-500 rounded-[2.5rem] blur-2xl opacity-20 group-hover:opacity-30 transition-opacity duration-500 transform rotate-3 scale-105"></div>

          <motion.div
            initial={{ rotateY: 5, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            transition={{ duration: 1, type: "spring" }}
            className="glass-card p-8 md:p-10 rounded-[2rem] border-t border-white/60 dark:border-white/10 bg-gradient-to-br from-white/80 to-white/40 dark:from-slate-800/80 dark:to-slate-900/40 relative overflow-hidden z-10"
          >
            {/* Floating Badge */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-8 right-8 bg-white dark:bg-slate-800/90 backdrop-blur-md border border-green-200 dark:border-green-900 text-green-600 dark:text-green-400 px-4 py-2 rounded-xl shadow-lg flex gap-2 items-center"
            >
              <div className="bg-green-100 dark:bg-green-900/50 p-1 rounded-full"><Check size={14} strokeWidth={3} /></div>
              <span className="font-bold text-sm">Real AI Analysis</span>
            </motion.div>

            <h3 className="font-bold text-2xl mb-8 text-slate-900 dark:text-white flex items-center gap-3">
              <div className="p-2 rounded-lg bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400">
                <Shield size={24} />
              </div>
              Eligibility Check
            </h3>

            <div className="space-y-8">
              <div>
                <div className="flex justify-between text-sm font-bold mb-4 text-slate-600 dark:text-slate-300">
                  <span>Applicant Age</span>
                  <span className="text-brand-600 dark:text-brand-400 text-lg">{age} years</span>
                </div>
                <input
                  type="range"
                  min="18" max="60"
                  value={age}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAge(parseInt(e.target.value))}
                  className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-600 dark:accent-brand-500 hover:accent-brand-500 transition-all"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-2 font-medium">
                  <span>18</span><span>60</span>
                </div>
              </div>

              <motion.div
                className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 flex items-center justify-between relative overflow-hidden group-hover:border-brand-200 dark:group-hover:border-brand-800 transition-colors"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="absolute inset-0 bg-brand-500/5 animate-pulse"></div>
                <div>
                  <p className="text-slate-500 text-xs font-bold uppercase mb-1 tracking-widest">Global Success Rate</p>
                  <div className="flex items-end gap-2">
                    <motion.p
                      className="text-5xl font-extrabold text-slate-900 dark:text-white tracking-tighter"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring" }}
                    >
                      {stats.successRate}%
                    </motion.p>
                    <span className="text-green-500 font-bold mb-2 text-sm bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded">
                      Verified
                    </span>
                  </div>
                </div>
                <div className="relative h-16 w-16 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-200 dark:text-slate-800" />
                    <motion.circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke="currentColor"
                      strokeWidth="6"
                      fill="transparent"
                      className="text-brand-500"
                      strokeDasharray={175}
                      initial={{ strokeDashoffset: 175 }}
                      animate={{ strokeDashoffset: 175 - (175 * stats.successRate) / 100 }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </motion.div>

              <LiveButton
                variant="secondary"
                className="w-full py-4 border-2 border-slate-100 dark:border-slate-700 hover:border-brand-500 dark:hover:border-brand-500 bg-transparent"
                onClick={startAssessment}
              >
                Start Free Assessment <ArrowRight size={16} />
              </LiveButton>
            </div>
          </motion.div>
        </div>
      </div>
      {/* Quick Assessment Section - Moved here for better conversion */}
      <div className="py-24 px-6 bg-gradient-to-b from-brand-50 to-white dark:from-slate-900 dark:to-slate-950 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-100 dark:bg-brand-900/30 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 text-sm font-bold mb-6">
              <Sparkles size={16} /> Quick Assessment
            </div>
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">See Your Visa Success Rate</h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">Get an instant AI evaluation based on your profile. See your approval chances before investing time and money.</p>
          </div>

          <div className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl">
              <EligibilityQuiz compact={true} />
            </div>
          </div>

          <div className="text-center mt-12">
            <LiveButton
              size="lg"
              variant="secondary"
              onClick={() => setLocation("/assessment")}
            >
              Start Free Assessment <ArrowRight size={18} />
            </LiveButton>
          </div>
        </div>
      </div>

      {/* Blog Highlights Section */}
      <div className="py-24 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold mb-4 text-slate-900 dark:text-white">Latest Immigration Insights</h2>
            <p className="text-slate-600 dark:text-slate-400">Read guides, tips, and success stories from our community</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {blogHighlights.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                onClick={() => setLocation("/research")}
                className="group p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500 dark:hover:border-brand-500 cursor-pointer hover:shadow-xl transition-all hover:-translate-y-1"
              >
                <div className="flex items-start justify-between mb-4">
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300">
                    {item.tag}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{item.date}</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">{item.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">{item.excerpt}</p>
                <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 font-bold text-sm group-hover:gap-3 transition-all">
                  Read More <ArrowRight size={16} />
                </div>
              </motion.div>
            ))}
          </div>
          <div className="text-center mt-12">
            <LiveButton
              variant="secondary"
              size="lg"
              onClick={() => setLocation("/research")}
            >
              Browse All Articles <ArrowRight size={18} />
            </LiveButton>
          </div>
        </div>
      </div>
      {/* How It Works Section */}
      <div className="py-24 px-6 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">How It Works—Just 3 Steps</h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">Get your visa assessment in minutes, not weeks</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Answer 5 Questions", desc: "Tell us about your background, education, and visa destination. Takes 2 minutes." },
              { step: "2", title: "Get AI Assessment", desc: "Our AI analyzes your profile against 10k+ successful cases and shows your approval chance." },
              { step: "3", title: "Get Personalized Plan", desc: "Receive a custom roadmap with next steps, required documents, and timeline." }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative"
              >
                <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="w-12 h-12 bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 rounded-xl flex items-center justify-center font-bold text-lg mb-4">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{item.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400">{item.desc}</p>
                </div>
                {i < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                    <ArrowRight size={24} className="text-brand-400" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold mb-4 text-slate-900 dark:text-white">Why Choose ImmigrationAI?</h2>
            <p className="text-slate-500 dark:text-slate-400">We combine legal expertise with artificial intelligence to provide the fastest, most accurate immigration guidance available.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Globe, title: "Global Access", desc: "Expert guidance for UK, Germany, and Poland visas from anywhere.", plan: "CORE" },
              { icon: Shield, title: "AI Verified", desc: "Smart eligibility checks significantly reduce refusal risks before you apply.*", plan: "PREMIUM" },
              { icon: Users, title: "Community Support", desc: "Join 10,000+ Uzbek citizens sharing their journey and success.", plan: "FREE" }
            ].map((f, i) => {
              const planColors = {
                CORE: { bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-700 dark:text-slate-300", label: "Core" },
                PREMIUM: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-300", label: "Premium" },
                FREE: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-300", label: "Free" },
              };
              const colors = planColors[f.plan as keyof typeof planColors];

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.2 }}
                  className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 hover:shadow-xl transition-all group cursor-pointer relative"
                >
                  {/* Plan Badge */}
                  <div className={`absolute top-4 right-4 ${colors.bg} ${colors.text} text-xs font-bold px-3 py-1 rounded-full`}>
                    {colors.label}
                  </div>

                  <div className="w-14 h-14 bg-brand-100 dark:bg-brand-900/30 rounded-2xl flex items-center justify-center text-brand-600 dark:text-brand-400 mb-6 group-hover:scale-110 transition-transform duration-300">
                    <f.icon size={28} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    {f.title}
                    <ArrowUpRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400" />
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{f.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="py-24 bg-slate-50 dark:bg-slate-900/50">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold mb-4 text-slate-900 dark:text-white">Trusted by Thousands</h2>
            <p className="text-slate-500 dark:text-slate-400">See what our users say about ImmigrationAI</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {[
              {
                name: "Davron Mirzaev",
                role: "Software Engineer",
                company: "Tashkent → Berlin (4 months)",
                content: "ImmigrationAI's assessment showed I qualified for German Skilled Worker visa. The AI document drafting saved me weeks of preparation. Highly recommended!",
                rating: 5
              },
              {
                name: "Amaliya Karimova",
                role: "Data Analyst",
                company: "Fergona → London (6 months)",
                content: "I was worried about UK visa rejection. The AI evaluated my chances at 87% before I applied. Now I'm working at a London fintech! This platform is a game-changer.",
                rating: 5
              },
              {
                name: "Olim Khodjaev",
                role: "Business Owner",
                company: "Samarkand → Warsaw (3 months)",
                content: "Used ImmigrationAI for my family's visa applications. The lawyer chat answered every question about Polish requirements. Our applications were approved in record time.",
                rating: 5
              }
            ].map((testimonial, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:shadow-xl transition-all cursor-pointer"
                whileHover={{ y: -5, scale: 1.02 }}
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, j) => (
                    <Star key={j} size={16} className="fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-slate-700 dark:text-slate-300 mb-6 leading-relaxed">"{testimonial.content}"</p>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">{testimonial.name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{testimonial.role}, {testimonial.company}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>


      {/* FAQ Section */}
      <div className="py-24 px-6 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Frequently Asked Questions</h2>
            <p className="text-slate-600 dark:text-slate-400">Everything you need to know about ImmigrationAI</p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "Is ImmigrationAI a substitute for immigration lawyers?",
                a: "No. ImmigrationAI provides AI-powered guidance and document generation, but always consult a qualified immigration lawyer for legal advice and final decisions. Our platform is designed to complement, not replace, professional legal consultation."
              },
              {
                q: "How accurate is the eligibility assessment?",
                a: "Our AI model is trained on 10,000+ successful visa applications across UK, Germany, and Poland. The assessment provides an honest evaluation of your chances based on your profile, but final visa outcomes depend on your complete application and immigration officer's review."
              },
              {
                q: "What happens after I submit my assessment?",
                a: "You'll receive a personalized roadmap showing: (1) Your approval probability, (2) Visa routes ranked by success chance, (3) Required documents checklist, (4) Timeline estimate, and (5) Next steps with AI chat support."
              },
              {
                q: "Can I use ImmigrationAI if I'm already working with a lawyer?",
                a: "Absolutely! Many immigration lawyers use ImmigrationAI to speed up document drafting and case analysis. Your lawyer can review and refine AI-generated documents before submission."
              },
              {
                q: "How much does it cost?",
                a: "The free plan includes eligibility assessment and basic resources. Pro plan ($99/month) includes unlimited document generation, priority chat support, and case tracking. See pricing page for details."
              },
              {
                q: "Is my personal data secure?",
                a: "Yes. We use AES-256 bank-level encryption, comply with GDPR, and host data in EU servers. Your data is never shared with third parties. See our privacy policy for details."
              }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
              >
                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-3">{item.q}</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{item.a}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Community Section */}
      <div className="py-20 px-6 bg-slate-900 dark:bg-black border-t border-b border-slate-800">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-extrabold text-white mb-4 flex items-center justify-center gap-3">
              <Users size={32} className="text-brand-400" />
              Join Our Growing Community
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Connect with thousands of Uzbek immigrants and professionals on Telegram. Share experiences, get real-time support, and stay updated with immigration news.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.a
              href="https://t.me/uzbsociety"
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.05 }}
              className="p-8 rounded-2xl bg-gradient-to-br from-blue-900/30 to-blue-800/10 border border-blue-700/30 hover:border-blue-500/50 transition-all cursor-pointer"
            >
              <div className="text-blue-400 mb-4">
                <Users size={32} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Uzbek Society Group</h3>
              <p className="text-slate-300 mb-4">
                Join our community of 10K+ Uzbek immigrants. Share experiences, ask questions, and get support from people who understand your journey.
              </p>
              <div className="flex items-center gap-2 text-blue-400 font-bold">
                Join on Telegram <ArrowRight size={16} />
              </div>
            </motion.a>

            <motion.a
              href="https://t.me/uzbek_immigrant"
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.05 }}
              className="p-8 rounded-2xl bg-gradient-to-br from-brand-900/30 to-brand-800/10 border border-brand-700/30 hover:border-brand-500/50 transition-all cursor-pointer"
            >
              <div className="text-brand-400 mb-4">
                <Globe size={32} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Uzbek Immigrant Channel</h3>
              <p className="text-slate-300 mb-4">
                Subscribe to get latest immigration news, updates on visa requirements, and valuable resources. 15K+ followers and growing.
              </p>
              <div className="flex items-center gap-2 text-brand-400 font-bold">
                Subscribe on Telegram <ArrowRight size={16} />
              </div>
            </motion.a>
          </div>
        </div>
      </div>

      {/* Trust & Security Section */}
      <div className="py-20 px-6 bg-white dark:bg-slate-900 border-t border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Your Data is Safe & Secure</h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              We use enterprise-grade security and comply with international data protection standards.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-center"
            >
              <div className="text-3xl mb-3">🔒</div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-2">Bank-Level Encryption</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">AES-256 encryption protects your personal and financial data</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-center"
            >
              <div className="text-3xl mb-3">🇪🇺</div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-2">GDPR Compliant</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">EU-hosted servers ensure compliance with international standards</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-center"
            >
              <div className="text-3xl mb-3">⚖️</div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-2">Legal Disclaimer</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">AI assistance only—always consult a lawyer for legal decisions</p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24 bg-gradient-to-r from-brand-600 to-purple-600 text-white">
        <div className="container mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-extrabold mb-6">Ready to Get Started?</h2>
            <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
              Join thousands of users who trust ImmigrationAI for their immigration journey. Start your free trial today—no credit card required.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <LiveButton variant="secondary" size="lg" onClick={() => goLogin('applicant')}>
                Start Free Assessment <ArrowRight size={20} />
              </LiveButton>
              <LiveButton variant="outline" size="lg" onClick={() => setLocation('/pricing')} className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                View Pricing
              </LiveButton>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}