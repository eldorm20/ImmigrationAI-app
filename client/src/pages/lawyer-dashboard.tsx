import React, { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { useI18n } from "@/lib/i18n";
import {
  Users, DollarSign, Briefcase, Search, MoreHorizontal,
  LogOut, TrendingUp, CheckCircle, XCircle, Clock, Eye, X,
  Filter, Calendar, FileText, Download, Code, Bell, CreditCard, Video,
  Plus, MessageSquare, BrainCircuit, ArrowUpRight, Zap, Brain, Lock, Printer, Building, RefreshCw, Loader2
} from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import LawyerConsultations from "@/components/lawyer-consultations";
import PracticeTasks from "@/components/practice-tasks";
import BillingManager from "@/components/billing-manager";
import LawyerAnalytics from "@/components/lawyer-analytics";
import ClientProfile from "@/components/client-profile";
import { AIDocsView } from "@/components/dashboard/AIDocsView";
import { UploadView } from "@/components/dashboard/UploadView";
import { TranslateView } from "@/components/dashboard/TranslateView";
import Invoicing from "@/components/lawyer/Invoicing";
import TimeTracker from "@/components/lawyer/TimeTracker";
import LeadsManager from "@/components/lawyer/LeadsManager";
import TaskManager from "@/components/lawyer/TaskManager";
import ClientPortfolio from "@/components/lawyer/ClientPortfolio";
import DocumentTemplates from '@/components/lawyer/DocumentTemplates';
import { InterviewTrainerView } from "@/components/dashboard/InterviewTrainerView";
import CompanySearch from "@/pages/lawyer/company-check";
import MessagingPanel from "@/components/messaging-panel";

export default function LawyerDashboard() {
  const { user, isLoading } = useAuth();
  const [_, setLocation] = useLocation();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState('leads');
  const [selectedClientIdForMessage, setSelectedClientIdForMessage] = useState<string | null>(null);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-brand-500" /></div>;
  if (!user || (user.role !== 'lawyer' && user.role !== 'admin')) {
    setLocation('/auth');
    return null;
  }

  const navItems = [
    { id: 'leads', label: "Inquiries", icon: Users },
    { id: 'applications', label: "Applications", icon: Briefcase },
    { id: 'consultations', label: "Consultations", icon: Calendar },
    { id: 'financials', label: "Financials", icon: DollarSign },
    { id: 'documents', label: "Documents", icon: FileText },
    { id: 'templates', label: "Templates", icon: FolderOpen },
    { id: 'company-check', label: "Company Check", icon: Building },
    { id: 'messages', label: "Messages", icon: MessageSquare },
  ];

  const currentNavItem = navItems.find(i => i.id === activeTab);

  // Icon fix
  function FolderOpen(props: any) { return <FileText {...props} /> } // Fallback

  return (
    <AppLayout
      navItems={navItems}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      title={currentNavItem?.label || "Lawyer Dashboard"}
      subtitle="Manage your practice"
    >
      <div className="min-h-full pb-10">
        {activeTab === 'leads' && <LeadsManager />}
        {activeTab === 'applications' && <ClientPortfolio onMessageClient={(clientId) => {
          setSelectedClientIdForMessage(clientId);
          setActiveTab('messages');
        }} />} {/* Reusing ClientPortfolio for Applications/Cases */}
        {activeTab === 'consultations' && <LawyerConsultations />}
        {activeTab === 'financials' && (
          <div className="space-y-8">
            <BillingManager />
            <Invoicing />
          </div>
        )}
        {activeTab === 'documents' && <AIDocsView />}
        {activeTab === 'templates' && <DocumentTemplates />}
        {activeTab === 'company-check' && <CompanySearch />}
        {activeTab === 'messages' && <MessagingPanel initialSelectedUserId={selectedClientIdForMessage} />}
      </div>
    </AppLayout>
  );
}
