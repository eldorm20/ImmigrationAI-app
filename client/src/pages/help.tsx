import React, { useState } from "react";
import { Link } from "wouter";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Mail, Users, HelpCircle, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

interface AnimatedCardProps {
  children?: React.ReactNode;
  delay?: number;
}

const AnimatedCard: React.FC<AnimatedCardProps> = ({ children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800"
  >
    {children}
  </motion.div>
);

export default function HelpCenter() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !message) {
      toast({ 
        title: "Please fill all fields",
        description: "Email and message are required",
        variant: "destructive"
      });
      return;
    }

    setSending(true);
    // Simulate email sending
    await new Promise(resolve => setTimeout(resolve, 1500));
    setSending(false);
    
    toast({
      title: "Message Sent",
      description: "We've received your message. We'll get back to you within 24 hours.",
      className: "bg-green-50 text-green-900 border-green-200"
    });
    setEmail("");
    setMessage("");
  };

  const communityLinks = [
    {
      title: "Uzbek Society Telegram Group",
      description: "Join our community of Uzbek immigrants and professionals sharing experiences and advice.",
      icon: Users,
      link: "https://t.me/uzbsociety",
      members: "10K+",
      color: "from-blue-500 to-blue-600"
    },
    {
      title: "Uzbek Immigrant Channel",
      description: "Official channel for immigration updates, news, and valuable resources.",
      icon: MessageCircle,
      description_alt: "Subscribe to get latest immigration news and platform updates.",
      link: "https://t.me/uzbek_immigrant",
      members: "15K+",
      color: "from-brand-500 to-brand-600"
    }
  ];

  const faqItems = [
    {
      q: "How do I upload documents?",
      a: "Navigate to the Documents section in your dashboard. You can drag and drop files or click to browse. Supported formats: PDF, DOC, DOCX, JPG, PNG (Max 10MB each)."
    },
    {
      q: "How long does document analysis take?",
      a: "Most documents are analyzed instantly. For complex documents, analysis may take 2-5 minutes. You'll receive a notification when analysis is complete."
    },
    {
      q: "Can I connect with a lawyer?",
      a: "Yes! Go to 'Ask Lawyer' in your dashboard to submit a consultation request. Our network of partner lawyers will review and contact you within 24-48 hours."
    },
    {
      q: "Is my data secure?",
      a: "Yes, we use industry-standard encryption, secure authentication, and compliance with GDPR. All documents are stored securely in AWS S3."
    },
    {
      q: "How do I contact support?",
      a: "You can reach us via email at support@immigrationai.com or join our Telegram communities for faster community-based support."
    },
    {
      q: "What languages are supported?",
      a: "We support 6 languages: English, Uzbek, Russian, German, French, and Spanish. Switch languages anytime from your dashboard."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white mb-4">
            Help & Support Center
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400">
            Get answers, connect with our community, or reach out to our support team.
          </p>
        </motion.div>

        {/* Community Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
            <Users className="text-brand-600" />
            Join Our Community
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-8">
            Connect with thousands of Uzbek immigrants and professionals. Get real-time support, share experiences, and stay updated with the latest immigration news.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {communityLinks.map((community, idx) => (
              <AnimatedCard key={idx} delay={idx * 0.1}>
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg bg-gradient-to-br ${community.color}`}>
                    <community.icon size={24} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">
                      {community.title}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                      {community.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-brand-600 dark:text-brand-400">
                        {community.members} members
                      </span>
                      <a
                        href={community.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-lg transition-colors"
                      >
                        Join
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  </div>
                </div>
              </AnimatedCard>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
            <HelpCircle className="text-brand-600" />
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-4">
            {faqItems.map((item, idx) => (
              <AnimatedCard key={idx} delay={0.1 + idx * 0.05}>
                <details className="group">
                  <summary className="cursor-pointer font-bold text-slate-900 dark:text-white flex items-center gap-2 hover:text-brand-600 transition-colors">
                    <span className="group-open:hidden">→</span>
                    <span className="hidden group-open:inline">↓</span>
                    {item.q}
                  </summary>
                  <p className="mt-4 text-slate-600 dark:text-slate-400 leading-relaxed">
                    {item.a}
                  </p>
                </details>
              </AnimatedCard>
            ))}
          </div>
        </div>

        {/* Contact Form */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
            <Mail className="text-brand-600" />
            Contact Us
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <AnimatedCard>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Message
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe your issue or question..."
                    rows={5}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full px-4 py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-400 text-white font-bold rounded-lg transition-colors"
                >
                  {sending ? "Sending..." : "Send Message"}
                </button>
              </form>
            </AnimatedCard>

            <AnimatedCard>
              <div className="space-y-6">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white mb-2">Response Time</h4>
                  <p className="text-slate-600 dark:text-slate-400">
                    We typically respond to support inquiries within 24 hours on business days.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white mb-2">Quick Support</h4>
                  <p className="text-slate-600 dark:text-slate-400 mb-4">
                    For faster support, join our Telegram communities where community members and moderators can help.
                  </p>
                  <div className="flex gap-3">
                    <a
                      href="https://t.me/uzbsociety"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg transition-colors flex items-center gap-2"
                    >
                      <MessageCircle size={16} />
                      Uzbek Society
                    </a>
                    <a
                      href="https://t.me/uzbek_immigrant"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-lg transition-colors flex items-center gap-2"
                    >
                      <MessageCircle size={16} />
                      Immigrant Channel
                    </a>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white mb-2">Email</h4>
                  <a 
                    href="mailto:support@immigrationai.com"
                    className="text-brand-600 dark:text-brand-400 hover:underline"
                  >
                    support@immigrationai.com
                  </a>
                </div>
              </div>
            </AnimatedCard>
          </div>
        </div>

        {/* Resources Section */}
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">Resources</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <AnimatedCard delay={0}>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">Documentation</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Learn how to use all features of ImmigrationAI with our comprehensive guides.
              </p>
              <Link href="/docs" className="text-brand-600 dark:text-brand-400 font-bold hover:underline">
                View Docs →
              </Link>
            </AnimatedCard>

            <AnimatedCard delay={0.1}>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">Blog</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Read immigration tips, success stories, and latest updates on visa requirements.
              </p>
              <Link href="/blog" className="text-brand-600 dark:text-brand-400 font-bold hover:underline">
                Read Articles →
              </Link>
            </AnimatedCard>

            <AnimatedCard delay={0.2}>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">Research Library</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Access curated immigration law resources, case studies, and regulations.
              </p>
              <Link href="/research" className="text-brand-600 dark:text-brand-400 font-bold hover:underline">
                Explore Library →
              </Link>
            </AnimatedCard>
          </div>
        </div>
      </div>
    </div>
  );
}
