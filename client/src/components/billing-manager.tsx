import React, { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
    Plus, DollarSign, FileText, Send,
    CheckCircle, XCircle, MoreVertical,
    Download, Filter, Search
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LiveButton, AnimatedCard } from "@/components/ui/live-elements";

interface Invoice {
    id: string;
    applicantId: string;
    amount: string;
    currency: string;
    status: "draft" | "sent" | "paid" | "void" | "overdue";
    dueDate?: string;
    items: any[];
    createdAt: string;
    applicant?: {
        firstName?: string;
        lastName?: string;
        email: string;
    };
}

export default function BillingManager() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [clients, setClients] = useState<any[]>([]);

    const [newInvoice, setNewInvoice] = useState({
        applicantId: "",
        amount: "0",
        currency: "USD",
        items: [{ description: "", amount: "0" }],
        dueDate: ""
    });

    const { toast } = useToast();

    const fetchData = async () => {
        try {
            setLoading(true);
            const [invoiceData, clientData] = await Promise.all([
                apiRequest<Invoice[]>("/invoices"),
                apiRequest<any[]>("/applications/clients/list")
            ]);

            // Need to fetch user details for each invoice if not returned
            const invoicesWithClients = await Promise.all((invoiceData || []).map(async (inv) => {
                try {
                    const client = await apiRequest<any>(`/users/${inv.applicantId}`);
                    return { ...inv, applicant: client };
                } catch {
                    return inv;
                }
            }));

            setInvoices(invoicesWithClients);
            setClients((clientData || []).filter(u => u.role === 'applicant'));
        } catch (err) {
            toast({ title: "Error", description: "Failed to load billing data", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreateInvoice = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const total = newInvoice.items.reduce((sum, item) => sum + parseFloat(item.amount), 0);
            const created = await apiRequest<Invoice>("/invoices", {
                method: "POST",
                body: JSON.stringify({
                    ...newInvoice,
                    amount: total.toString(),
                    status: "draft",
                    dueDate: newInvoice.dueDate ? new Date(newInvoice.dueDate).toISOString() : null
                })
            });

            // Fetch applicant name for the new invoice
            const client = clients.find(c => c.id === created.applicantId);
            setInvoices([{ ...created, applicant: client }, ...invoices]);
            setIsModalOpen(false);
            setNewInvoice({ applicantId: "", amount: "0", currency: "USD", items: [{ description: "", amount: "0" }], dueDate: "" });
            toast({ title: "Success", description: "Invoice created" });
        } catch (err) {
            toast({ title: "Error", description: "Failed to create invoice", variant: "destructive" });
        }
    };

    const updateInvoiceStatus = async (id: string, status: Invoice["status"]) => {
        try {
            const updated = await apiRequest<Invoice>(`/invoices/${id}`, {
                method: "PATCH",
                body: JSON.stringify({ status })
            });
            setInvoices(invoices.map(inv => inv.id === id ? { ...inv, status: updated.status } : inv));
            toast({ title: "Updated", description: `Invoice marked as ${status}` });
        } catch (err) {
            toast({ title: "Error", description: "Failed to update invoice", variant: "destructive" });
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'paid': return 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-200';
            case 'sent': return 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200';
            case 'overdue': return 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border-red-200';
            default: return 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-200';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Financial Control</h2>
                    <p className="text-slate-500 text-sm">Manage billing, payments and accounts</p>
                </div>
                <LiveButton
                    variant="primary"
                    icon={Plus}
                    onClick={() => setIsModalOpen(true)}
                >
                    Create Invoice
                </LiveButton>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <AnimatedCard className="bg-gradient-to-br from-green-500 to-emerald-600 text-white border-none shadow-lg shadow-green-500/20">
                    <p className="text-xs uppercase font-bold opacity-80 mb-1">Total Paid</p>
                    <h3 className="text-3xl font-black">${invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + parseFloat(i.amount), 0).toLocaleString()}</h3>
                </AnimatedCard>
                <AnimatedCard className="bg-white dark:bg-slate-900">
                    <p className="text-xs uppercase font-bold text-slate-500 mb-1">Outstanding</p>
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white">${invoices.filter(i => i.status === 'sent' || i.status === 'overdue').reduce((sum, i) => sum + parseFloat(i.amount), 0).toLocaleString()}</h3>
                </AnimatedCard>
                <AnimatedCard className="bg-white dark:bg-slate-900">
                    <p className="text-xs uppercase font-bold text-slate-500 mb-1">Drafts</p>
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white">{invoices.filter(i => i.status === 'draft').length} Invoices</h3>
                </AnimatedCard>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase text-[10px] font-black tracking-widest">
                            <tr>
                                <th className="px-6 py-4">Invoice #</th>
                                <th className="px-6 py-4">Client</th>
                                <th className="px-6 py-4">Amount</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Due Date</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {invoices.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">No invoices issued yet.</td>
                                </tr>
                            ) : (
                                invoices.map(invoice => (
                                    <tr key={invoice.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-xs text-slate-400">#{invoice.id.slice(0, 8)}</td>
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-slate-900 dark:text-white">{invoice.applicant?.firstName || 'Client'} {invoice.applicant?.lastName}</p>
                                            <p className="text-[10px] text-slate-500">{invoice.applicant?.email}</p>
                                        </td>
                                        <td className="px-6 py-4 font-black text-slate-900 dark:text-white">${parseFloat(invoice.amount).toLocaleString()}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase border ${getStatusStyle(invoice.status)}`}>
                                                {invoice.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">
                                            {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                {invoice.status === 'draft' && (
                                                    <button
                                                        onClick={() => updateInvoiceStatus(invoice.id, 'sent')}
                                                        className="p-2 bg-brand-50 text-brand-600 rounded-lg hover:bg-brand-100 transition-colors"
                                                    >
                                                        <Send size={14} />
                                                    </button>
                                                )}
                                                {invoice.status === 'sent' && (
                                                    <button
                                                        onClick={() => updateInvoiceStatus(invoice.id, 'paid')}
                                                        className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                                                    >
                                                        <CheckCircle size={14} />
                                                    </button>
                                                )}
                                                <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
                                                    <Download size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* New Invoice Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold">New Invoice</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateInvoice} className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Target Client</label>
                            <select
                                required
                                value={newInvoice.applicantId}
                                onChange={e => setNewInvoice({ ...newInvoice, applicantId: e.target.value })}
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border-none outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                            >
                                <option value="">Select a client...</option>
                                {clients.map(c => (
                                    <option key={c.id} value={c.id}>{c.firstName} {c.lastName} ({c.email})</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-3">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex justify-between">
                                Line Items
                                <button
                                    type="button"
                                    onClick={() => setNewInvoice({ ...newInvoice, items: [...newInvoice.items, { description: "", amount: "0" }] })}
                                    className="text-brand-600 text-xs hover:underline"
                                >
                                    + Add Item
                                </button>
                            </label>
                            {newInvoice.items.map((item, idx) => (
                                <div key={idx} className="flex gap-2">
                                    <input
                                        placeholder="Description"
                                        value={item.description}
                                        onChange={e => {
                                            const newItems = [...newInvoice.items];
                                            newItems[idx].description = e.target.value;
                                            setNewInvoice({ ...newInvoice, items: newItems });
                                        }}
                                        className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg outline-none focus:ring-1 focus:ring-brand-500 text-sm"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Amount"
                                        value={item.amount}
                                        onChange={e => {
                                            const newItems = [...newInvoice.items];
                                            newItems[idx].amount = e.target.value;
                                            setNewInvoice({ ...newInvoice, items: newItems });
                                        }}
                                        className="w-24 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg outline-none focus:ring-1 focus:ring-brand-500 text-sm"
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Due Date</label>
                            <input
                                type="date"
                                value={newInvoice.dueDate}
                                onChange={e => setNewInvoice({ ...newInvoice, dueDate: e.target.value })}
                                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                            />
                        </div>

                        <div className="pt-6 flex items-center justify-between">
                            <div>
                                <p className="text-xs text-slate-500 uppercase font-bold">Total Amount</p>
                                <p className="text-2xl font-black text-slate-900 dark:text-white">
                                    ${newInvoice.items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0).toLocaleString()}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <LiveButton type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</LiveButton>
                                <LiveButton type="submit" variant="primary">Create Draft</LiveButton>
                            </div>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
