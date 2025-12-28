import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import {
  Users, DollarSign, Briefcase, Search, MoreHorizontal,
  LogOut, TrendingUp, CheckCircle, XCircle, Clock, Eye, X,
  Filter, Calendar, FileText, Download, Code, Bell, CreditCard, Video,
  Plus, MessageSquare, BrainCircuit, ArrowUpRight, Zap, Brain, Lock, Printer, Building, RefreshCw, Loader2
} from "lucide-react";

import { motion, AnimatePresence } from "framer-motion";
import LawyerConsultations from "@/components/lawyer-consultations";
import PracticeTasks from "@/components/practice-tasks";
import BillingManager from "@/components/billing-manager";
import LawyerAnalytics from "@/components/lawyer-analytics";
import ClientProfile from "@/components/client-profile";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ThemeToggle } from "@/components/ui/theme-toggle";

import { AIDocsView } from "@/components/dashboard/ai-docs-view";
import { ChatView } from "@/components/dashboard/chat-view";
import { TranslateView } from "@/components/dashboard/translate-view";
import { UploadView } from "@/components/dashboard/upload-view";
import Invoicing from "@/components/lawyer/Invoicing";
import TimeTracker from "@/components/lawyer/TimeTracker";
import LeadsManager from "@/components/lawyer/LeadsManager";
import TaskManager from "@/components/lawyer/TaskManager";
import ClientPortfolio from "@/components/lawyer/ClientPortfolio";
import DocumentTemplates from '@/components/lawyer/DocumentTemplates';
import { InterviewTrainerView } from "@/components/dashboard/InterviewTrainerView";
import CompanySearch from "@/pages/lawyer/company-check";

// --- Types & Components ---

interface Lead {
  id: string | number;
  userId: string;
  name?: string;
  email?: string;
  country?: string;
  visa?: string;
  status?: string;
  fee?: number;
  lawyerId?: string;
  date?: string;
  createdAt?: string;
  priorityScore?: number;
  priorityLevel?: "High" | "Medium" | "Low";
}

interface BackendApplication {
  id: string;
  userId: string;
  metadata?: { applicantName?: string; email?: string };
  userName?: string;
  userEmail?: string;
  country?: string;
  visaType?: string;
  status?: string;
  fee?: number | string;
  createdAt?: string;
}

type ActionVariant = 'primary' | 'success' | 'danger' | 'ghost';

interface ActionButtonProps {
  children?: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  variant?: ActionVariant;
  className?: string;
  icon?: React.ElementType;
  disabled?: boolean;
}



import { LiveButton, AnimatedCard } from "@/components/ui/live-elements";

const ActionButton: React.FC<ActionButtonProps> = ({ children, onClick, variant = 'primary', className = '', icon, disabled }) => (
  <LiveButton
    variant={variant as any}
    onClick={onClick}
    disabled={disabled}
    className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center gap-2 ${className}`}
    icon={icon}
    size="sm"
  >
    {children}
  </LiveButton>
);

interface StatCardProps {
  title: React.ReactNode;
  value: React.ReactNode;
  icon: React.ElementType;
  color: string;
  trend?: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color, trend }) => (
  <AnimatedCard
    className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border-white/20 dark:border-white/5 shadow-xl relative overflow-hidden group rounded-[32px]"
  >
    <div className={`absolute top-0 right-0 p-20 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity bg-${color}-500`}></div>
    <div className="relative z-10 flex items-center justify-between">
      <div>
        <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">{title}</p>
        <h3 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{value}</h3>
        {trend && (
          <p className="text-[10px] font-black text-emerald-500 flex items-center gap-1 mt-3 uppercase tracking-tighter">
            <TrendingUp size={10} /> {trend} INCREMENTAL
          </p>
        )}
      </div>
      <div className={`w-16 h-16 rounded-[24px] bg-${color}-50 dark:bg-${color}-900/20 text-${color}-600 dark:text-${color}-400 flex items-center justify-center shadow-inner border border-${color}-100/20`}>
        <Icon size={32} />
      </div>
    </div>
  </AnimatedCard>
);

export default function LawyerDashboard() {
  const { user, logout, isLoading } = useAuth();
  const [_, setLocation] = useLocation();
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Consolidate tabs from both branches
  const [activeTab, setActiveTab] = useState<'applications' | 'leads' | 'consultations' | 'ai-docs' | 'translate' | 'upload' | 'tasks' | 'time' | 'clients' | 'invoicing' | 'templates' | 'company-check' | 'analytics'>('applications');

  const [filterStatus, setFilterStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');
  const [assignedOnly, setAssignedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [showReport, setShowReport] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [aiBrief, setAiBrief] = useState<string | null>(null);
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);
  const [policyUpdates, setPolicyUpdates] = useState<string | null>(null);
  const [showAiBriefModal, setShowAiBriefModal] = useState(false);
  const [selectedBriefId, setSelectedBriefId] = useState<string | null>(null);
  const [selectedLeadDocuments, setSelectedLeadDocuments] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const pageSize = 10;

  // Show loading while auth resolves
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect unauthenticated or unauthorized users
  if (!user) {
    setLocation("/auth");
    return null;
  }

  if (user.role !== 'lawyer' && user.role !== 'admin') {
    setLocation('/dashboard');
    return null;
  }

  // Combine stats logic
  const revenueData = stats?.monthlyRevenue || stats?.revenueChart || [];

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        setLoading(true);
        const assignedQuery = assignedOnly ? `&assigned=true` : "";
        const data = await apiRequest<{ applications: BackendApplication[]; total: number }>(
          `/applications?page=${page}&pageSize=${pageSize}&status=${filterStatus === "All" ? "all" : filterStatus.toLowerCase()}&sortBy=${sortBy}${assignedQuery}`
        );
        // Map backend applications to lead-like objects for UI
        const mapped: Lead[] = (data.applications || []).map((app: BackendApplication) => ({
          id: app.id,
          userId: app.userId,
          name: app.metadata?.applicantName || app.userName || "Applicant",
          email: app.metadata?.email || app.userEmail || "",
          country: app.country,
          visa: app.visaType,
          status: (app.status || "new").replace("_", " ").replace(/\b\w/g, (l: string) => l.toUpperCase()),
          fee: app.fee ? Number(app.fee) : 0,
          lawyerId: (app as any).lawyerId,
          date: app.createdAt,
          createdAt: app.createdAt,
          priorityScore: (app as any).priorityScore,
          priorityLevel: (app as any).priorityLevel,
        }));
        setLeads(mapped);
      } catch (_err) {
        console.error("Failed to fetch leads:", _err);
        toast({
          title: "Error loading applications",
          description: "Could not retrieve application list. Please try again later.",
          variant: "destructive",
        });
        setLeads([]);
      } finally {
        setLoading(false);
      }
    };
    fetchLeads();
  }, [page, pageSize, filterStatus, sortBy, assignedOnly]);

  // Fetchable stats function for retry capability
  const fetchStats = async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const s = await apiRequest('/stats');
      setStats(s);
    } catch (err) {
      setStats(null);
      setStatsError('Failed to load dashboard stats. Please try again.');
      console.error("Failed to fetch stats:", err);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    const fetchPolicyUpdates = async () => {
      try {
        const res = await apiRequest<{ updates: string }>('/lawyer/automation/policy-updates');
        setPolicyUpdates(res.updates);
      } catch (err) {
        console.error("Failed to fetch policy updates:", err);
      }
    };
    fetchPolicyUpdates();
  }, []);

  useEffect(() => {
    if (selectedLead) {
      const fetchDocs = async () => {
        try {
          setLoadingDocs(true);
          const docs = await apiRequest<any[]>(`/documents?applicationId=${selectedLead.id}`);
          setSelectedLeadDocuments(docs);
        } catch (err) {
          console.error(err);
          setSelectedLeadDocuments([]);
        } finally {
          setLoadingDocs(false);
        }
      };
      fetchDocs();
    } else {
      setSelectedLeadDocuments([]);
    }
  }, [selectedLead]);

  const handleGenerateBrief = async (applicationId: string) => {
    try {
      setIsGeneratingBrief(true);
      setAiBrief(null); // Clear previous brief
      setSelectedBriefId(applicationId);
      setShowAiBriefModal(true); // Open modal immediately
      const res = await apiRequest<{ brief: string }>(`/api/lawyer/automation/brief/${applicationId}`, {
        method: "POST"
      });

      setAiBrief(res.brief);
      toast({
        title: "AI Brief Generated",
        description: "Review the automated analysis below.",
        className: "bg-blue-50 text-blue-900 border-blue-200"
      });
    } catch (err) {
      toast({
        title: "Generation Failed",
        description: "Could not generate AI brief. Please try again.",
        variant: "destructive"
      });
      setShowAiBriefModal(false); // Close modal on error
    } finally {
      setIsGeneratingBrief(false);
    }
  };

  const handleStatusChange = async (id: string | number, newStatus: string) => {
    try {
      await apiRequest(`/applications/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status:
            newStatus === "Approved"
              ? "approved"
              : newStatus === "Rejected"
                ? "rejected"
                : newStatus === "Reviewing"
                  ? "under_review"
                  : "in_progress",
        }),
      });
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status: newStatus } : l)));
    } catch {
      // ignore, toast is handled elsewhere if needed
    }
    toast({
      title: "Status Updated",
      description: `Application status changed to ${newStatus}`,
      className: "bg-green-50 text-green-900 border-green-200"
    });
    if (selectedLead && selectedLead.id === id) {
      setSelectedLead({ ...selectedLead, status: newStatus });
    }
  };

  const handleAssignToMe = async (id: string | number) => {
    try {
      await apiRequest(`/applications/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ lawyerId: user?.id }),
      });
      setLeads(prev => prev.map(l => l.id === id ? { ...l, assigned: user?.id, lawyerId: user?.id } : l));
      toast({ title: 'Assigned', description: `Application assigned to you`, className: 'bg-green-50 text-green-900 border-green-200' });
    } catch (err) {
      // ignore
    }
  };

  // Filter and sort leads (moved here before handlers)
  let filteredLeads = [...leads];

  if (filterStatus !== 'All') {
    filteredLeads = filteredLeads.filter(l => l.status === filterStatus);
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filteredLeads = filteredLeads.filter(l =>
      l.name?.toLowerCase().includes(q) ||
      l.email?.toLowerCase().includes(q) ||
      l.visa?.toLowerCase().includes(q) ||
      l.country?.toLowerCase().includes(q)
    );
  }

  // Sort
  if (sortBy === 'date_desc') {
    filteredLeads.sort((a, b) => new Date(b.createdAt || b.date || 0).getTime() - new Date(a.createdAt || a.date || 0).getTime());
  } else if (sortBy === 'date_asc') {
    filteredLeads.sort((a, b) => new Date(a.createdAt || a.date || 0).getTime() - new Date(b.createdAt || b.date || 0).getTime());
  } else if (sortBy === 'fee_desc') {
    filteredLeads.sort((a, b) => (b.fee || 0) - (a.fee || 0));
  } else if (sortBy === 'fee_asc') {
    filteredLeads.sort((a, b) => (a.fee || 0) - (b.fee || 0));
  }

  const handleExportCSV = () => {
    const headers = ['Name', 'Email', 'Country', 'Visa', 'Status', 'Fee', 'Date', 'CreatedAt'];
    const rows = filteredLeads.map(l => [l.name, l.email, l.country, l.visa, l.status, l.fee, l.date, l.createdAt]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Leads_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: "Export Successful",
      description: `Exported ${filteredLeads.length} applications as CSV`,
      className: "bg-green-50 text-green-900 border-green-200"
    });
  };

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(filteredLeads, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Leads_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: "Export Successful",
      description: `Exported ${filteredLeads.length} applications as JSON`,
      className: "bg-green-50 text-green-900 border-green-200"
    });
  };

  const handleStartCall = async () => {
    try {
      const res = await apiRequest<{ roomId: string }>('/video/create-room', { method: 'POST', body: JSON.stringify({}) });
      setLocation(`/video-call/${res.roomId}`);
    } catch (err) {
      toast({ title: "Failed to start call", variant: "destructive" });
    }
  };

  useEffect(() => {
    if (!isLoading && !user) {
      window.location.href = '/auth';
    }
  }, [isLoading, user]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user || (user.role !== "lawyer" && user.role !== "admin")) return null;

  // Pagination
  const totalPagesCalc = Math.max(1, Math.ceil(filteredLeads.length / pageSize));
  const pageData = filteredLeads.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setTotalPages(totalPagesCalc);
    if (page > totalPagesCalc) setPage(1);
  }, [totalPagesCalc]);

  const totalRevenue = leads.reduce((acc, l) => acc + (l.fee || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 transition-colors duration-300">
      {/* Navbar */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 py-3 sticky top-0 z-40">
        <div className="flex justify-between items-center">
          {/* Left: Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-brand-600 to-blue-400 rounded-xl text-white flex items-center justify-center shadow-lg shadow-brand-500/30 font-bold">
              L
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg text-brand-600 dark:text-brand-400">
                {t.lawyerDashboard?.title || 'Yurist Paneli'}
              </span>
              <span className="text-xs text-slate-400">ImmigrationAI</span>
            </div>
          </div>

          {/* User info */}
          <div className="hidden md:flex flex-col items-end border-l border-slate-200 dark:border-slate-700 pl-4">
            <span className="font-bold text-sm text-slate-900 dark:text-white">{user.firstName || user.name?.split(' ')[0] || 'User'}</span>
            <span className="text-xs text-brand-500 uppercase font-bold tracking-wider">{t.roles?.lawyer || 'Yurist'}</span>
          </div>

          <ThemeToggle />

          <motion.button
            whileHover={{ scale: 1.1, rotate: 90 }}
            onClick={logout}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-500 transition-colors"
            title={t.dash?.logout || 'Chiqish'}
          >
            <LogOut size={20} />
          </motion.button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 md:space-y-8">

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-2 scrollbar-none">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab('applications')}
            className={`px-4 py-3 font-medium transition-colors ${activeTab === 'applications'
              ? 'text-brand-600 dark:text-brand-400 border-b-2 border-brand-600'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
          >
            {t.lawyerDashboard?.applications || t.lawyer?.applications || 'Applications'}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab('consultations')}
            className={`px-4 py-3 font-medium transition-colors flex items-center gap-2 ${activeTab === 'consultations'
              ? 'text-brand-600 dark:text-brand-400 border-b-2 border-brand-600'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
          >
            <Bell size={18} />
            {t.lawyerDashboard?.consultations || t.lawyer?.consultations || 'Consultations'}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab('leads')}
            className={`px-4 py-3 font-medium transition-colors flex items-center gap-2 ${activeTab === 'leads'
              ? 'text-brand-600 dark:text-brand-400 border-b-2 border-brand-600'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
          >
            <Filter size={18} />
            Leads CRM
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab('time')}
            className={`px-4 py-3 font-medium transition-colors flex items-center gap-2 ${activeTab === 'time'
              ? 'text-brand-600 dark:text-brand-400 border-b-2 border-brand-600'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
          >
            <Clock size={18} />
            Time Tracking
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab('tasks')}
            className={`px-4 py-3 font-medium transition-colors flex items-center gap-2 ${activeTab === 'tasks'
              ? 'text-brand-600 dark:text-brand-400 border-b-2 border-brand-600'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
          >
            <Clock size={18} />
            Practice
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab('clients')}
            className={`px-4 py-3 font-medium transition-colors flex items-center gap-2 ${activeTab === 'clients'
              ? 'text-brand-600 dark:text-brand-400 border-b-2 border-brand-600'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
          >
            <Users size={18} />
            Clients
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab('invoicing')}
            className={`px-4 py-3 font-medium transition-colors flex items-center gap-2 ${activeTab === 'invoicing'
              ? 'text-brand-600 dark:text-brand-400 border-b-2 border-brand-600'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
          >
            <DollarSign size={18} />
            Financials
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab('templates')}
            className={`px-4 py-3 font-medium transition-colors flex items-center gap-2 ${activeTab === 'templates'
              ? 'text-brand-600 dark:text-brand-400 border-b-2 border-brand-600'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
          >
            <FileText size={18} />
            Templates
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-3 font-medium transition-colors flex items-center gap-2 ${activeTab === 'analytics'
              ? 'text-brand-600 dark:text-brand-400 border-b-2 border-brand-600'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
          >
            <TrendingUp size={18} />
            Analytics
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab('company-check')}
            className={`px-4 py-3 font-medium transition-colors flex items-center gap-2 ${activeTab === 'company-check'
              ? 'text-brand-600 dark:text-brand-400 border-b-2 border-brand-600'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
          >
            <Building size={18} />
            Check Companies
          </motion.button>
        </div>

        {activeTab === 'applications' && (
          <>
            {/* Stats Error with Retry */}
            {statsError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <XCircle className="text-red-500" size={20} />
                  <span className="text-red-700 dark:text-red-300">{statsError}</span>
                </div>
                <LiveButton
                  variant="danger"
                  size="sm"
                  onClick={fetchStats}
                  disabled={statsLoading}
                  icon={statsLoading ? Loader2 : RefreshCw}
                >
                  {statsLoading ? 'Loading...' : 'Retry'}
                </LiveButton>
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {statsLoading && !stats ? (
                // Loading skeleton
                <>
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-100 dark:border-slate-800 animate-pulse">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-3"></div>
                      <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <StatCard title={t.lawyerDashboard?.active || t.lawyer?.active || "Active"} value={stats?.totalLeads ?? leads.length} icon={Users} color="blue" trend="+12%" />
                  <StatCard title={t.lawyerDashboard?.rev || t.lawyer?.rev || "Revenue"} value={`$${(stats?.totalRevenue ?? totalRevenue).toLocaleString()}`} icon={DollarSign} color="green" trend="+8%" />
                  <StatCard title={t.lawyerDashboard?.pending || t.lawyer?.pending || "Pending"} value={stats?.pendingLeads ?? leads.filter(l => l.status === 'New').length} icon={Clock} color="orange" />
                  <StatCard title={t.lawyerDashboard?.approved || t.lawyer?.approved || "Approved"} value={stats?.approvedLeads ?? leads.filter(l => l.status === 'Approved').length} icon={CheckCircle} color="purple" trend="+5%" />
                </>
              )}
            </div>

            {/* Quick Actions for lawyers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                <h4 className="font-bold mb-2">{t.lawyerDashboard?.quickActions || 'Quick Actions'}</h4>
                <p className="text-sm text-slate-500 mb-4">Common tasks to speed up your workflow</p>
                <div className="flex flex-col gap-2">
                  <ActionButton variant="primary" onClick={() => {
                    // Open messaging panel
                    setLocation('/messages');
                  }}>{t.lawyerDashboard?.messageClient || 'Message Client'}</ActionButton>
                  <ActionButton variant="success" icon={Video} onClick={handleStartCall}>
                    Start Video Call
                  </ActionButton>
                  <ActionButton variant="success" onClick={() => {
                    // Switch to consultations tab
                    setActiveTab('consultations');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}>{t.lawyerDashboard?.newConsultation || 'New Consultation'}</ActionButton>
                  <ActionButton variant="ghost" onClick={() => {
                    setActiveTab('upload');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}>{t.lawyerDashboard?.uploadDoc || 'Upload Doc'}</ActionButton>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                <h4 className="font-bold mb-2">{t.lawyerDashboard?.aiTools || 'AI Tools'}</h4>
                <p className="text-sm text-slate-500 mb-4">Generate documents or run quick translations</p>
                <div className="flex flex-col gap-2">
                  <ActionButton variant="primary" onClick={() => {
                    setActiveTab('ai-docs');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}>{t.lawyerDashboard?.generateDoc || 'Generate Doc'}</ActionButton>

                  <ActionButton variant="ghost" onClick={() => {
                    setActiveTab('translate');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}>{t.lawyerDashboard?.translation || 'Translation'}</ActionButton>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                <h4 className="font-bold mb-2">{t.lawyerDashboard?.caseTools || 'Case Tools'}</h4>
                <p className="text-sm text-slate-500 mb-4">Fast links for case management</p>
                <div className="flex flex-col gap-2">
                  <ActionButton variant="ghost" onClick={() => {
                    // Show all applications in current view
                    setActiveTab('applications');
                    setFilterStatus('All');
                    toast({
                      title: "Showing All Applications",
                      description: `${leads.length} applications loaded`,
                      className: "bg-green-50 text-green-900 border-green-200"
                    });
                  }}>{t.lawyerDashboard?.allApplications || 'All Applications'}</ActionButton>
                  <ActionButton variant="ghost" onClick={() => {
                    setShowReport(true);
                  }}>{t.lawyerDashboard?.analytics || 'Analytics'}</ActionButton>
                  <ActionButton variant="ghost" onClick={() => {
                    window.open('/research', '_blank');
                  }}>{'Research Library'}</ActionButton>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <StatCard title={t.lawyerDashboard?.newThisWeek || 'New This Week'} value={stats?.newThisWeek ?? 0} icon={Calendar} color="blue" />
              <StatCard title={t.lawyerDashboard?.totalFees || 'Total Fees'} value={`$${(stats?.totalFees ?? 0).toLocaleString()}`} icon={CreditCard} color="green" />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-80">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                <h3 className="font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-white"><TrendingUp size={18} className="text-green-500" /> {t.lawyerDashboard?.revenueAnalytics || 'Revenue Analytics'}</h3>
                <ResponsiveContainer width="100%" height="85%">
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.2} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(val) => `$${val}`} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', backgroundColor: '#fff' }} />
                    <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                  </AreaChart>
                </ResponsiveContainer>
              </motion.div>

              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="bg-brand-600 dark:bg-brand-700 p-6 rounded-2xl shadow-xl shadow-brand-500/30 text-white relative overflow-hidden flex flex-col justify-center items-center text-center">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                <div className="relative z-10">
                  <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-4">
                    <Briefcase size={32} className="text-white" />
                  </div>
                  <h3 className="text-2xl font-extrabold mb-2">{t.lawyerDashboard?.topPerformer || 'Top Performer'}</h3>
                  <p className="text-brand-100 mb-6">You are in the top 5% of partners this month.</p>
                  <button
                    onClick={() => setShowReport(true)}
                    className="bg-white text-brand-600 px-6 py-3 rounded-xl font-bold hover:bg-brand-50 transition-colors shadow-lg"
                  >
                    {t.lawyerDashboard?.viewReport || 'View Report'}
                  </button>
                </div>
              </motion.div>
            </div>

            {/* Leads Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-center gap-4 flex-wrap">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">{t.lawyerDashboard?.applications || t.lawyer?.applications || 'Applications'}</h3>
                    <div className="flex gap-2">
                      {['All', 'New', 'Submitted', 'Reviewing', 'Approved', 'Rejected'].map(status => {
                        const statusLabels: Record<string, string> = {
                          'All': 'All',
                          'New': t.lawyerDashboard?.pending || t.lawyer?.pending || 'Pending',
                          'Submitted': 'Submitted',
                          'Reviewing': 'Reviewing',
                          'Approved': t.lawyerDashboard?.approved || t.lawyer?.approved || 'Approved',
                          'Rejected': 'Rejected'
                        };
                        return (
                          <button
                            key={status}
                            onClick={() => { setFilterStatus(status); setPage(1); }}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${filterStatus === status ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                          >
                            {statusLabels[status] || status}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <div className="relative w-full md:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                        placeholder={t.lawyerDashboard?.searchPlaceholder || t.lawyer?.searchPlaceholder || ''}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500 transition-all text-slate-900 dark:text-white"
                      />
                    </div>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    >
                      <option value="date_desc">{t.common?.date || 'Date'} ↓</option>
                      <option value="date_asc">{t.common?.date || 'Date'} ↑</option>
                      <option value="fee_desc">{t.lawyerDashboard?.rev || t.lawyer?.rev || 'Fee'} ↓</option>
                      <option value="fee_asc">{t.lawyerDashboard?.rev || t.lawyer?.rev || 'Fee'} ↑</option>
                    </select>
                    <button onClick={() => { setAssignedOnly(!assignedOnly); setPage(1); }} className={`px-3 py-2.5 rounded-xl text-sm font-bold transition-colors ${assignedOnly ? 'bg-brand-600 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
                      {assignedOnly ? 'Assigned to me' : 'All'}
                    </button>
                  </div>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Showing {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, filteredLeads.length)} of {filteredLeads.length} applications
                </div>
              </div>

              {loading ? (
                <div className="p-12 text-center text-slate-400">Loading...</div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase text-xs font-bold tracking-wider">
                        <tr>
                          <th className="px-6 py-4">{t.lawyer?.clientInfo || 'Applicant'}</th>
                          <th className="px-6 py-4">{t.lawyer?.visaType || 'Visa Details'}</th>
                          <th className="px-6 py-4">{t.lawyerDashboard?.rev || t.lawyer?.rev || 'Fee'}</th>
                          <th className="px-6 py-4">{t.lawyerDashboard?.status || t.lawyer?.status || 'Status'}</th>
                          <th className="px-6 py-4">{t.common?.date || 'Date'}</th>
                          <th className="px-6 py-4">Assigned</th>
                          <th className="px-6 py-4 text-right">{t.common?.actions || 'Actions'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {pageData.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                              {t.research?.noResults?.replace('resources', 'applications') || 'No applications found'}
                            </td>
                          </tr>
                        ) : (
                          pageData.map((lead) => (
                            <tr key={lead.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300">
                                    {(lead.name || "?")[0]}
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-900 dark:text-white">{lead.name}</p>
                                    <p className="text-xs text-slate-400">{lead.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-col">
                                  <span className="font-bold text-slate-700 dark:text-slate-300">{lead.visa}</span>
                                  <span className="text-xs text-slate-500 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> {lead.country}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 font-bold font-mono text-slate-600 dark:text-slate-300">
                                ${lead.fee?.toLocaleString() || 0}
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${lead.status === 'Approved' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-600 dark:text-green-400' :
                                  lead.status === 'New' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400' :
                                    lead.status === 'Reviewing' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-600 dark:text-yellow-400' :
                                      lead.status === 'Rejected' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400' :
                                        'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                                  }`}>
                                  {lead.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-xs text-slate-500">
                                {new Date(lead.date || Date.now()).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 text-xs text-slate-500">
                                {lead.lawyerId === user.id ? (
                                  <span className="text-green-600 font-bold">You</span>
                                ) : lead.lawyerId ? (
                                  <span className="text-slate-400">Other</span>
                                ) : (
                                  <button onClick={() => handleAssignToMe(lead.id)} className="text-blue-500 hover:underline">
                                    Assign to me
                                  </button>
                                )}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => handleGenerateBrief(String(lead.id))}
                                    className="p-2 text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                                    title="Generate AI Brief"
                                  >
                                    <Brain size={16} />
                                  </button>
                                  <button
                                    onClick={() => setSelectedLead(lead)}
                                    className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                  >
                                    <Eye size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between p-6 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {t.common?.prev || 'Previous'}
                    </button>
                    <div className="flex gap-2">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold transition-colors ${page === p ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {t.common?.next || 'Next'}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Policy Updates Ticker */}
            {policyUpdates && (
              <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 p-4 rounded-xl mt-6">
                <h4 className="flex items-center gap-2 font-bold text-blue-700 dark:text-blue-300 text-sm mb-2">
                  <Bell size={14} className="animate-pulse" />
                  Recent Policy Updates
                </h4>
                <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed whitespace-pre-wrap">
                  {policyUpdates}
                </p>
              </div>
            )}
          </>
        )}

        {/* Other Tabs Content */}
        {activeTab === 'consultations' && <LawyerConsultations />}
        {activeTab === 'analytics' && <LawyerAnalytics />}
        {activeTab === 'tasks' && <TaskManager />}
        {activeTab === 'clients' && <ClientPortfolio />}
        {activeTab === 'invoicing' && <Invoicing />}
        {activeTab === 'templates' && <DocumentTemplates />}
        {activeTab === 'ai-docs' && <AIDocsView />}
        {activeTab === 'translate' && <TranslateView />}
        {activeTab === 'upload' && <UploadView />}
        {activeTab === 'company-check' && <CompanySearch />}

      </main>

      {/* Application Detail Modal (Sidebar) */}
      <AnimatePresence>
        {selectedLead && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedLead(null)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 overflow-y-auto"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 right-0 z-50 w-full md:w-[600px] bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{selectedLead.name}</h2>
                    <p className="text-slate-500">Application #{String(selectedLead.id).slice(0, 8)}</p>
                  </div>
                  <button onClick={() => setSelectedLead(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                    <X size={24} className="text-slate-400" />
                  </button>
                </div>

                {/* Status Actions */}
                <div className="flex gap-2 mb-8 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  <button onClick={() => handleStatusChange(selectedLead.id, 'Approved')} className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2">
                    <CheckCircle size={16} /> Approve
                  </button>
                  <button onClick={() => handleStatusChange(selectedLead.id, 'Reviewing')} className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2">
                    <Eye size={16} /> Review
                  </button>
                  <button onClick={() => handleStatusChange(selectedLead.id, 'Rejected')} className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2">
                    <XCircle size={16} /> Reject
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="font-bold text-sm uppercase tracking-wider text-slate-500 mb-3">Applicant Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                        <span className="text-xs text-slate-400 block mb-1">Email</span>
                        <span className="font-medium">{selectedLead.email}</span>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                        <span className="text-xs text-slate-400 block mb-1">Nationality</span>
                        <span className="font-medium">{selectedLead.country}</span>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                        <span className="text-xs text-slate-400 block mb-1">Visa Type</span>
                        <span className="font-medium">{selectedLead.visa}</span>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                        <span className="text-xs text-slate-400 block mb-1">Fee Paid</span>
                        <span className="font-medium">${selectedLead.fee}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-sm uppercase tracking-wider text-slate-500 mb-3">AI Analysis & Documents</h3>
                    <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 p-4 rounded-xl mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="flex items-center gap-2 font-bold text-blue-700 dark:text-blue-300 text-sm">
                          <Brain size={14} /> AI Case Brief
                        </h4>
                        <button onClick={() => handleGenerateBrief(String(selectedLead.id))} className="text-xs text-blue-600 hover:underline">
                          Regenerate
                        </button>
                      </div>
                      {aiBrief ? (
                        <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed whitespace-pre-wrap">
                          {aiBrief}
                        </p>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-xs text-slate-400 mb-2">No brief generated yet</p>
                          <button onClick={() => handleGenerateBrief(String(selectedLead.id))} className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs">
                            Generate Brief
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 max-h-60 overflow-y-auto">
                      {loadingDocs ? (
                        <div className="p-4 text-center text-slate-400 flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" /> Loading documents...
                        </div>
                      ) : selectedLeadDocuments.length === 0 ? (
                        <div className="p-4 text-center text-slate-400 text-sm">No documents uploaded yet.</div>
                      ) : (
                        selectedLeadDocuments.map(doc => (
                          <div key={doc.id} className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                            <div className="flex items-center gap-3">
                              <FileText size={18} className="text-slate-400" />
                              <div className="flex flex-col">
                                <a href={doc.url} target="_blank" rel="noreferrer" className="text-sm font-medium truncate max-w-[180px] hover:text-blue-600 hover:underline">{doc.fileName}</a>
                                <span className="text-[10px] text-slate-400 uppercase">{doc.documentType?.replace('_', ' ') || 'Document'}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {doc.status === 'verified' && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Verified</span>}
                              <a href={doc.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-xs">View</a>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
        {activeTab === 'leads' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Lead Pipeline & CRM</h2>
              <p className="text-slate-500">Manage potential clients and convert them to applications.</p>
            </div>
            <LeadsManager />
          </motion.div>
        )}

        {activeTab === 'time' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Time Tracking & Billing</h2>
              <p className="text-slate-500">Track billable hours and link them to invoices.</p>
            </div>
            <TimeTracker />
          </motion.div>
        )}

      </AnimatePresence>

      {/* AI Brief Modal (Independent) */}
      <AnimatePresence>
        {showAiBriefModal && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2"><Brain className="text-purple-500" /> AI Case Analysis</h3>
                <button onClick={() => setShowAiBriefModal(false)}><X size={20} className="text-slate-400" /></button>
              </div>
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                {isGeneratingBrief ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Loader2 className="h-10 w-10 text-purple-500 animate-spin mb-4" />
                    <p className="font-medium text-slate-700 dark:text-slate-300">Analyzing application documents...</p>
                    <p className="text-sm text-slate-500 mt-1">Checking against policy guidelines</p>
                  </div>
                ) : (
                  <div className="prose prose-sm dark:prose-invert">
                    <p className="whitespace-pre-wrap">{aiBrief || "Analysis unavailable."}</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
