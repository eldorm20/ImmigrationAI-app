import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import {
  LayoutDashboard, FileText, MessageSquare, LogOut, Book, Settings, CreditCard, Bell, BadgeCheck,
  Globe, Send, Briefcase, Upload, FolderOpen, FlaskConical, Users
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

import { SavedTemplatesView } from "@/components/dashboard/SavedTemplatesView";
import { ScenarioSimulator } from "@/components/dashboard/ScenarioSimulator";



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
            { id: 'docs', icon: FileText, label: t.dash.docs }, // AIDocsView
            { id: 'templates', icon: FolderOpen, label: 'Templates' },
            { id: 'simulator', icon: FlaskConical, label: 'Simulator' },
            ...(user.role === 'lawyer' || user.role === 'admin' ? [{ id: 'agency', icon: Users, label: 'Agency Team' }] : []),

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
          {activeTab === 'roadmap' && <RoadmapView key="roadmap" setActiveTab={setActiveTab} />}
          {activeTab === 'docs' && <AIDocsView key="docs" />}
          {activeTab === 'templates' && <SavedTemplatesView key="templates" />}
          {activeTab === 'simulator' && <ScenarioSimulator key="simulator" />}

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
