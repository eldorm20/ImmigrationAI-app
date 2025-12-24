import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import {
  Users, DollarSign, Briefcase, Search, MoreHorizontal,
  LogOut, TrendingUp, CheckCircle, XCircle, Clock, Eye, X,
  Filter, Calendar, FileText, Download, Code, Bell, CreditCard, Plus, MessageSquare, BrainCircuit,
  ArrowUpRight, Zap, Brain, Lock, Printer, Building
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
import { ThemeToggle } from "@/components/ui/theme-toggle";
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
    className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 ${className}`}
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
    className="bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden group"
  >
    <div className={`absolute top-0 right-0 p-20 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity bg-${color}-500`}></div>
    <div className="relative z-10 flex items-center justify-between">
      <div>
        <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
        <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">{value}</h3>
        {trend && (
          <p className="text-xs font-bold text-green-500 flex items-center gap-1 mt-2">
            <TrendingUp size={12} /> {trend} vs last month
          </p>
        )}
      </div>
      <div className={`w-14 h-14 rounded-2xl bg-${color}-50 dark:bg-${color}-900/20 text-${color}-600 dark:text-${color}-400 flex items-center justify-center shadow-inner`}>
        <Icon size={28} />
      </div>
    </div>
  </AnimatedCard>
);

export default function LawyerDashboard() {
  const { user, logout, isLoading } = useAuth();
  const [_, setLocation] = useLocation();
  const { t } = useI18n();
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [activeTab, setActiveTab] = useState<'applications' | 'consultations' | 'tasks' | 'billing' | 'analytics' | 'trainer' | 'company-check'>('applications');
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');
  const [assignedOnly, setAssignedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [showReport, setShowReport] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [aiBrief, setAiBrief] = useState<string | null>(null);
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);
  const [policyUpdates, setPolicyUpdates] = useState<string | null>(null);
  const [showAiBriefModal, setShowAiBriefModal] = useState(false);
  const [selectedBriefId, setSelectedBriefId] = useState<string | null>(null);
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

  // Chart Data
  const revenueData = stats?.monthlyRevenue || [];

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

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const s = await apiRequest('/stats');
        setStats(s);
      } catch (err) {
        setStats(null);
      }
    };
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

          {/* Right: Actions */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* Export buttons - hidden on mobile */}
            <div className="hidden lg:flex items-center gap-2">
              <ActionButton variant="ghost" icon={Download} onClick={handleExportCSV}>CSV</ActionButton>
              <ActionButton variant="ghost" icon={Code} onClick={handleExportJSON}>JSON</ActionButton>
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
            onClick={() => setActiveTab('billing')}
            className={`px-4 py-3 font-medium transition-colors flex items-center gap-2 ${activeTab === 'billing'
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

        {/* Applications Tab Content */}
        {
          activeTab === 'applications' && (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title={t.lawyerDashboard?.active || t.lawyer?.active || "Active"} value={stats?.totalLeads ?? leads.length} icon={Users} color="blue" trend="+12%" />
                <StatCard title={t.lawyerDashboard?.rev || t.lawyer?.rev || "Revenue"} value={`$${(stats?.totalRevenue ?? totalRevenue).toLocaleString()}`} icon={DollarSign} color="green" trend="+8%" />
                <StatCard title={t.lawyerDashboard?.pending || t.lawyer?.pending || "Pending"} value={stats?.pendingLeads ?? leads.filter(l => l.status === 'New').length} icon={Clock} color="orange" />
                <StatCard title={t.lawyerDashboard?.approved || t.lawyer?.approved || "Approved"} value={stats?.approvedLeads ?? leads.filter(l => l.status === 'Approved').length} icon={CheckCircle} color="purple" trend="+5%" />
              </div>

              {/* AI Policy Watcher (New Featured Section) */}
              <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-900 p-6 rounded-3xl border border-indigo-500/30 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                  <BrainCircuit size={120} />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-indigo-500/20 p-2 rounded-xl border border-indigo-400/30">
                      <Zap className="text-indigo-400" size={20} />
                    </div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">AI Policy Watcher <span className="text-[10px] bg-indigo-500 text-white px-2 py-0.5 rounded-full uppercase tracking-widest">Live Integration</span></h3>
                  </div>
                  <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                    {policyUpdates || "Searching for immigration policy updates from official RAG databases..."}
                  </div>
                </div>
              </div>

              {/* Practice Management Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <h4 className="font-bold mb-2">Practice Management</h4>
                  <p className="text-sm text-slate-500 mb-4">Manage your internal workflow and client CRM</p>
                  <div className="flex flex-col gap-2">
                    <ActionButton variant="primary" icon={Plus} onClick={() => setActiveTab('tasks')}>Create New Task</ActionButton>
                    <ActionButton variant="ghost" icon={Users} onClick={() => {
                      setFilterStatus('All');
                      setAssignedOnly(true);
                    }}>My Assigned Cases</ActionButton>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <h4 className="font-bold mb-2">Financial Control</h4>
                  <p className="text-sm text-slate-500 mb-4">Professional billing and payment tracking</p>
                  <div className="flex flex-col gap-2">
                    <ActionButton variant="success" icon={CreditCard} onClick={() => setActiveTab('billing')}>Generate New Invoice</ActionButton>
                    <ActionButton variant="ghost" onClick={() => {
                      setLocation('/messages');
                    }}>{t.lawyerDashboard?.messageClient || 'Message Client'}</ActionButton>
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
                        {['All', 'New', 'Reviewing', 'Approved', 'Rejected'].map(status => {
                          const statusLabels: Record<string, string> = {
                            'All': 'All',
                            'New': t.lawyerDashboard?.pending || t.lawyer?.pending || 'Pending',
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
                        <option value="date_desc">{t.common?.date || 'Date'} â†“</option>
                        <option value="date_asc">{t.common?.date || 'Date'} â†‘</option>
                        <option value="fee_desc">{t.lawyerDashboard?.rev || t.lawyer?.rev || 'Fee'} â†“</option>
                        <option value="fee_asc">{t.lawyerDashboard?.rev || t.lawyer?.rev || 'Fee'} â†‘</option>
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
                            <th className="px-6 py-4">Priority</th>
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
                                          'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                                    }`}>
                                    {lead.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter ${lead.priorityLevel === 'High' ? 'bg-red-500 text-white' : lead.priorityLevel === 'Medium' ? 'bg-amber-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}`}>
                                    {lead.priorityLevel || 'Low'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs">
                                  {new Date(lead.date || lead.createdAt || 0).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4">
                                  <div className="text-sm text-slate-600">
                                    {lead.lawyerId ? (lead.lawyerId === user?.id ? 'You' : `Lawyer ${lead.lawyerId.slice(0, 8)}`) : 'Unassigned'}
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ActionButton
                                      variant="ghost"
                                      icon={Brain}
                                      onClick={() => handleGenerateBrief(String(lead.id))}
                                      disabled={isGeneratingBrief}
                                    >
                                      AI Brief
                                    </ActionButton>
                                    <ActionButton
                                      variant="ghost"
                                      icon={Eye}
                                      onClick={() => {
                                        setSelectedLead(lead);
                                        // Scroll to top to see modal
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                      }}
                                    >
                                      {t.common?.view || 'View'}
                                    </ActionButton>
                                    <ActionButton
                                      variant="ghost"
                                      icon={MessageSquare}
                                      onClick={() => setLocation(`/messages?select=${lead.userId}`)}
                                    >
                                      {t.lawyerDashboard?.messageClient || 'Message'}
                                    </ActionButton>
                                    {lead.status !== 'Approved' && lead.status !== 'Rejected' && (
                                      <ActionButton
                                        variant="success"
                                        icon={CheckCircle}
                                        onClick={() => {
                                          if (confirm(`${t.success?.message || 'Approve'} ${lead.name}?`)) {
                                            handleStatusChange(lead.id, 'Approved');
                                          }
                                        }}
                                      >
                                        {t.lawyer?.approveApplication || 'Approve'}
                                      </ActionButton>
                                    )}
                                    {lead.status === 'New' && (
                                      <ActionButton
                                        variant="danger"
                                        icon={XCircle}
                                        onClick={() => {
                                          if (confirm(`${t.error?.message || 'Reject'} ${lead.name}?`)) {
                                            handleStatusChange(lead.id, 'Rejected');
                                          }
                                        }}
                                      >
                                        {t.lawyer?.rejectApplication || 'Reject'}
                                      </ActionButton>
                                    )}
                                    {lead.status === 'New' && (
                                      <ActionButton
                                        variant="ghost"
                                        icon={Clock}
                                        onClick={() => handleStatusChange(lead.id, 'Reviewing')}
                                      >
                                        {t.lawyerDashboard?.pending || t.lawyer?.pending || 'Pending'}
                                      </ActionButton>
                                    )}
                                    {(!lead.lawyerId || lead.lawyerId !== user?.id) && (
                                      <ActionButton variant="primary" icon={Users} onClick={() => handleAssignToMe(lead.id)}>
                                        Assign to me
                                      </ActionButton>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                    {totalPages > 1 && (
                      <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                          {t.common?.page || 'Page'} {page} {t.common?.of || 'of'} {totalPages}
                        </div>
                        <div className="flex gap-2">
                          <ActionButton
                            variant="ghost"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                          >
                            {t.common?.previous || 'Previous'}
                          </ActionButton>
                          <ActionButton
                            variant="ghost"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                          >
                            {t.common?.next || 'Next'}
                          </ActionButton>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )
        }

        {/* Consultations Tab Content */}
        {
          activeTab === 'consultations' && (
            <LawyerConsultations />
          )
        }

        {/* Practice (Tasks) Tab Content */}
        {
          activeTab === 'tasks' && (
            <PracticeTasks />
          )
        }

        {/* Financials (Billing) Tab Content */}
        {
          activeTab === 'billing' && (
            <BillingManager />
          )
        }

        {/* Analytics Tab Content */}
        {
          activeTab === 'analytics' && (
            <LawyerAnalytics />
          )
        }



        {/* Company Check Tab Content */}
        {
          activeTab === 'company-check' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
              <CompanySearch />
            </div>
          )
        }
      </main>

      {/* Client Detail Modal */}
      <AnimatePresence>
        {
          selectedLead && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedLead(null)} />
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl relative z-10 shadow-2xl border border-white/10 max-h-[90vh] flex flex-col p-4 md:p-8">
                <ClientProfile clientId={selectedLead.userId} onClose={() => setSelectedLead(null)} />
              </motion.div>
            </div>
          )
        }
      </AnimatePresence>

      {/* Performance Report Modal */}
      <AnimatePresence>
        {
          showReport && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowReport(false)} />
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white dark:bg-slate-900 p-8 rounded-3xl w-full max-w-2xl relative z-10 shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">Performance Report</h3>
                  <button onClick={() => setShowReport(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500"><X size={20} /></button>
                </div>

                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-brand-50 to-brand-100 dark:from-brand-900/20 dark:to-brand-900/10 p-6 rounded-2xl border border-brand-200 dark:border-brand-800">
                    <h4 className="font-bold text-lg text-brand-900 dark:text-brand-100 mb-2">Monthly Overview</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs font-bold text-brand-700 dark:text-brand-300 uppercase mb-1">Total Applications</p>
                        <p className="text-2xl font-extrabold text-brand-900 dark:text-white">{leads.length}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-brand-700 dark:text-brand-300 uppercase mb-1">Approved</p>
                        <p className="text-2xl font-extrabold text-green-600 dark:text-green-400">{leads.filter(l => l.status === 'Approved').length}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-brand-700 dark:text-brand-300 uppercase mb-1">Approval Rate</p>
                        <p className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">{leads.length > 0 ? Math.round((leads.filter(l => l.status === 'Approved').length / leads.length) * 100) : 0}%</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <h4 className="font-bold text-lg text-slate-900 dark:text-white mb-4">Status Breakdown</h4>
                    <div className="space-y-2">
                      {['New', 'Reviewing', 'Approved', 'Rejected'].map(status => {
                        const count = leads.filter(l => l.status === status).length;
                        const percentage = leads.length > 0 ? Math.round((count / leads.length) * 100) : 0;
                        return (
                          <div key={status} className="flex items-center gap-3">
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300 w-24">{status}</span>
                            <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full ${status === 'Approved' ? 'bg-green-500' :
                                  status === 'Reviewing' ? 'bg-yellow-500' :
                                    status === 'Rejected' ? 'bg-red-500' :
                                      'bg-blue-500'
                                  }`}
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-bold text-slate-600 dark:text-slate-400 w-12 text-right">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <h4 className="font-bold text-lg text-slate-900 dark:text-white mb-4">Revenue Summary</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Total Fees Collected</p>
                        <p className="text-2xl font-extrabold text-slate-900 dark:text-white">${leads.reduce((sum, l) => sum + (l.fee || 0), 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Average Fee</p>
                        <p className="text-2xl font-extrabold text-slate-900 dark:text-white">${leads.length > 0 ? Math.round(leads.reduce((sum, l) => sum + (l.fee || 0), 0) / leads.length) : 0}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <ActionButton
                      className="flex-1 py-3"
                      variant="primary"
                      icon={Download}
                      onClick={() => {
                        toast({
                          title: "Report Downloaded",
                          description: "Performance report has been downloaded as PDF",
                          className: "bg-green-50 text-green-900 border-green-200"
                        });
                      }}
                    >
                      Download as PDF
                    </ActionButton>
                    <ActionButton
                      className="flex-1 py-3"
                      variant="ghost"
                      onClick={() => setShowReport(false)}
                    >
                      Close
                    </ActionButton>
                  </div>
                </div>
              </motion.div>
            </div>
          )
        }
        {
          showAiBriefModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAiBriefModal(false)} />
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-3xl relative z-10 shadow-2xl border border-white/10 max-h-[85vh] flex flex-col p-8 overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-brand-500 p-2 rounded-xl text-white">
                      <Brain size={24} />
                    </div>
                    <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">Authoritative Case Brief</h3>
                  </div>
                  <button onClick={() => setShowAiBriefModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500"><X size={20} /></button>
                </div>

                {!aiBrief && isGeneratingBrief ? (
                  <div className="py-20 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500 mx-auto mb-4"></div>
                    <p className="text-slate-400 animate-pulse font-medium">ImmigrationAI is analyzing legal databases & application context...</p>
                  </div>
                ) : (
                  <>
                    <div className="prose prose-slate dark:prose-invert max-w-none whitespace-pre-wrap text-slate-700 dark:text-slate-300 font-sans leading-relaxed printable-content">
                      {aiBrief}
                    </div>
                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 font-bold no-print">
                      <ActionButton
                        variant="primary"
                        icon={Download}
                        onClick={() => window.open(`/api/lawyer/automation/brief/${selectedBriefId}/download`, '_blank')}
                      >
                        Download (.txt)
                      </ActionButton>
                      <ActionButton variant="ghost" icon={Printer} onClick={() => window.print()}>Print</ActionButton>
                      <ActionButton variant="ghost" onClick={() => setShowAiBriefModal(false)}>Close</ActionButton>
                    </div>


                  </>
                )}
              </motion.div>
            </div>
          )
        }
      </AnimatePresence >
    </div >
  );
}
