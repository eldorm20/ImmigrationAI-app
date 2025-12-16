import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line
} from "recharts";
import {
    TrendingUp, Users, DollarSign, Building2, Download, RefreshCw,
    ArrowLeft, Search
} from "lucide-react";
import { LiveButton, AnimatedCard } from "@/components/ui/live-elements";
import { useLocation } from "wouter";

export default function AdminAnalyticsPage() {
    const { user } = useAuth();
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const { t } = useI18n();

    const [revenueData, setRevenueData] = useState<any>(null);
    const [overviewData, setOverviewData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [revRes, ovRes] = await Promise.all([
                apiRequest<any>("/admin/revenue/analytics"),
                apiRequest<any>("/admin/overview")
            ]);
            setRevenueData(revRes);
            setOverviewData(ovRes);
        } catch (error) {
            console.error(error);
            toast({
                title: "Error fetching data",
                description: "Could not load analytics data",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    if (!user || user.role !== "admin") {
        return <div className="p-8 text-center text-red-500">Access Denied</div>;
    }

    const chartData = revenueData?.monthlyRevenue || [];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-12 pt-24">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <LiveButton variant="ghost" onClick={() => setLocation("/admin")} icon={ArrowLeft} className="mb-2 pl-0">
                            Back to Dashboard
                        </LiveButton>
                        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
                            Platform Analytics
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400">
                            Revenue, Tenants, and Usage Metrics
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <LiveButton variant="secondary" icon={RefreshCw} onClick={fetchData} loading={loading}>
                            Refresh
                        </LiveButton>
                        <LiveButton variant="outline" icon={Download} onClick={() => toast({ title: "Exporting report..." })}>
                            Export CSV
                        </LiveButton>
                    </div>
                </div>

                {/* Global Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        title="Total Revenue"
                        value={`$${revenueData?.revenue?.total?.toLocaleString() || "0"}`}
                        icon={DollarSign}
                        color="text-green-600"
                        bg="bg-green-100 dark:bg-green-900/30"
                    />
                    <StatCard
                        title="Active Companies"
                        value={overviewData?.overview?.activeCompanies || 0}
                        subtitle={`of ${overviewData?.overview?.totalCompanies || 0} total`}
                        icon={Building2}
                        color="text-blue-600"
                        bg="bg-blue-100 dark:bg-blue-900/30"
                    />
                    <StatCard
                        title="Total Users"
                        value={overviewData?.overview?.totalUsers || 0}
                        icon={Users}
                        color="text-purple-600"
                        bg="bg-purple-100 dark:bg-purple-900/30"
                    />
                    <StatCard
                        title="Active Subscriptions"
                        value={overviewData?.overview?.activeSubscriptions || 0}
                        icon={TrendingUp}
                        color="text-orange-600"
                        bg="bg-orange-100 dark:bg-orange-900/30"
                    />
                </div>

                {/* Revenue Chart */}
                <div className="grid lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                        <h3 className="text-xl font-bold mb-6 text-slate-900 dark:text-white flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-green-500" />
                            Revenue Trends
                        </h3>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                        cursor={{ fill: 'transparent' }}
                                    />
                                    <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Top Companies / Tenants */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                        <h3 className="text-xl font-bold mb-6 text-slate-900 dark:text-white flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-blue-500" />
                            Top Tenants
                        </h3>
                        <div className="space-y-4">
                            {/* Fallback layout if no tenants API detail yet, waiting for /stats/tenants connection */}
                            <div className="flex flex-col items-center justify-center h-[200px] text-slate-400">
                                <Building2 size={48} className="mb-2 opacity-20" />
                                <p>Tenant performance detail coming soon</p>
                                <LiveButton variant="ghost" size="sm" onClick={() => setLocation('/admin/users')}>View All Users</LiveButton>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

function StatCard({ title, value, icon: Icon, subtitle, color, bg }: any) {
    return (
        <AnimatedCard className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</p>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{value}</span>
                    </div>
                    {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
                </div>
                <div className={`p-3 rounded-xl ${bg}`}>
                    <Icon className={`w-6 h-6 ${color}`} />
                </div>
            </div>
        </AnimatedCard>
    );
}
