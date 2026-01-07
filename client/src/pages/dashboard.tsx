import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import {
  LayoutDashboard, FileText, MessageSquare, Book, Users,
  Globe, Send, Briefcase, Upload, FolderOpen, FlaskConical,
  Shield, BrainCircuit, Building, CheckCircle, CreditCard
} from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { LiveButton } from "@/components/ui/live-elements";

// View Imports
import ConsultationPanel from "@/components/consultation-panel";
import MessagingPanel from "@/components/messaging-panel";
import { VisaPredictorView } from "@/components/dashboard/VisaPredictorView";
import { DocumentsView } from "@/components/dashboard/DocumentsView";
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
import { AnimatedCard } from "@/components/ui/live-elements";
import { ResearchView } from "@/components/dashboard/ResearchView";
import { FinancesView } from "@/components/dashboard/FinancesView";
import Subscription from "@/pages/subscription";
import { SubmissionStatusView } from "@/components/dashboard/SubmissionStatusView";

export default function UserDash() {
  const { user } = useAuth();
  const { t, setLang, lang } = useI18n();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [activeTab, setActiveTab] = useState('checklist');
  const [applications, setApplications] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingChecklistItem, setPendingChecklistItem] = useState<any>(null);

  useEffect(() => {
    const fetchApps = async () => {
      try {
        const res = await apiRequest<any>("/applications");
        const apps = Array.isArray(res) ? res : (res.applications || []);
        setApplications(apps);
      } catch (err) {
        console.error("Failed to fetch applications", err);
      }
    };

    const fetchSubscription = async () => {
      try {
        const res = await apiRequest<any>("/subscription/current");
        setSubscription(res);
      } catch (err) {
        console.warn("Failed to fetch subscription", err);
      }
    };

    fetchApps();
    fetchSubscription();
  }, []);

  const activeApp = applications.find(a => a.status === 'new' || a.status === 'in_progress') || applications[0];

  const handleSubmitToLawyer = async () => {
    if (!activeApp) {
      toast({ title: t.dash?.noActiveApp || "No active application", description: "Start an application first", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest(`/applications/${activeApp.id || 'new'}`, {
        method: "PATCH",
        body: JSON.stringify({ status: 'submitted' })
      });
      toast({
        title: t.dash?.submittedSuccess || "Application Submitted",
        description: "Your application has been sent to our legal team.",
        className: "bg-green-50 text-green-900 border-green-200"
      });
      // Refresh apps
      const updated = await apiRequest<any[]>("/applications");
      setApplications(updated);
    } catch (err: any) {
      toast({ title: "Submission Failed", description: err.message || "Could not submit application", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  const navItems = [
    { id: 'roadmap', icon: LayoutDashboard, label: t?.dash?.roadmap || "Roadmap" },
    { id: 'checklist', icon: CheckCircle, label: t?.dash?.checklist || "Checklist" },
    { id: 'docs', icon: FileText, label: t?.dash?.docs || "Documents" },
    { id: 'templates', icon: FolderOpen, label: t?.dash?.templates || "Templates" },
    { id: 'simulator', icon: FlaskConical, label: t?.dash?.simulator || "Simulator" },
    { id: 'gov', icon: Shield, label: t?.dash?.gov || "Gov Check" },
    { id: 'trainer', icon: BrainCircuit, label: t?.dash?.trainer || "Trainer" },
    { id: 'upload', icon: Upload, label: t?.dash?.upload || "Upload" },
    { id: 'translate', icon: Globe, label: t?.dash?.translate || "Translate" },
    { id: 'chat', icon: MessageSquare, label: t?.dash?.chat || "AI Lawyer" },
    { id: 'messages', icon: Send, label: t?.dash?.messages || "Messages" },
    { id: 'lawyer', icon: Briefcase, label: t?.dash?.lawyer || "Consultation" },
    { id: 'finances', icon: CreditCard, label: "Finances" },
    { id: 'subscription', icon: Shield, label: "Billing & Subscription" },
    { id: 'research', icon: Book, label: t?.dash?.research || "Research" },
    { id: 'companies', icon: Building, label: "Companies" },
    { id: 'submission', icon: Send, label: t?.dash?.submission || "Submission" }
  ];

  const currentNavItem = navItems.find(i => i.id === activeTab);

  return (
    <AppLayout
      navItems={navItems}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      title={currentNavItem?.label || "Dashboard"}
      subtitle={activeApp ? `${activeApp.visaType || 'General'} Application • ${activeApp.status}` : "Welcome to ImmigrationAI"}
      actions={
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-1 bg-white/20 dark:bg-black/20 p-1 rounded-xl">
            {(['en', 'uz', 'ru'] as const).map((l) => (
              <button key={l} onClick={() => setLang(l)} className={`px-2 py-1 text-xs font-bold rounded-lg uppercase ${lang === l ? 'bg-white shadow-sm text-brand-600' : 'text-slate-500'}`}>
                {l}
              </button>
            ))}
          </div>
          {subscription && (
            <button
              onClick={() => setActiveTab('subscription')}
              className={`hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all hover:scale-105 active:scale-95 ${subscription.status === 'active' ? 'bg-green-50/50 border-green-100 text-green-700' : 'bg-amber-50/50 border-amber-100 text-amber-700'} dark:bg-black/20 dark:border-white/5`}
            >
              <Shield size={14} />
              <div className="text-[10px] font-bold uppercase tracking-wider">
                {subscription.plan} • {subscription.status}
              </div>
            </button>
          )}
          {activeApp && activeApp.status !== 'submitted' && (
            <LiveButton variant="primary" onClick={handleSubmitToLawyer} loading={isSubmitting} icon={Send}>
              {t?.dash?.submitToLawyer || "Submit Case"}
            </LiveButton>
          )}
        </div>
      }
    >
      {/* View Content */}
      <div className="min-h-full">
        {activeTab === 'roadmap' && <RoadmapView setActiveTab={setActiveTab} />}
        {activeTab === 'checklist' && (
          <DocumentChecklistView
            onSelectChecklistItem={(item) => { setPendingChecklistItem(item); setActiveTab('upload'); }}
            onSubmit={handleSubmitToLawyer}
          />
        )}
        {activeTab === 'tasks' && <ClientTasksView />}
        {activeTab === 'predictor' && <VisaPredictorView />}
        {activeTab === 'docs' && <AIDocsView applicationId={activeApp?.id} />}
        {activeTab === 'upload' && <UploadView initialChecklistItem={pendingChecklistItem} onUploadComplete={() => setPendingChecklistItem(null)} />}
        {activeTab === 'translate' && <TranslateView />}
        {activeTab === 'chat' && <ChatView applicationId={activeApp?.id} />}
        {activeTab === 'messages' && <MessagingPanel />}
        {activeTab === 'lawyer' && <ConsultationPanel />}
        {activeTab === 'finances' && <FinancesView />}
        {activeTab === 'subscription' && <Subscription />}
        {activeTab === 'agency' && <AgencyView />}
        {activeTab === 'companies' && <CompanySearch />}
        {activeTab === 'research' && <ResearchView />}
        {activeTab === 'gov' && <GovChecksView applicationId={activeApp?.id} />}
        {activeTab === 'templates' && <TemplatesView />}
        {activeTab === 'simulator' && <VisaSimulatorView applicationId={activeApp?.id} />}
        {activeTab === 'trainer' && <InterviewTrainerView applicationId={activeApp?.id} />}
        {activeTab === 'submission' && <SubmissionStatusView application={activeApp} />}
      </div>
    </AppLayout>
  );
}

// Temporary Tasks View
const ClientTasksView = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const f = async () => {
      try { const d = await apiRequest<any[]>('/tasks'); setTasks(d || []); }
      catch (e) { console.error(e); } finally { setLoading(false); }
    };
    f();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="grid gap-4">
      {tasks.length === 0 ? <p className="text-slate-500">No tasks assigned.</p> : tasks.map(t => (
        <AnimatedCard key={t.id} className="p-4 glass-panel">
          <h4 className="font-bold">{t?.title}</h4>
          <p className="text-sm opacity-70">{t.description}</p>
        </AnimatedCard>
      ))}
    </div>
  )
}
