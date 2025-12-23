import React, { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    Users,
    Calendar,
    CheckCircle,
    Clock,
    AlertTriangle,
    FileText,
    BarChart3,
} from "lucide-react";
import RevenueChart from "./revenue-chart";

interface DashboardAnalytics {
    applications: {
        total: number;
        pending: number;
        approved: number;
        rejected: number;
        inProgress: number;
    };
    consultations: {
        total: number;
        scheduled: number;
        completed: number;
        cancelled: number;
    };
    tasks: {
        total: number;
        pending: number;
        inProgress: number;
        completed: number;
    };
    revenue: {
        total: number;
        totalAmount: number;
        paid: number;
        outstanding: number;
        drafts: number;
    };
    upcomingConsultations: Array<{
        id: string;
        scheduledTime: string;
        applicant?: { firstName?: string; lastName?: string; email: string };
    }>;
    overdueTasks: Array<{
        id: string;
        title: string;
        dueDate: string;
    }>;
    weeklyCompletedTasks: number;
}

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    trend?: { value: number; isPositive: boolean };
    color?: string;
    subtext?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend, color = "blue", subtext }) => {
    const colorClasses: Record<string, string> = {
        blue: "from-blue-500 to-blue-600",
        green: "from-emerald-500 to-emerald-600",
        orange: "from-orange-500 to-orange-600",
        purple: "from-purple-500 to-purple-600",
        red: "from-red-500 to-red-600",
        cyan: "from-cyan-500 to-cyan-600",
    };

    return (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 p-6 backdrop-blur-sm">
            <div className="flex items-start justify-between">
                <div className="space-y-2">
                    <p className="text-sm text-slate-400 font-medium">{title}</p>
                    <p className="text-3xl font-bold text-white">{value}</p>
                    {subtext && <p className="text-xs text-slate-500">{subtext}</p>}
                    {trend && (
                        <div className={`flex items-center gap-1 text-xs ${trend.isPositive ? "text-emerald-400" : "text-red-400"}`}>
                            {trend.isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                            <span>{Math.abs(trend.value)}% vs last month</span>
                        </div>
                    )}
                </div>
                <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClasses[color]}`}>
                    {icon}
                </div>
            </div>
        </div>
    );
};

interface TaskItemProps {
    title: string;
    dueDate: string;
    isOverdue?: boolean;
}

const TaskItem: React.FC<TaskItemProps> = ({ title, dueDate, isOverdue }) => (
    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
        <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${isOverdue ? "bg-red-500" : "bg-amber-500"}`} />
            <span className="text-sm text-slate-300 truncate max-w-[200px]">{title}</span>
        </div>
        <span className={`text-xs ${isOverdue ? "text-red-400" : "text-slate-500"}`}>
            {new Date(dueDate).toLocaleDateString()}
        </span>
    </div>
);

interface ConsultationItemProps {
    time: string;
    clientName: string;
    clientEmail: string;
}

const ConsultationItem: React.FC<ConsultationItemProps> = ({ time, clientName, clientEmail }) => (
    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium">
                {clientName.charAt(0).toUpperCase()}
            </div>
            <div>
                <p className="text-sm font-medium text-slate-200">{clientName}</p>
                <p className="text-xs text-slate-500">{clientEmail}</p>
            </div>
        </div>
        <div className="text-right">
            <p className="text-sm text-slate-300">{new Date(time).toLocaleDateString()}</p>
            <p className="text-xs text-slate-500">{new Date(time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
        </div>
    </div>
);

export default function LawyerAnalytics() {
    const { toast } = useToast();
    const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                setLoading(true);
                const data = await apiRequest<DashboardAnalytics>("/analytics/lawyer/dashboard");
                setAnalytics(data);
            } catch (error) {
                console.error("Failed to fetch analytics:", error);
                toast({
                    title: "Error",
                    description: "Failed to load analytics",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!analytics) {
        return (
            <div className="text-center py-12 text-slate-500">
                <BarChart3 size={48} className="mx-auto mb-3 opacity-50" />
                <p>No analytics data available</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Active Cases"
                    value={analytics.applications.total}
                    icon={<FileText className="text-white" size={24} />}
                    trend={{ value: 12, isPositive: true }}
                    color="blue"
                    subtext={`${analytics.applications.pending} pending`}
                />
                <StatCard
                    title="Total Revenue"
                    value={`$${analytics.revenue.paid.toLocaleString()}`}
                    icon={<DollarSign className="text-white" size={24} />}
                    trend={{ value: 8, isPositive: true }}
                    color="green"
                    subtext={`$${analytics.revenue.outstanding.toLocaleString()} outstanding`}
                />
                <StatCard
                    title="Consultations"
                    value={analytics.consultations.total}
                    icon={<Calendar className="text-white" size={24} />}
                    color="purple"
                    subtext={`${analytics.consultations.scheduled} scheduled`}
                />
                <StatCard
                    title="Tasks Completed"
                    value={analytics.tasks.completed}
                    icon={<CheckCircle className="text-white" size={24} />}
                    color="cyan"
                    subtext={`${analytics.weeklyCompletedTasks} this week`}
                />
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                    title="Pending Tasks"
                    value={analytics.tasks.pending}
                    icon={<Clock className="text-white" size={20} />}
                    color="orange"
                />
                <StatCard
                    title="Approved Cases"
                    value={analytics.applications.approved}
                    icon={<CheckCircle className="text-white" size={20} />}
                    color="green"
                />
                <StatCard
                    title="Draft Invoices"
                    value={analytics.revenue.drafts}
                    icon={<FileText className="text-white" size={20} />}
                    color="purple"
                />
            </div>

            {/* Widgets Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Upcoming Consultations */}
                <div className="rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Calendar size={20} className="text-blue-400" />
                            Upcoming Consultations
                        </h3>
                        <span className="text-xs text-slate-500">Next 7 days</span>
                    </div>
                    <div className="space-y-3">
                        {analytics.upcomingConsultations.length === 0 ? (
                            <p className="text-sm text-slate-500 text-center py-4">No upcoming consultations</p>
                        ) : (
                            analytics.upcomingConsultations.map((consultation) => (
                                <ConsultationItem
                                    key={consultation.id}
                                    time={consultation.scheduledTime}
                                    clientName={
                                        consultation.applicant
                                            ? `${consultation.applicant.firstName || ""} ${consultation.applicant.lastName || ""}`.trim() || "Client"
                                            : "Client"
                                    }
                                    clientEmail={consultation.applicant?.email || "No email"}
                                />
                            ))
                        )}
                    </div>
                </div>

                {/* Overdue Tasks */}
                <div className="rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <AlertTriangle size={20} className="text-amber-400" />
                            Overdue Tasks
                        </h3>
                        <span className="text-xs text-red-400">{analytics.overdueTasks.length} overdue</span>
                    </div>
                    <div className="space-y-3">
                        {analytics.overdueTasks.length === 0 ? (
                            <p className="text-sm text-slate-500 text-center py-4">No overdue tasks 🎉</p>
                        ) : (
                            analytics.overdueTasks.map((task) => (
                                <TaskItem
                                    key={task.id}
                                    title={task.title}
                                    dueDate={task.dueDate}
                                    isOverdue
                                />
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Revenue Chart */}
            <RevenueChart />

            {/* Performance Summary */}
            <div className="rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <BarChart3 size={20} className="text-emerald-400" />
                    Performance Summary
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 rounded-xl bg-slate-800/50">
                        <p className="text-2xl font-bold text-emerald-400">
                            {analytics.applications.approved > 0
                                ? Math.round((analytics.applications.approved / analytics.applications.total) * 100)
                                : 0}%
                        </p>
                        <p className="text-xs text-slate-500 mt-1">Approval Rate</p>
                    </div>
                    <div className="text-center p-4 rounded-xl bg-slate-800/50">
                        <p className="text-2xl font-bold text-blue-400">
                            {analytics.consultations.completed > 0
                                ? Math.round((analytics.consultations.completed / analytics.consultations.total) * 100)
                                : 0}%
                        </p>
                        <p className="text-xs text-slate-500 mt-1">Consultation Rate</p>
                    </div>
                    <div className="text-center p-4 rounded-xl bg-slate-800/50">
                        <p className="text-2xl font-bold text-purple-400">
                            {analytics.tasks.completed > 0
                                ? Math.round((analytics.tasks.completed / analytics.tasks.total) * 100)
                                : 0}%
                        </p>
                        <p className="text-xs text-slate-500 mt-1">Task Completion</p>
                    </div>
                    <div className="text-center p-4 rounded-xl bg-slate-800/50">
                        <p className="text-2xl font-bold text-amber-400">
                            {analytics.revenue.paid > 0
                                ? Math.round((analytics.revenue.paid / analytics.revenue.totalAmount) * 100)
                                : 0}%
                        </p>
                        <p className="text-xs text-slate-500 mt-1">Collection Rate</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
