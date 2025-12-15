import React, { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useLocation } from "wouter";
import { CreditCard, LogOut, Download, Eye, Filter, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { LiveButton, AnimatedCard } from "@/components/ui/live-elements";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const mockPaymentHistory = [
  {
    id: "PAY-001",
    date: new Date(2024, 11, 15),
    amount: 29.00,
    plan: "Professional Plan",
    status: "paid",
    method: "Credit Card",
    invoice: "INV-2024-001",
  },
  {
    id: "PAY-002",
    date: new Date(2024, 10, 15),
    amount: 29.00,
    plan: "Professional Plan",
    status: "paid",
    method: "Credit Card",
    invoice: "INV-2024-002",
  },
  {
    id: "PAY-003",
    date: new Date(2024, 9, 15),
    amount: 29.00,
    plan: "Professional Plan",
    status: "paid",
    method: "Credit Card",
    invoice: "INV-2024-003",
  },
  {
    id: "PAY-004",
    date: new Date(2024, 8, 15),
    amount: 99.00,
    plan: "Enterprise Plan",
    status: "paid",
    method: "Bank Transfer",
    invoice: "INV-2024-004",
  },
  {
    id: "PAY-005",
    date: new Date(2024, 7, 15),
    amount: 99.00,
    plan: "Enterprise Plan",
    status: "paid",
    method: "Bank Transfer",
    invoice: "INV-2024-005",
  },
  {
    id: "PAY-006",
    date: new Date(2024, 6, 15),
    amount: 0.00,
    plan: "Free Plan",
    status: "completed",
    method: "N/A",
    invoice: "N/A",
  },
];

export default function PaymentHistoryPage() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const [payments, setPayments] = useState(mockPaymentHistory);
  const [filter, setFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');

  if (!user) return null;

  let filteredPayments = payments.filter((p) => {
    if (filter === 'paid') return p.status === 'paid';
    if (filter === 'pending') return p.status !== 'paid';
    return true;
  });

  if (sortBy === 'date_desc') {
    filteredPayments.sort((a, b) => b.date.getTime() - a.date.getTime());
  } else if (sortBy === 'date_asc') {
    filteredPayments.sort((a, b) => a.date.getTime() - b.date.getTime());
  } else if (sortBy === 'amount_desc') {
    filteredPayments.sort((a, b) => b.amount - a.amount);
  } else if (sortBy === 'amount_asc') {
    filteredPayments.sort((a, b) => a.amount - b.amount);
  }

  const totalSpent = payments.filter((p) => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 px-6 py-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <motion.div
            className="flex items-center gap-3 font-extrabold text-2xl tracking-tight cursor-pointer"
            onClick={() => setLocation("/dashboard")}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-brand-600 to-brand-400 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20 text-white">
              <CreditCard size={20} />
            </div>
            <span className="text-slate-900 dark:text-white">Payment History</span>
          </motion.div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <LiveButton variant="ghost" onClick={() => { logout(); setLocation("/"); }} className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20">
              <LogOut size={18} />
              {t.dash.logout}
            </LiveButton>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-6 lg:p-12">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">Total Spent</p>
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white">${totalSpent.toFixed(2)}</h3>
            <p className="text-green-600 text-sm mt-2">On {payments.filter((p) => p.status === 'paid').length} payments</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">Current Plan</p>
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white">Professional</h3>
            <p className="text-blue-600 text-sm mt-2">Renews on Dec 15, 2024</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">Last Payment</p>
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white">$29.00</h3>
            <p className="text-slate-500 text-sm mt-2">{new Date(2024, 11, 15).toLocaleDateString()}</p>
          </motion.div>
        </div>

        {/* Filters and Controls */}
        <AnimatedCard className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Payment History</h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm">Track all your subscription and service payments</p>
            </div>
            <LiveButton variant="primary" icon={Download}>
              Download Statements
            </LiveButton>
          </div>

          <div className="flex flex-col md:flex-row gap-4 pb-6">
            {/* Status Filter */}
            <div className="flex gap-2">
              {[
                { id: 'all', label: 'All Payments' },
                { id: 'paid', label: 'Paid' },
                { id: 'pending', label: 'Pending' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id as any)}
                  className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                    filter === f.id
                      ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg font-bold text-sm outline-none border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            >
              <option value="date_desc">Date (Newest)</option>
              <option value="date_asc">Date (Oldest)</option>
              <option value="amount_desc">Amount (High to Low)</option>
              <option value="amount_asc">Amount (Low to High)</option>
            </select>
          </div>
        </AnimatedCard>

        {/* Payments Table */}
        <AnimatedCard>
          {filteredPayments.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <CreditCard size={48} className="mx-auto mb-4 opacity-30" />
              <p>No payments found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-4 px-6 font-bold text-slate-600 dark:text-slate-400 text-sm">Date</th>
                    <th className="text-left py-4 px-6 font-bold text-slate-600 dark:text-slate-400 text-sm">Plan</th>
                    <th className="text-left py-4 px-6 font-bold text-slate-600 dark:text-slate-400 text-sm">Amount</th>
                    <th className="text-left py-4 px-6 font-bold text-slate-600 dark:text-slate-400 text-sm">Method</th>
                    <th className="text-left py-4 px-6 font-bold text-slate-600 dark:text-slate-400 text-sm">Status</th>
                    <th className="text-left py-4 px-6 font-bold text-slate-600 dark:text-slate-400 text-sm">Invoice</th>
                    <th className="text-right py-4 px-6 font-bold text-slate-600 dark:text-slate-400 text-sm">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((payment, idx) => (
                    <motion.tr
                      key={payment.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold">
                          <Calendar size={16} className="text-slate-400" />
                          {payment.date.toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-slate-900 dark:text-white font-bold">{payment.plan}</td>
                      <td className="py-4 px-6 text-slate-900 dark:text-white font-bold">${payment.amount.toFixed(2)}</td>
                      <td className="py-4 px-6 text-slate-600 dark:text-slate-400">{payment.method}</td>
                      <td className="py-4 px-6">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${
                            payment.status === 'paid'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                              : payment.status === 'completed'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                          }`}
                        >
                          {(() => {
                            const st = String(payment?.status || "");
                            if (!st) return "Unknown";
                            try { return st.charAt(0).toUpperCase() + st.slice(1); } catch { return String(st); }
                          })()}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-600 dark:text-slate-400 font-mono text-sm">{payment.invoice}</td>
                      <td className="py-4 px-6 text-right">
                        <LiveButton
                          variant="ghost"
                          icon={Download}
                          className="text-blue-600 hover:text-blue-700"
                          onClick={() => alert(`Downloading ${payment.invoice}`)}
                        >
                          PDF
                        </LiveButton>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AnimatedCard>
      </div>
    </div>
  );
}
