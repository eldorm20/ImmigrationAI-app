import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useI18n } from "@/lib/i18n";
import { Plane, ArrowRight, Check, Play, Shield, Users, Globe, Star, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { LiveButton } from "@/components/ui/live-elements";
import { ThemeToggle } from "@/components/ui/theme-toggle";
// Background handled via CSS gradients - no image asset needed

export default function Home() {
  const { t, lang, setLang } = useI18n();
  const [_, setLocation] = useLocation();
  const [age, setAge] = useState(25);
  const [score, setScore] = useState(65);

  useEffect(() => {
    let s = 40;
    if (age < 35) s += 20;
    if (age >= 18) s += 10;
    setScore(Math.max(5, Math.min(95, s)));
  }, [age]);

  const goLogin = (role: "applicant" | "lawyer") => {
    setLocation(`/auth?role=${role}`);
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
            AI-Powered Visa Assistant V2.0
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-[1.1] tracking-tight text-slate-900 dark:text-white">
            Move to Europe.<br/>
            <span className="text-gradient">
              Reduce Rejections 90%.
            </span>
          </h1>
          
          <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 max-w-lg leading-relaxed font-medium">
            AI-powered visa assessment for Uzbek professionals. Get personalized guidance for UK, Germany, and Poland visas in 2 minutes—not weeks.
          </p>
          
          {/* Key Benefits */}
          <div className="space-y-3 mb-10">
            <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
              <Check size={20} className="text-green-500 flex-shrink-0" />
              <span className="font-medium">Get instant eligibility assessment (no signup needed)</span>
            </div>
            <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
              <Check size={20} className="text-green-500 flex-shrink-0" />
              <span className="font-medium">Discover your best visa routes (UK Skilled, Germany EU Blue Card, Poland D Visa)</span>
            </div>
            <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
              <Check size={20} className="text-green-500 flex-shrink-0" />
              <span className="font-medium">Get AI help drafting documents and preparing for interviews</span>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <LiveButton size="lg" onClick={() => goLogin('applicant')} icon={Play} className="w-full sm:w-auto px-8">
              Get Free Eligibility Report
            </LiveButton>
            
            <div className="flex items-center gap-4 px-6 py-3 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 backdrop-blur-sm">
              <div className="flex -space-x-3">
                {[1,2,3,4].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-800 overflow-hidden shadow-sm">
                    <img alt={`User ${i}`} src={`https://i.pravatar.cc/100?img=${i+10}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              <div className="text-sm">
                <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1">4.9/5 <Star size={14} className="fill-yellow-400 text-yellow-400"/></p>
                <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">10K+ Uzbek users</p>
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
              <span className="font-bold text-sm">High Probability</span>
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
                  onChange={(e: any) => setAge(parseInt(e.target.value))} 
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
                  <p className="text-slate-500 text-xs font-bold uppercase mb-1 tracking-widest">Approval Chance</p>
                  <div className="flex items-end gap-2">
                    <motion.p 
                      className="text-5xl font-extrabold text-slate-900 dark:text-white tracking-tighter"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring" }}
                    >
                      {score}%
                    </motion.p>
                    <span className="text-green-500 font-bold mb-2 text-sm bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded">
                      {score >= 70 ? 'Excellent' : score >= 50 ? 'Good' : 'Fair'}
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
                       animate={{ strokeDashoffset: 175 - (175 * score) / 100 }}
                       transition={{ duration: 1.5, ease: "easeOut" }}
                       strokeLinecap="round" 
                     />
                   </svg>
                </div>
              </motion.div>
              
              <LiveButton 
                variant="secondary" 
                className="w-full py-4 border-2 border-slate-100 dark:border-slate-700 hover:border-brand-500 dark:hover:border-brand-500 bg-transparent" 
                onClick={() => goLogin('applicant')}
              >
                Get Full Assessment <ArrowRight size={16} />
              </LiveButton>
            </div>
          </motion.div>
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
              { icon: Globe, title: "Global Access", desc: "Expert guidance for UK, Germany, and Poland visas from anywhere." },
              { icon: Shield, title: "AI Verified", desc: "Smart eligibility checks reduce refusal risks by 90% before you apply." },
              { icon: Users, title: "Community", desc: "Join 10,000+ Uzbek citizens sharing their journey and success." }
            ].map((f, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 hover:shadow-xl transition-all group cursor-pointer"
              >
                <div className="w-14 h-14 bg-brand-100 dark:bg-brand-900/30 rounded-2xl flex items-center justify-center text-brand-600 dark:text-brand-400 mb-6 group-hover:scale-110 transition-transform duration-300">
                  <f.icon size={28} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  {f.title}
                  <ArrowUpRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400" />
                </h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="py-24 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold mb-4 text-slate-900 dark:text-white">How It Works</h2>
            <p className="text-slate-500 dark:text-slate-400">Get your visa assessment in just 3 simple steps</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                step: "1",
                title: "Answer Quick Questions",
                desc: "Tell us about your education, work experience, language skills, and target country. Takes just 2 minutes."
              },
              {
                step: "2",
                title: "Get Instant Assessment",
                desc: "Our AI analyzes your profile against real visa requirements. See your approval probability and top visa routes."
              },
              {
                step: "3",
                title: "Get Help & Documents",
                desc: "Use our AI tools to draft documents, prepare for interviews, and chat with our AI assistant anytime."
              }
            ].map((item, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="relative"
              >
                <div className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 h-full">
                  <div className="w-12 h-12 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400 font-extrabold mb-4 text-lg">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{item.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
                {i < 2 && (
                  <div className="hidden md:block absolute top-16 -right-4 text-slate-300 dark:text-slate-600">
                    <ArrowRight size={24} strokeWidth={1.5} />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="py-24 bg-slate-50 dark:bg-slate-900/50">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold mb-4 text-slate-900 dark:text-white">Frequently Asked Questions</h2>
            <p className="text-slate-500 dark:text-slate-400">Everything you need to know about ImmigrationAI</p>
          </div>
          <div className="max-w-3xl mx-auto space-y-4">
            {[
              {
                q: "Is the assessment really accurate?",
                a: "Our AI is trained on real visa requirements from UK Visas and Immigration, German Federal Foreign Office, and Polish Ministry sources. However, visa decisions also depend on factors we can't predict. We recommend consulting a lawyer before applying."
              },
              {
                q: "What's included in the free assessment?",
                a: "The free 2-minute assessment gives you an eligibility percentage, top 3 visa routes, and next steps. For the detailed 20-page report with document checklist, you'll need a Pro subscription."
              },
              {
                q: "How much does the Pro plan cost?",
                a: "Pro is $99/month (or $990/year with 25% discount). It includes unlimited assessments, document drafting, AI chat, and lawyer consultations."
              },
              {
                q: "Can I use ImmigrationAI to actually apply for my visa?",
                a: "No. ImmigrationAI provides guidance and helps you prepare documents, but you'll submit your official application directly to the immigration authority. We're not a law firm—always verify information with official sources."
              },
              {
                q: "Is my personal data safe?",
                a: "Yes. We use AES-256 encryption, store data in EU data centers (GDPR compliant), and never share your information with third parties. See our Privacy Policy for details."
              },
              {
                q: "Do you offer refunds?",
                a: "Yes. We offer a 14-day money-back guarantee on all Pro subscriptions. If you're not satisfied, contact support@immigrationai.com."
              }
            ].map((faq, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-700 transition-colors"
              >
                <details className="group cursor-pointer">
                  <summary className="flex justify-between items-center font-bold text-slate-900 dark:text-white">
                    <span>{faq.q}</span>
                    <span className="text-brand-600 dark:text-brand-400 group-open:rotate-180 transition-transform">
                      <ArrowUpRight size={20} />
                    </span>
                  </summary>
                  <p className="mt-4 text-slate-600 dark:text-slate-400 leading-relaxed">{faq.a}</p>
                </details>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
      <div className="py-24 bg-slate-50 dark:bg-slate-900/50">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold mb-4 text-slate-900 dark:text-white">Trusted by Thousands</h2>
            <p className="text-slate-500 dark:text-slate-400">See what our users say about ImmigrationAI</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {[
              {
                name: "Davron Karimov",
                role: "Software Engineer",
                location: "Tashkent → Berlin",
                visa: "Germany EU Blue Card",
                content: "ImmigrationAI showed me exactly what documents I needed for the Blue Card. The AI assessment predicted 85% approval chance—I got approved in 6 weeks! Saved me months of guessing.",
                rating: 5
              },
              {
                name: "Amaliya Sultanova",
                role: "Project Manager",
                location: "Tashkent → London",
                visa: "UK Skilled Worker",
                content: "The eligibility checker helped me find employers sponsoring the Skilled Worker visa. The document drafter saved hours on my visa application. Highly recommended for Uzbek professionals!",
                rating: 5
              },
              {
                name: "Olim Rahimov",
                role: "Data Analyst",
                location: "Samarkand → Warsaw",
                visa: "Poland D Visa",
                content: "As a student, I was confused about visa options. ImmigrationAI broke down each visa route clearly. The AI chat answered all my questions about Poland's requirements in detail.",
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
                  <p className="text-sm text-slate-500 dark:text-slate-400">{testimonial.location} • {testimonial.visa}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Blog Highlights */}
      <div className="py-24 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Immigration insights</h2>
              <p className="text-slate-600 dark:text-slate-400 mt-2">Fresh guidance, policy updates, and success stories.</p>
            </div>
            <LiveButton variant="secondary" onClick={() => setLocation("/blog")}>
              View all articles <ArrowRight size={16} />
            </LiveButton>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {blogHighlights.map((post, idx) => (
              <div key={idx} className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-brand-400/60 dark:hover:border-brand-500/60 transition-colors">
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-brand-600 dark:text-brand-400 mb-3">
                  <span className="px-2 py-1 rounded-full bg-brand-50 dark:bg-brand-900/30">{post.tag}</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-500 dark:text-slate-400">{post.date}</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{post.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">{post.excerpt}</p>
                <LiveButton variant="ghost" className="px-0" onClick={() => setLocation("/blog")}>
                  Read more <ArrowRight size={14} />
                </LiveButton>
              </div>
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

      {/* CTA Section */}
      <div className="py-24 bg-gradient-to-r from-brand-600 to-purple-600 text-white">
        <div className="container mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-extrabold mb-6">Ready to Move Forward?</h2>
            <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
              Get a free visa eligibility assessment in 2 minutes. No credit card required.
            </p>
            <LiveButton variant="secondary" size="lg" onClick={() => goLogin('applicant')}>
              Start Your Free Assessment <ArrowRight size={20} />
            </LiveButton>
          </motion.div>
        </div>
      </div>

      {/* Trust & Security Section */}
      <div className="py-16 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-6xl mx-auto">
            <div className="text-center">
              <div className="mb-3 flex justify-center">
                <Shield size={28} className="text-brand-600 dark:text-brand-400" />
              </div>
              <p className="font-bold text-slate-900 dark:text-white mb-1">Bank-Level Security</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">AES-256 encryption for all data</p>
            </div>
            <div className="text-center">
              <div className="mb-3 flex justify-center">
                <Globe size={28} className="text-brand-600 dark:text-brand-400" />
              </div>
              <p className="font-bold text-slate-900 dark:text-white mb-1">GDPR Compliant</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">EU data centers, full compliance</p>
            </div>
            <div className="text-center">
              <div className="mb-3 flex justify-center">
                <Users size={28} className="text-brand-600 dark:text-brand-400" />
              </div>
              <p className="font-bold text-slate-900 dark:text-white mb-1">Not Legal Advice</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">AI guidance only—consult lawyers</p>
            </div>
            <div className="text-center">
              <div className="mb-3 flex justify-center">
                <Check size={28} className="text-brand-600 dark:text-brand-400" />
              </div>
              <p className="font-bold text-slate-900 dark:text-white mb-1">Trusted by 10K+</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">Uzbek professionals in Europe</p>
            </div>
          </div>
          
          {/* Legal Disclaimers */}
          <div className="mt-12 pt-12 border-t border-slate-200 dark:border-slate-700 max-w-4xl mx-auto text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              <strong>Important:</strong> ImmigrationAI provides AI-powered guidance and tools to help with your immigration journey. We are not a law firm and do not provide legal advice. Always consult with qualified immigration lawyers before making official applications. Your personal data is encrypted and stored securely in EU data centers.
            </p>
            <div className="flex justify-center gap-6 text-sm">
              <a href="/privacy" className="text-brand-600 dark:text-brand-400 hover:underline">Privacy Policy</a>
              <span className="text-slate-400">•</span>
              <a href="/terms" className="text-brand-600 dark:text-brand-400 hover:underline">Terms of Service</a>
              <span className="text-slate-400">•</span>
              <a href="/help" className="text-brand-600 dark:text-brand-400 hover:underline">Help & Support</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}