// Enhanced Financials Dashboard for Lawyers
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useI18n } from '@/lib/i18n';
import { apiRequest } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    DollarSign,
    TrendingUp,
    TrendingDown,
    Calendar,
    Download,
    Eye,
    ArrowUpRight,
    CreditCard,
    PieChart,
    BarChart3
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

interface FinancialStats {
    totalRevenue: number;
    monthlyRevenue: number;
    pendingPayments: number;
    completedCases: number;
    averagePerCase: number;
    growth: number;
}

interface Transaction {
    id: string;
    date: string;
    clientName: string;
    type: 'payment' | 'refund' | 'fee';
    amount: number;
    status: 'completed' | 'pending' | 'failed';
    description: string;
}

export function EnhancedFinancials() {
    const { t } = useI18n();
    const [dateRange, setDateRange] = useState<'week' | 'month' | 'year'>('month');

    // Fetch financial data
    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['/financials/stats', dateRange],
        queryFn: () => apiRequest<FinancialStats>(`/financials/stats?range=${dateRange}`),
    });

    const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
        queryKey: ['/financials/transactions', dateRange],
        queryFn: () => apiRequest<Transaction[]>(`/financials/transactions?range=${dateRange}`),
    });

    const statCards = [
        {
            title: 'Total Revenue',
            value: `$${stats?.totalRevenue?.toLocaleString() || 0}`,
            change: stats?.growth || 0,
            icon: DollarSign,
            color: 'from-green-600 to-emerald-500'
        },
        {
            title: 'This Month',
            value: `$${stats?.monthlyRevenue?.toLocaleString() || 0}`,
            change: 12.5,
            icon: TrendingUp,
            color: 'from-blue-600 to-cyan-500'
        },
        {
            title: 'Pending Payments',
            value: `$${stats?.pendingPayments?.toLocaleString() || 0}`,
            change: -5.2,
            icon: CreditCard,
            color: 'from-orange-600 to-amber-500'
        },
        {
            title: 'Avg Per Case',
            value: `$${stats?.averagePerCase?.toLocaleString() || 0}`,
            change: 8.3,
            icon: PieChart,
            color: 'from-purple-600 to-violet-500'
        },
    ];

    const statusColors = {
        completed: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
        pending: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
        failed: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white">
                        Financial Dashboard
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        Track revenue, payments, and financial analytics
                    </p>
                </div>
                <div className="flex gap-3">
                    <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                        {(['week', 'month', 'year'] as const).map((range) => (
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
                    <Button className="bg-brand-600 hover:bg-brand-700">
                        <Download className="w-4 h-4 mr-2" />
                        Export Report
                    </Button>
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

            {/* Transactions Table */}
            <Card className="glass-card p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Recent Transactions</h2>
                    <Button variant="outline">
                        <BarChart3 className="w-4 h-4 mr-2" />
                        View Analytics
                    </Button>
                </div>

                {transactionsLoading ? (
                    <div className="text-center py-12 text-slate-500">Loading transactions...</div>
                ) : transactions.length === 0 ? (
                    <div className="text-center py-12">
                        <DollarSign className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-600 dark:text-slate-400">No transactions yet</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 dark:text-slate-400">Date</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 dark:text-slate-400">Client</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 dark:text-slate-400">Description</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 dark:text-slate-400">Amount</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 dark:text-slate-400">Status</th>
                                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600 dark:text-slate-400">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((transaction, idx) => (
                                    <tr
                                        key={transaction.id}
                                        className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                    >
                                        <td className="py-4 px-4">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-slate-400" />
                                                <span className="text-sm text-slate-900 dark:text-white">
                                                    {format(new Date(transaction.date), 'MMM d, yyyy')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 text-sm font-semibold text-slate-900 dark:text-white">
                                            {transaction.clientName}
                                        </td>
                                        <td className="py-4 px-4 text-sm text-slate-600 dark:text-slate-400">
                                            {transaction.description}
                                        </td>
                                        <td className="py-4 px-4">
                                            <span className={`text-sm font-bold ${transaction.type === 'refund' ? 'text-red-600' : 'text-green-600'
                                                }`}>
                                                {transaction.type === 'refund' ? '-' : '+'}${transaction.amount.toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[transaction.status]}`}>
                                                {transaction.status}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4 text-right">
                                            <Button variant="ghost" size="sm">
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
}
