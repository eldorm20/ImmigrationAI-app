// Advanced Analytics Dashboard for Lawyers
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { useI18n } from '@/lib/i18n';
import {
    TrendingUp,
    TrendingDown,
    Users,
    DollarSign,
    FileText,
    CheckCircle2,
    Clock,
    Star,
    Activity,
    BarChart3,
    PieChart,
    Calendar,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
    LineChart,
    Line,
    AreaChart,
    Area,
    BarChart,
    Bar,
    PieChart as RechartsPie,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';

interface AnalyticsData {
    overview: {
        totalClients: number;
        activeClients: number;
        totalRevenue: number;
        avgCaseValue: number;
        successRate: number;
        clientSatisfaction: number;
    };
    revenue: Array<{ date: string; amount: number; cases: number }>;
    casesByType: Array<{ type: string; count: number; percentage: number }>;
    casesByStatus: Array<{ status: string; count: number }>;
    performance: {
        avgResponseTime: number; // hours
        avgCaseCompletion: number; // days
        documentTurnaround: number; // hours
    };
    clientAcquisition: Array<{ month: string; new: number; retained: number }>;
    topServices: Array<{ service: string; revenue: number; count: number }>;
}

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export function AdvancedAnalytics() {
    const { t } = useI18n();
    const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

    const { data: analytics, isLoading } = useQuery({
        queryKey: ['/analytics/lawyer', dateRange],
        queryFn: () => apiRequest<AnalyticsData>(`/analytics/lawyer?range=${dateRange}`),
    });

    if (isLoading) {
        return <div className="text-center py-12">Loading analytics...</div>;
    }

    if (!analytics || !analytics.overview) {
        return <div className="text-center py-12 text-slate-500">No analytics data available yet. Start managing cases to see insights.</div>;
    }

    const { overview, revenue = [], casesByType = [], casesByStatus = [], performance, clientAcquisition = [], topServices = [] } = analytics;

    const statCards = [
        {
            title: 'Total Clients',
            value: overview.totalClients,
            change: 12.5,
            icon: Users,
            color: 'from-blue-600 to-cyan-500',
        },
        {
            title: 'Active Cases',
            value: overview.activeClients,
            change: 8.2,
            icon: Activity,
            color: 'from-green-600 to-emerald-500',
        },
        {
            title: 'Total Revenue',
            value: `$${overview.totalRevenue.toLocaleString()}`,
            change: 15.7,
            icon: DollarSign,
            color: 'from-purple-600 to-violet-500',
        },
        {
            title: 'Success Rate',
            value: `${overview.successRate}%`,
            change: 3.2,
            icon: CheckCircle2,
            color: 'from-orange-600 to-amber-500',
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white">Analytics Dashboard</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        Comprehensive insights into your practice performance
                    </p>
                </div>
                <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                    {(['week', 'month', 'quarter', 'year'] as const).map((range) => (
                        <button
                            key={range}
                            onClick={() => setDateRange(range)}
                            className={`px-4 py-2 rounded-md font-semibold text-sm transition-all ${dateRange === range
                                ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-sm'
                                : 'text-slate-600 dark:text-slate-400'
                                }`}
                        >
                            {range.charAt(0).toUpperCase() + range.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat, idx) => {
                    const Icon = stat.icon;
                    const isPositive = stat.change >= 0;

                    return (
                        <motion.div
                            key={stat.title}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                        >
                            <Card className="glass-card p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                                        <Icon className="w-6 h-6 text-white" />
                                    </div>
                                    <div className={`flex items-center gap-1 text-sm font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                        {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                        {Math.abs(stat.change).toFixed(1)}%
                                    </div>
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{stat.title}</p>
                                <p className="text-2xl font-black text-slate-900 dark:text-white">{stat.value}</p>
                            </Card>
                        </motion.div>
                    );
                })}
            </div>

            {/* Revenue Chart */}
            <Card className="glass-card p-6">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-brand-600" />
                    Revenue Trend
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={revenue}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="date" stroke="#6b7280" />
                        <YAxis stroke="#6b7280" />
                        <Tooltip />
                        <Area type="monotone" dataKey="amount" stroke="#2563eb" fill="#2563eb" fillOpacity={0.2} />
                    </AreaChart>
                </ResponsiveContainer>
            </Card>

            {/* Cases Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Cases by Type */}
                <Card className="glass-card p-6">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <PieChart className="w-5 h-5 text-brand-600" />
                        Cases by Type
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <RechartsPie>
                            <Pie
                                data={casesByType}
                                dataKey="count"
                                nameKey="type"
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                label
                            >
                                {casesByType.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </RechartsPie>
                    </ResponsiveContainer>
                </Card>

                {/* Cases by Status */}
                <Card className="glass-card p-6">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-brand-600" />
                        Cases by Status
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={casesByStatus}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="status" stroke="#6b7280" />
                            <YAxis stroke="#6b7280" />
                            <Tooltip />
                            <Bar dataKey="count" fill="#2563eb" />
                        </BarChart>
                    </ResponsiveContainer>
                </Card>
            </div>

            {/* Performance Metrics */}
            <Card className="glass-card p-6">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-brand-600" />
                    Performance Metrics
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                        <p className="text-4xl font-black text-brand-600">{performance.avgResponseTime}h</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">Avg Response Time</p>
                    </div>
                    <div className="text-center">
                        <p className="text-4xl font-black text-green-600">{performance.avgCaseCompletion}d</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">Avg Case Completion</p>
                    </div>
                    <div className="text-center">
                        <p className="text-4xl font-black text-purple-600">{performance.documentTurnaround}h</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">Document Turnaround</p>
                    </div>
                </div>
            </Card>

            {/* Client Acquisition */}
            <Card className="glass-card p-6">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <Users className="w-5 h-5 text-brand-600" />
                    Client Acquisition
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={clientAcquisition}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="month" stroke="#6b7280" />
                        <YAxis stroke="#6b7280" />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="new" stroke="#2563eb" strokeWidth={2} />
                        <Line type="monotone" dataKey="retained" stroke="#10b981" strokeWidth={2} />
                    </LineChart>
                </ResponsiveContainer>
            </Card>

            {/* Top Services */}
            <Card className="glass-card p-6">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <Star className="w-5 h-5 text-brand-600" />
                    Top Services
                </h3>
                <div className="space-y-4">
                    {topServices.map((service, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                            <div className="flex-1">
                                <p className="font-semibold text-slate-900 dark:text-white">{service.service}</p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">{service.count} cases</p>
                            </div>
                            <div className="text-right">
                                <p className="text-lg font-bold text-green-600">${service.revenue.toLocaleString()}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}
