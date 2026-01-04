import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { error as logError } from "@/lib/logger";
import {
  LayoutDashboard, FileText, MessageSquare, LogOut, Book, Settings, CreditCard, Bell, BadgeCheck,
  Loader2,
  Globe, Send, Briefcase, Upload, FolderOpen, FlaskConical, Users,
  Target, CalendarClock, Gift, Sparkles, CheckCircle, Circle, ArrowRight, Zap,
  Shield, BrainCircuit, Menu, X, Building
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import { trackEvent } from "@/lib/analytics";
import { motion, AnimatePresence } from "framer-motion";
import { LiveButton, AnimatedCard } from "@/components/ui/live-elements";
import { ThemeToggle } from "@/components/ui/theme-toggle";

import ConsultationPanel from "@/components/consultation-panel";
import MessagingPanel from "@/components/messaging-panel";

import { VisaPredictorView } from "@/components/dashboard/visa-predictor-view";
import { DeadlineTrackerView } from "@/components/dashboard/deadline-tracker-view";
import { OCRUploadView } from "@/components/dashboard/ocr-upload-view";
import { DocumentsView } from "@/components/dashboard/documents-view";
import ReferralView from "@/components/dashboard/referral-view";

import { AgencyView } from "@/components/dashboard/AgencyView";
import { RoadmapView } from "@/components/dashboard/RoadmapView";
import { AIDocsView } from "@/components/dashboard/AIDocsView";
import { UploadView } from "@/components/dashboard/UploadView";
import { TranslateView } from "@/components/dashboard/TranslateView";
import { ChatView } from "@/components/dashboard/ChatView";
import { GovChecksView } from "@/components/dashboard/GovChecksView";
import { TemplatesView } from "@/components/dashboard/TemplatesView";
import { VisaSimulatorView } from "@/components/dashboard/VisaSimulatorView";
import { InterviewTrainerView } from "@/components/dashboard/InterviewTrainerView";
import { DocumentChecklistView } from "@/components/dashboard/DocumentChecklistView";
import CompanySearch from "@/pages/lawyer/company-check";

export default function UserDash() {
  const { user, logout } = useAuth();
  const { t, lang, setLang } = useI18n();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [activeTab, setActiveTab] = useState('checklist');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [applications, setApplications] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingChecklistItem, setPendingChecklistItem] = useState<any>(null);

  useEffect(() => {
    const fetchApps = async () => {
      try {
        const apps = await apiRequest<any[]>("/api/applications");
        setApplications(apps);
      } catch (err) {
        console.error("Failed to fetch applications", err);
      }
    };
    fetchApps();
  }, []);

  const handleSubmitToLawyer = async () => {
    const activeApp = applications.find(a => a.status === 'new' || a.status === 'in_progress');
    if (!activeApp) {
      toast({ title: t.dash?.noActiveApp || "No active application", description: "Start an application first", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest(`/api/applications/${activeApp.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: 'submitted' })
      });
      toast({
        title: t.dash?.submittedSuccess || "Application Submitted",
        description: "Your application has been sent to our legal team.",
        className: "bg-green-50 text-green-900 border-green-200"
      });
      // Refresh apps
      const updated = await apiRequest<any[]>("/api/applications");
      setApplications(updated);
    } catch (err) {
      toast({ title: "Submission Failed", description: "Could not submit application", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

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
  }, [activeTab, toast, t.dash]);

  if (!user) return null;

  const activeApp = applications.find(a => a.status === 'new' || a.status === 'in_progress');

  const navItems = [
    { id: 'roadmap', icon: LayoutDashboard, label: t.dash.roadmap },
    { id: 'checklist', icon: BadgeCheck, label: "Checklist" },
    { id: 'docs', icon: FileText, label: t.dash.docs },
    { id: 'templates', icon: FolderOpen, label: t.dash.templates },
    { id: 'simulator', icon: FlaskConical, label: t.dash.simulator },
    ...(user.role === 'lawyer' || user.role === 'admin' ? [{ id: 'agency', icon: Users, label: t.dash.agency }] : []),
    { id: 'gov', icon: Shield, label: t.dash.gov },
    { id: 'trainer', icon: BrainCircuit, label: t.dash.trainer },
    { id: 'upload', icon: Upload, label: t.dash.upload },
    { id: 'translate', icon: Globe, label: t.dash.translate },
    { id: 'chat', icon: MessageSquare, label: t.dash.chat },
    { id: 'messages', icon: Send, label: t.dash.messages },
    { id: 'lawyer', icon: Briefcase, label: t.dash.lawyer },
    { id: 'research', icon: Book, label: t.dash.research },
    { id: 'companies', icon: Building, label: "Companies" }
  ];

  return (
    <div className="flex flex-col md:flex-row overflow-hidden transition-colors duration-300 h-[calc(100vh)]">

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        variants={{
          open: { x: 0 },
          closed: { x: "-100%" },
        }}
        initial="closed"
        animate={isMobileMenuOpen ? "open" : (typeof window !== 'undefined' && window.innerWidth >= 768 ? "open" : "closed")}
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800 flex flex-col h-[100dvh] shadow-2xl md:shadow-sm md:translate-x-0 md:static`}
      >
        <div className="p-6 md:p-8 flex justify-between items-center">
          <motion.div
            className="flex items-center gap-3 font-extrabold text-2xl tracking-tight cursor-pointer"
            whileHover={{ scale: 1.05 }}
            onClick={() => window.location.href = "/"}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-500/30">
              <Globe size={20} />
            </div>
            <span className="text-slate-900 dark:text-white">ImmigrationAI</span>
          </motion.div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
          {navItems.map(item => (
            <motion.button
              key={item.id}
              onClick={() => {
                if (item.id === 'research') {
                  setLocation('/research');
                } else {
                  setActiveTab(item.id);
                }
                setIsMobileMenuOpen(false);
              }}
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
                {user.name?.[0] || 'U'}
              </div>
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-bold truncate text-slate-900 dark:text-white">{user.name}</p>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
          <LiveButton
            variant="shine"
            className="w-full justify-start text-white hover:text-white text-xs py-3"
            onClick={() => setLocation("/subscription")}
            icon={CreditCard}
          >
            {t.subscription?.manage || "Upgrade"}
          </LiveButton>
          <LiveButton
            variant="ghost"
            className="w-full justify-start text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 text-xs py-3"
            onClick={logout}
            icon={LogOut}
          >
            {t.dash.logout}
          </LiveButton>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto relative bg-mesh">
        <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-brand-50/20 to-transparent dark:from-brand-900/5 pointer-events-none" />

        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-10 relative z-10 gap-4 pt-4 md:pt-0">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 w-full md:w-auto">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <Menu size={24} />
            </button>
            <div className="flex-1 md:flex-none">
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
                {t.dash.welcome} {user.name}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2 text-sm md:text-base">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                {t.dashStatus?.label || 'Immigration Status:'} <span className="text-brand-600 dark:text-brand-400 font-bold">{activeApp ? activeApp.status : (t.dashStatus?.active || 'Active')}</span>
              </p>
            </div>
            <div className="md:hidden">
              <ThemeToggle />
            </div>
          </motion.div>
          <div className="flex items-center gap-4">
            {activeApp && activeApp.status !== 'submitted' && (
              <LiveButton
                variant="primary"
                onClick={handleSubmitToLawyer}
                loading={isSubmitting}
                icon={Send}
                className="shadow-xl shadow-brand-500/20"
              >
                {t.dash?.submitToLawyer || "Submit to Lawyer"}
              </LiveButton>
            )}
            <div className="hidden md:flex items-center gap-2 mr-4">
              <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex border border-slate-200 dark:border-slate-700">
                {(['en', 'uz', 'ru'] as const).map((l) => (
                  <button key={l} onClick={() => setLang(l)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all uppercase ${lang === l ? 'bg-white dark:bg-slate-700 shadow-sm text-brand-600 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>
                    {l}
                  </button>
                ))}
              </div>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'roadmap' && <RoadmapView key="roadmap" setActiveTab={setActiveTab} />}
          {activeTab === 'checklist' && (
            <DocumentChecklistView
              key="checklist"
              onSelectChecklistItem={(item) => { setPendingChecklistItem(item); setActiveTab('upload'); }}
              onSubmit={async () => {
                if (!activeApp) return;
                setIsSubmitting(true);
                try {
                  await apiRequest(`/applications/${activeApp.id}/submit`, { method: 'POST' });
                  toast({
                    title: "Case Submitted",
                    description: "Your application has been successfully submitted to a lawyer for review.",
                    className: "bg-green-50 text-green-900 border-green-200"
                  });
                  // Refresh app status
                  window.location.reload();
                } catch (err: any) {
                  toast({
                    title: "Submission Failed",
                    description: err.message || "Failed to submit application. Please ensure all required documents are verified.",
                    variant: "destructive"
                  });
                } finally {
                  setIsSubmitting(false);
                }
              }}
            />
          )}
          {activeTab === 'tasks' && <ClientTasksView key="tasks" />}
          {activeTab === 'predictor' && <VisaPredictorView key="predictor" />}
          {activeTab === 'docs' && <AIDocsView key="docs" />}
          {activeTab === 'employer' && <EmployerVerificationView key="employer" />}
          {activeTab === 'documents' && <DocumentsView key="documents" />}
          {activeTab === 'templates' && <TemplatesView key="templates" />}
          {activeTab === 'simulator' && <VisaSimulatorView key="simulator" />}
          {activeTab === 'gov' && <GovChecksView key="gov" />}
          {activeTab === 'trainer' && <InterviewTrainerView key="trainer" />}
          {activeTab === 'upload' && <UploadView key="upload" initialChecklistItem={pendingChecklistItem} onUploadComplete={() => setPendingChecklistItem(null)} />}
          {activeTab === 'translate' && <TranslateView key="translate" />}
          {activeTab === 'chat' && <ChatView key="chat" applicationId={activeApp?.id} />}
          {activeTab === 'messages' && <MessagingPanel key="messages" />}
          {activeTab === 'lawyer' && <ConsultationPanel key="lawyer" />}
          {activeTab === 'agency' && <AgencyView key="agency" />}
          {activeTab === 'companies' && <CompanySearch />}
          {activeTab === 'research' && null}
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

const ClientTasksView = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      const data = await apiRequest<any[]>('/tasks');
      setTasks(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchTasks(); }, []);

  return (
    <AnimatedCard>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">My Tasks</h2>
        <div className="text-sm text-slate-500">Assigned by your Lawyer</div>
      </div>

      {loading ? <div className="p-8 text-center text-slate-400">Loading tasks...</div> :
        tasks.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-3" />
            <h3 className="font-medium text-slate-900 dark:text-white">All caught up!</h3>
            <p className="text-slate-500">You have no pending tasks.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map(task => (
              <div key={task.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-4 items-start shadow-sm">
                <div className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center ${task.status === 'done' ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300'}`}>
                  {task.status === 'done' && <CheckCircle size={14} />}
                </div>
                <div className="flex-1">
                  <h4 className={`font-bold text-slate-900 dark:text-white ${task.status === 'done' ? 'line-through text-slate-400' : ''}`}>{task.title}</h4>
                  <p className="text-sm text-slate-500 mt-1">{task.description}</p>
                  {task.dueDate && (
                    <div className="text-xs text-brand-600 mt-2 font-medium flex items-center gap-1">
                      <CalendarClock size={12} /> Due: {new Date(task.dueDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
                <div className="text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 uppercase font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {task.priority}
                </div>
              </div>
            ))}
          </div>
        )
      }
    </AnimatedCard>
  );
};
