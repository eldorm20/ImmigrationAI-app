import React, { useState } from "react";
import { useLocation } from "wouter";
import { Check, ArrowRight, Building2, Users, Zap, Star, Plane, Menu, X } from "lucide-react";
import { motion } from "framer-motion";
import { LiveButton } from "@/components/ui/live-elements";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function Partner() {
  const [_, setLocation] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const partnerTypes = [
    {
      icon: Building2,
      title: "Immigration Law Firms",
      description: "Expand your service offerings with AI-powered tools",
      benefits: [
        "White-label platform for your clients",
        "30% revenue share on all referrals",
        "Custom branding and domain setup",
        "API integration for seamless workflow",
        "Dedicated account manager"
      ],
      commission: "30% per subscription"
    },
    {
      icon: Users,
      title: "Immigration Agencies",
      description: "Automate assessments and increase client satisfaction",
      benefits: [
        "Bulk user accounts with discounts",
        "Client management dashboard",
        "20% commission on referred subscriptions",
        "Marketing materials and case studies",
        "Training and onboarding support"
      ],
      commission: "20% per subscription"
    },
    {
      icon: Zap,
      title: "HR & Staffing Firms",
      description: "Simplify employee visa sponsorship processes",
      benefits: [
        "Enterprise licensing for teams",
        "15% discount on bulk subscriptions",
        "Custom contract templates",
        "25% referral commission",
        "Priority technical support"
      ],
      commission: "25% per referral"
    }
  ];

  const benefits = [
    {
      title: "Recurring Revenue",
      desc: "Earn commissions on every subscription renewal—passive income that grows with your client base."
    },
    {
      title: "White-Label Option",
      desc: "Rebrand ImmigrationAI as your own service, maintaining direct client relationships."
    },
    {
      title: "API Access",
      desc: "Integrate ImmigrationAI directly into your existing platforms and workflows."
    },
    {
      title: "Marketing Support",
      desc: "Co-marketing materials, case studies, and webinar opportunities."
    },
    {
      title: "Training & Support",
      desc: "Onboarding sessions, documentation, and dedicated technical support team."
    },
    {
      title: "Early Access",
      desc: "Get early access to new features and provide input on product development."
    }
  ];

  const testimonials = [
    {
      name: "Farrukh Rakhimov",
      company: "Tashkent Immigration Law Firm",
      role: "Partner",
      content: "We integrated ImmigrationAI with our practice. Our clients love the AI assessments, and we've increased revenue by 40%. The white-label option was perfect for our brand.",
      avatar: "https://i.pravatar.cc/100?img=20"
    },
    {
      name: "Gulnora Khojayeva",
      company: "Global Visa Services",
      role: "CEO",
      content: "The API integration saved us months of development. Our processing time dropped 60%, and clients are happier. Highly recommend for agencies.",
      avatar: "https://i.pravatar.cc/100?img=21"
    },
    {
      name: "Rustam Usmanov",
      company: "European Recruitment Partners",
      role: "Director",
      content: "Perfect for HR teams. The bulk licensing and referral commissions provide great ROI. Their support team is excellent.",
      avatar: "https://i.pravatar.cc/100?img=22"
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
            <button className="hidden md:block p-2 text-slate-900 dark:text-white">
              <Plane size={20} />
            </button>
            <div className="flex gap-2">
              <LiveButton variant="ghost" onClick={() => setLocation('/pricing')}>Pricing</LiveButton>
              <LiveButton onClick={() => setLocation('/auth')}>Sign In</LiveButton>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="pt-32 pb-20 px-6 bg-gradient-to-b from-slate-100 to-slate-50 dark:from-slate-900 dark:to-slate-950">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-50 dark:bg-brand-900/30 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 text-sm font-bold mb-8"
          >
            <Star size={16} />
            Partner Program
          </motion.div>

          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 text-slate-900 dark:text-white">
            Build Your Immigration Business
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 max-w-3xl mx-auto leading-relaxed">
            Join our partner program and offer ImmigrationAI to your clients. Earn recurring commissions, white-label your service, and grow your revenue.
          </p>

          <div className="flex gap-4 justify-center flex-wrap">
            <LiveButton size="lg" onClick={() => {
              document.getElementById('apply')?.scrollIntoView({ behavior: 'smooth' });
            }}>
              Apply Now <ArrowRight size={20} />
            </LiveButton>
            <LiveButton variant="outline" size="lg" onClick={() => setLocation('/pricing')}>
              View Pricing
            </LiveButton>
          </div>
        </div>
      </div>

      {/* Partner Types */}
      <div className="py-24 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">Perfect for Your Business Type</h2>
            <p className="text-xl text-slate-600 dark:text-slate-400">Choose the partnership model that fits your needs</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {partnerTypes.map((type, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-700 transition-all"
              >
                <div className="w-14 h-14 rounded-2xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400 mb-6">
                  <type.icon size={28} />
                </div>

                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">{type.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6">{type.description}</p>

                <div className="bg-brand-50 dark:bg-brand-900/20 px-4 py-3 rounded-xl mb-6 border border-brand-200 dark:border-brand-800">
                  <p className="font-bold text-brand-700 dark:text-brand-300">{type.commission}</p>
                </div>

                <ul className="space-y-3">
                  {type.benefits.map((benefit, j) => (
                    <li key={j} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700 dark:text-slate-300 text-sm">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="py-24 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">Partner Benefits</h2>
            <p className="text-xl text-slate-600 dark:text-slate-400">Everything you need to succeed</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {benefits.map((benefit, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
              >
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{benefit.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{benefit.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Testimonials */}
      <div className="py-24 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">What Partners Say</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-8 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} size={16} className="fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-slate-700 dark:text-slate-300 mb-6 leading-relaxed italic">"{testimonial.content}"</p>
                <div className="flex items-center gap-3">
                  <img src={testimonial.avatar} alt={testimonial.name} className="w-12 h-12 rounded-full" />
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{testimonial.name}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{testimonial.role}, {testimonial.company}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Application Form */}
      <div id="apply" className="py-24 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">Ready to Partner?</h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">Fill out the form below and we'll be in touch within 24 hours</p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800"
          >
            <form onSubmit={(e) => {
              e.preventDefault();
              // Handle form submission
              window.location.href = 'mailto:partners@immigrationai.com?subject=Partner Program Application';
            }} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">Full Name</label>
                  <input type="text" required className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">Company Name</label>
                  <input type="text" required className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500" />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">Email</label>
                  <input type="email" required className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">Phone</label>
                  <input type="tel" required className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">Partner Type</label>
                <select required className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500">
                  <option value="">Select your business type</option>
                  <option value="law_firm">Immigration Law Firm</option>
                  <option value="agency">Immigration Agency</option>
                  <option value="hr_staffing">HR & Staffing Firm</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">Tell us about your business</label>
                <textarea required rows={4} className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"></textarea>
              </div>

              <LiveButton type="submit" size="lg" className="w-full">
                Submit Application <ArrowRight size={20} />
              </LiveButton>
            </form>
          </motion.div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="py-16 bg-gradient-to-r from-brand-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Questions?</h2>
          <p className="text-lg mb-8 opacity-90">
            Email us at <a href="mailto:partners@immigrationai.com" className="font-bold hover:underline">partners@immigrationai.com</a> or call +998 71 200-00-00
          </p>
        </div>
      </div>
    </div>
  );
}
