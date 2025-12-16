import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { error as logError } from "@/lib/logger";
import {
  LayoutDashboard, FileText, MessageSquare, LogOut, Book, Settings, CreditCard, Bell, BadgeCheck,
  Globe, Send, Briefcase, Upload, Loader2, Zap, CheckCircle, Circle, ArrowRight, Sparkles, FileCheck, Scan,
  Edit3, RefreshCw, Download, User, FileUp, Eye, Trash2, Languages
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import { trackEvent } from "@/lib/analytics";
import { motion, AnimatePresence } from "framer-motion";
import { LiveButton, AnimatedCard } from "@/components/ui/live-elements";
import { ThemeToggle } from "@/components/ui/theme-toggle";

import ConsultationPanel from "@/components/consultation-panel";
import MessagingPanel from "@/components/messaging-panel";
import { AIDocsView } from "@/components/dashboard/ai-docs-view";
import { ChatView } from "@/components/dashboard/chat-view";
import { TranslateView } from "@/components/dashboard/translate-view";
import { UploadView } from "@/components/dashboard/upload-view";
import { VisaPredictorView } from "@/components/dashboard/visa-predictor-view";
import { DeadlineTrackerView } from "@/components/dashboard/deadline-tracker-view";
import { OCRUploadView } from "@/components/dashboard/ocr-upload-view";
import ReferralView from "@/components/dashboard/referral-view";
import { Target, CalendarClock, Gift } from "lucide-react";



// --- Main Dashboard Component ---

export default function UserDash() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [activeTab, setActiveTab] = useState('roadmap');

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const tabs = ['roadmap', 'docs', 'upload', 'translate', 'chat', 'messages', 'lawyer', 'research'];
        const currentIndex = tabs.indexOf(activeTab);
        const nextTabId = tabs[(currentIndex + 1) % tabs.length];
        setActiveTab(nextTabId);
        toast({ title: t.dash?.tabSwitched || "Tab Switched", description: t.dash?.[nextTabId] || `Switched to ${nextTabId}`, className: "bg-blue-50 text-blue-900 border-blue-200" });
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [activeTab, toast]);

  if (!user) return null;

  return (
    <div className="flex flex-col md:flex-row overflow-hidden transition-colors duration-300 h-[calc(100vh)]">

      {/* Sidebar */}
      <motion.aside
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-full md:w-72 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800 flex flex-col h-screen sticky top-0 z-20 shadow-sm"
      >
        <div className="p-8 flex justify-between items-center">
          <motion.div
            className="flex items-center gap-3 font-extrabold text-2xl tracking-tight cursor-pointer"
            whileHover={{ scale: 1.05 }}
            onClick={() => window.location.href = "/"}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-500/30">
              <Globe size={20} />
            </div>
            <span className="text-slate-900 dark:text-white hidden md:inline">{t.brand.name}</span>
          </motion.div>
          <div className="md:hidden">
            <ThemeToggle />
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {[
            { id: 'roadmap', icon: LayoutDashboard, label: t.dash.roadmap },
            { id: 'predictor', icon: Target, label: 'Visa Predictor' },
            { id: 'deadlines', icon: CalendarClock, label: 'Deadlines' },
            { id: 'docs', icon: FileText, label: t.dash.docs }, // AIDocsView
            { id: 'employer', icon: BadgeCheck, label: 'Employer Verification' },
            { id: 'upload', icon: Upload, label: t.dash.upload },
            { id: 'scan', icon: Scan, label: 'Scan Doc' },
            { id: 'referrals', icon: Gift, label: 'Refer & Earn' },
            // Applications removed
            { id: 'translate', icon: Globe, label: t.dash.translate },
            { id: 'chat', icon: MessageSquare, label: t.dash.chat },
            { id: 'messages', icon: Send, label: t.dash.messages },
            { id: 'lawyer', icon: Briefcase, label: t.dash.lawyer },
            { id: 'research', icon: Book, label: t.dash.research }
          ].map(item => (
            <motion.button
              key={item.id}
              onClick={() => { if (item.id === 'applications') setLocation('/applications'); else setActiveTab(item.id); }}
              whileHover={{ x: 5 }}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-bold transition-all relative overflow-hidden ${activeTab === item.id ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
            >
              {activeTab === item.id && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute left-0 w-1 h-8 bg-brand-600 rounded-r-full"
                />
              )}
              <span className="relative z-10 flex items-center gap-3">
                <item.icon size={20} className={activeTab === item.id ? "text-brand-600 dark:text-brand-400" : ""} />
                {item.label}
              </span>
            </motion.button>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <div className="flex items-center gap-4 mb-6 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-brand-500 to-purple-500 p-[2px]">
              <div className="w-full h-full bg-white dark:bg-slate-900 rounded-full flex items-center justify-center font-bold text-xs text-slate-900 dark:text-white">
                {user.name[0]}
              </div>
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-bold truncate text-slate-900 dark:text-white">{user.name}</p>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
          <LiveButton
            variant="shine"
            className="w-full justify-start text-white hover:text-white"
            onClick={() => setLocation("/subscription")}
            icon={CreditCard}
          >
            {t.subscription?.manage || "Upgrade Subscription"}
          </LiveButton>
          <LiveButton
            variant="ghost"
            className="w-full justify-start text-purple-600 hover:bg-purple-50 hover:text-purple-700 dark:hover:bg-purple-900/20"
            onClick={() => setLocation("/notifications")}
            icon={Bell}
          >
            {t.settings?.notificationPreferences || "Notifications"}
          </LiveButton>
          <LiveButton
            variant="ghost"
            className="w-full justify-start text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={() => setLocation("/settings")}
            icon={Settings}
          >
            {t.settings?.title || "Settings"}
          </LiveButton>
          <LiveButton
            variant="ghost"
            className="w-full justify-start text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
            onClick={logout}
            icon={LogOut}
          >
            {t.dash.logout}
          </LiveButton>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto relative">
        {/* Background Elements */}
        <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-brand-50/50 to-transparent dark:from-brand-900/10 pointer-events-none" />

        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 relative z-10 gap-4">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl font-extrabold tracking-tight mb-2 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
              {t.dash.welcome} {user.name}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              {t.dashStatus?.label || 'Immigration Status:'} <span className="text-brand-600 dark:text-brand-400 font-bold">{t.dashStatus?.active || 'Active'}</span>
            </p>
          </motion.div>
          <div className="flex items-center gap-4">
            <div className="hidden md:block"><ThemeToggle /></div>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'roadmap' && <RoadmapView key="roadmap" setActiveTab={setActiveTab} toast={toast} />}
          {activeTab === 'predictor' && <VisaPredictorView key="predictor" />}
          {activeTab === 'deadlines' && <DeadlineTrackerView key="deadlines" />}
          {activeTab === 'docs' && <AIDocsView key="docs" />}
          {activeTab === 'employer' && <EmployerVerificationView key="employer" />}
          {activeTab === 'upload' && <UploadView key="upload" />}
          {activeTab === 'scan' && (
            <AnimatedCard>
              <OCRUploadView />
            </AnimatedCard>
          )}
          {activeTab === 'referrals' && (
            <AnimatedCard>
              <ReferralView />
            </AnimatedCard>
          )}
          {activeTab === 'translate' && <TranslateView key="translate" />}
          {activeTab === 'chat' && <ChatView key="chat" />}
          {activeTab === 'messages' && <MessagingPanel key="messages" />}
          {activeTab === 'lawyer' && <ConsultationPanel key="lawyer" />}
          {activeTab === 'research' && (
            <motion.div key="research" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-20">
              <AnimatedCard className="max-w-md mx-auto">
                <Book className="w-16 h-16 mx-auto mb-4 text-brand-500" />
                <h3 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">{t.research.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                  {t.research.subtitle}
                </p>
                <LiveButton onClick={() => {
                  setLocation('/research');
                }} icon={Book}>
                  {t.research.title}
                </LiveButton>
              </AnimatedCard>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}


// --- Sub-Views ---

type ToastHandler = typeof import('@/hooks/use-toast').toast;

interface ApplicationSummary {
  id: string;
  status?: string;
  visaType?: string;
  country?: string;
}

interface RoadmapItem {
  id?: string;
  title: string;
  status?: string;
  description?: string;
  desc?: string;
}

const RoadmapView = ({ setActiveTab, toast }: { setActiveTab: (tab: string) => void; toast: ToastHandler }) => {
  const { user } = useAuth();
  const { t } = useI18n();
  const [application, setApplication] = useState<ApplicationSummary | null>(null);
  const [roadmapItems, setRoadmapItems] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const loadRoadmapData = async () => {
      try {
        setLoading(true);
        // Fetch user's applications (supports paginated response or array)
        const appsResp: any = await apiRequest('/applications');
        const appArray = Array.isArray(appsResp) ? appsResp : appsResp.applications || [];
        if (appArray && appArray.length > 0) {
          const activeApp = appArray[0]; // Get first application
          setApplication(activeApp);

          // Fetch roadmap items for this application
          const items = await apiRequest<RoadmapItem[]>(`/roadmap/application/${activeApp.id}`);
          setRoadmapItems(items || []);

          // Calculate progress
          const completed = (items || []).filter((i) => i.status === 'completed').length;
          const total = (items || []).length || 1;
          setProgress(Math.round((completed / total) * 100));
        }
      } catch (error) {
        logError('Failed to load roadmap:', error);
        toast({
          title: "Error loading roadmap",
          description: "Could not load application progress.",
          variant: "destructive"
        });
        setProgress(35); // Fallback for demo
      } finally {
        setLoading(false);
      }
    };

    loadRoadmapData();
  }, []);

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
        <AnimatedCard>
          <div className="flex items-center justify-center p-12">
            <Loader2 className="animate-spin" />
          </div>
        </AnimatedCard>
      </motion.div>
    );
  }

  const items = roadmapItems.length > 0 ? roadmapItems : [
    { title: t.roadmap?.eligibility || 'Eligibility Assessment', status: 'done', description: t.roadmap?.defaults?.eligibilityDesc || 'Passed with 85 points' },
    { title: t.roadmap?.collection || 'Document Collection', status: 'current', description: t.roadmap?.defaults?.collectionDesc || 'Passport, Degree, TB Test' },
    { title: t.roadmap?.translation || 'Official Translation', status: 'pending', description: t.roadmap?.defaults?.translationDesc || 'Notarized translations required' },
    { title: t.roadmap?.submission || 'Visa Application Submission', status: 'pending', description: t.roadmap?.defaults?.submissionDesc || 'Home Office portal' }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="space-y-8"
    >
      <AnimatedCard className="border-l-4 border-brand-500 bg-gradient-to-r from-white to-brand-50/30 dark:from-slate-900 dark:to-brand-900/10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h3 className="font-bold text-xl flex items-center gap-2 text-slate-900 dark:text-white">
              {application?.visaType || 'Skilled Worker Visa'} ({application?.country || 'UK'})
              <span className="bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">{application?.status || 'In Progress'}</span>
            </h3>
            <p className="text-slate-500 mt-1">{t.roadmap?.applicationReference || 'Application Reference:'} #{application?.id?.slice(0, 8).toUpperCase() || 'UK-SW-2025-8842'}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-extrabold text-brand-600 dark:text-brand-400">{progress}%</div>
            <div className="text-xs font-bold text-slate-400 uppercase">{t.roadmap?.completionLabel || 'Completion'}</div>
          </div>
        </div>

        <div className="w-full bg-slate-200/50 dark:bg-slate-700/50 rounded-full h-3 mb-6 overflow-hidden">
          <motion.div
            initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1.5, ease: "easeOut" }}
            className="bg-gradient-to-r from-brand-500 to-purple-500 h-full rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)] relative"
          >
            <div className="absolute inset-0 bg-white/30 animate-[shimmer_2s_infinite] skew-x-12"></div>
          </motion.div>
        </div>

        <p className="text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2">
          <Zap size={16} className="text-yellow-500 fill-yellow-500" />
          {t.roadmap?.nextStepLabel || 'Next Step:'} <span className="font-bold">{items.find(i => i.status === 'current')?.title || (t.roadmap?.defaults?.submissionDesc || 'Complete Application')}</span>
        </p>
      </AnimatedCard>

      <div className="grid gap-4">
        {items.map((step: RoadmapItem, i: number) => (
          <AnimatedCard
            key={i}
            delay={i * 0.1}
            className={`p-0 overflow-hidden transition-all cursor-pointer ${step.status === 'current' ? 'ring-2 ring-brand-500 ring-offset-2 dark:ring-offset-slate-950' : 'opacity-80 hover:opacity-100'} ${step.status !== 'pending' ? 'hover:shadow-lg' : ''}`}
            onClick={() => step.status !== 'pending' && (
              step.title.includes('Document') ? setActiveTab('upload') :
                step.title.includes('Translation') ? setActiveTab('translate') : null
            )}
          >
            <div className={`p-5 flex items-center gap-5 ${step.status === 'current' ? 'bg-white dark:bg-slate-800' : 'bg-slate-50/50 dark:bg-slate-900/50'}`}>
              {step.status === 'done' || step.status === 'completed' ? (
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 flex items-center justify-center shadow-sm">
                  <CheckCircle size={20} />
                </div>
              ) : step.status === 'current' ? (
                <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 flex items-center justify-center shadow-sm relative">
                  <div className="absolute inset-0 bg-brand-500 rounded-full opacity-20 animate-ping"></div>
                  <Loader2 size={20} className="animate-spin" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
                  <Circle size={20} />
                </div>
              )}

              <div className="flex-1">
                <h4 className={`font-bold text-lg ${step.status === 'pending' ? 'text-slate-500' : 'text-slate-900 dark:text-white'}`}>{step.title}</h4>
                <p className="text-sm text-slate-500">{step.description || step.desc}</p>
              </div>

              {step.status === 'current' && (
                <LiveButton size="sm" className="h-10 px-6 text-sm" onClick={() => {
                  toast({
                    title: t.tools?.nextStep || "Next Step",
                    description: `${t.roadmap?.starting || 'Starting'} ${step.title}...`,
                    className: "bg-blue-50 text-blue-900 border-blue-200"
                  });
                }}>
                  {t.tools?.next || 'Next'} <ArrowRight size={16} />
                </LiveButton>
              )}
            </div>
          </AnimatedCard>
        ))}
      </div>
    </motion.div>
  );
};

import { EmployerVerificationPanel } from "@/components/employer-verification-panel";

const EmployerVerificationView = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full"
    >
      <EmployerVerificationPanel />
    </motion.div>
  );
};

// Sub-views have been extracted to components/dashboard/

