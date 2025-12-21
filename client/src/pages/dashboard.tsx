import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import {
  LayoutDashboard, FileText, MessageSquare, LogOut, Book, Settings, CreditCard, Bell, BadgeCheck,
  Globe, Send, Briefcase, Upload, FolderOpen, FlaskConical, Users, Shield, BrainCircuit, Menu, X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { LiveButton, AnimatedCard } from "@/components/ui/live-elements";
import { ThemeToggle } from "@/components/ui/theme-toggle";

import ConsultationPanel from "@/components/consultation-panel";
import MessagingPanel from "@/components/messaging-panel";

import { AgencyView } from "@/components/dashboard/AgencyView";
import { RoadmapView } from "@/components/dashboard/RoadmapView";
import { AIDocsView } from "@/components/dashboard/AIDocsView";
import { UploadView } from "@/components/dashboard/UploadView";
import { TranslateView } from "@/components/dashboard/TranslateView";
import { ChatView } from "@/components/dashboard/ChatView";
import { GovChecksView } from "@/components/dashboard/GovChecksView";
import { SavedTemplatesView } from "@/components/dashboard/SavedTemplatesView";
import { ScenarioSimulator } from "@/components/dashboard/ScenarioSimulator";
import { InterviewTrainerView } from "@/components/dashboard/InterviewTrainerView";



export default function UserDash() {
  const { user, logout } = useAuth();
  const { t, lang, setLang } = useI18n();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [activeTab, setActiveTab] = useState('roadmap');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
        initial={false}
        transition={{ type: "spring", bounce: 0, duration: 0.3 }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.5, right: 0.05 }}
        onDragEnd={(e, { offset, velocity }) => {
          if (offset.x < -50 || velocity.x < -500) {
            setIsMobileMenuOpen(false);
          }
        }}
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800 flex flex-col h-[100dvh] shadow-2xl md:shadow-sm md:translate-x-0 md:static`}
        style={{ x: undefined }} // Reset x for desktop if needed via media query, but mixed motion/css can be tricky.
        // Better approach: Use variants or conditional animate. 
        // Since we can't easily do media queries in 'animate', we'll rely on the fact that on desktop we want it always visible.
        // But standard CSS 'md:static' might conflict with motion style 'x'.
        // Let's rely on standard CSS for desktop and motion for mobile?
        // Actually, mixing is hard. Let's use a specialized mobile drawer component pattern or keep it simple.
        // simpler: Keep class based transform for desktop reset?
        // If I set animate={{ x: ... }} it adds inline style. 
        // for desktop: force x: 0 !important via css? or use 'variants'.
        variants={{
          open: { x: 0 },
          closed: { x: "-100%" },
        }}
        initial="closed"
        animate={isMobileMenuOpen ? "open" : (window.innerWidth >= 768 ? { x: 0 } : "closed")}
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

        <nav className="flex-1 px-4 space-y-2">
          {[
            { id: 'roadmap', icon: LayoutDashboard, label: t.dash.roadmap },
            { id: 'docs', icon: FileText, label: t.dash.docs },
            { id: 'templates', icon: FolderOpen, label: t.dash.templates },
            { id: 'simulator', icon: FlaskConical, label: t.dash.simulator },
            ...(user.role === 'lawyer' || user.role === 'admin' ? [{ id: 'agency', icon: Users, label: t.dash.agency }] : []),
            { id: 'gov', icon: Shield, label: t.dash.gov },
            { id: 'trainer', icon: BrainCircuit, label: t.dash.trainer },
            { id: 'upload', icon: Upload, label: t.dash.upload },
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
      <main className="flex-1 p-6 md:p-10 overflow-y-auto relative bg-mesh">
        {/* Background Elements */}
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
                {t.dashStatus?.label || 'Immigration Status:'} <span className="text-brand-600 dark:text-brand-400 font-bold">{t.dashStatus?.active || 'Active'}</span>
              </p>
            </div>
            <div className="md:hidden">
              <ThemeToggle />
            </div>
          </motion.div>
          <div className="flex items-center gap-4">
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
          {activeTab === 'docs' && <AIDocsView key="docs" />}
          {activeTab === 'templates' && <SavedTemplatesView key="templates" />}
          {activeTab === 'simulator' && <ScenarioSimulator key="simulator" />}
          {activeTab === 'gov' && <GovChecksView key="gov" />}
          {activeTab === 'trainer' && <InterviewTrainerView key="trainer" />}
          {activeTab === 'upload' && <UploadView key="upload" />}
          {activeTab === 'translate' && <TranslateView key="translate" />}
          {activeTab === 'chat' && <ChatView key="chat" />}
          {activeTab === 'messages' && <MessagingPanel key="messages" />}
          {activeTab === 'lawyer' && <ConsultationPanel key="lawyer" />}
          {activeTab === 'agency' && <AgencyView key="agency" />}
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
    </div >
  );
}
