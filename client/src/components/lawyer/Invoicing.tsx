import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { LiveButton, AnimatedCard, GlassInput } from '@/components/ui/live-elements';
import { Plus, Download, DollarSign, CheckCircle, Clock, FileText, Send, Trash2, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Invoicing() {
    const { toast } = useToast();
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);

    // New invoice state
    const [newInvoice, setNewInvoice] = useState({
        clientId: '',
        number: `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
        items: [{ description: '', quantity: 1, rate: 0, amount: 0 }],
        notes: '',
        taxRate: '0',
        legalEntityName: '',
        inn: '',
        oked: '',
        mfo: ''
    });

    const fetchInvoices = async () => {
        try {
            const data = await apiRequest<any[]>('/invoices');
            setInvoices(data);
        } catch (err) {
            console.error(err);
            toast({ title: 'Failed to load invoices', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoices();
    }, []);

    const handleCreate = async () => {
        try {
            if (!newInvoice.clientId) {
                toast({ title: "Client ID required", variant: "destructive" });
                return;
            }

            await apiRequest('/invoices', {
                method: 'POST',
                body: JSON.stringify(newInvoice)
            });

            toast({ title: 'Invoice created' });
            setShowCreate(false);
            fetchInvoices();
        } catch (err) {
            toast({ title: 'Failed to create invoice', variant: 'destructive' });
        }
    };

    const updateItem = (index: number, field: string, value: any) => {
        const items = [...newInvoice.items];
        items[index] = { ...items[index], [field]: value };
        if (field === 'quantity' || field === 'rate') {
            items[index].amount = items[index].quantity * items[index].rate;
        }
        setNewInvoice({ ...newInvoice, items });
    };

    const handlePrint = (invoice: any) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            toast({ title: "Pop-up blocked", description: "Please allow pop-ups to print invoices", variant: "destructive" });
            return;
        }

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Invoice ${invoice.number}</title>
                <style>
                    body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; background: white; }
                    .header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; }
                    .logo { font-size: 28px; font-weight: 800; color: #3b82f6; letter-spacing: -0.025em; }
                    .invoice-details { text-align: right; }
                    .invoice-details h1 { margin: 0; color: #0f172a; font-size: 32px; }
                    .bill-to { margin-bottom: 40px; display: grid; grid-template-cols: 1fr 1fr; gap: 40px; }
                    .section-title { font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 8px; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                    th { text-align: left; border-bottom: 1px solid #e2e8f0; padding: 12px; color: #64748b; font-size: 12px; text-transform: uppercase; }
                    td { border-bottom: 1px solid #f1f5f9; padding: 12px; }
                    .totals-box { margin-left: auto; width: 300px; padding: 20px; background: #f8fafc; rounded: 12px; }
                    .total-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
                    .grand-total { font-size: 20px; font-weight: 800; color: #3b82f6; border-top: 2px solid #e2e8f0; margin-top: 12px; padding-top: 12px; }
                    .footer { margin-top: 60px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; pt: 20px; }
                    @media print {
                        body { padding: 0; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo">ImmigrationAI</div>
                    <div class="invoice-details">
                        <h1>INVOICE</h1>
                        <p>#${invoice.number}</p>
                        <p>Date: ${new Date(invoice.issueDate || Date.now()).toLocaleDateString()}</p>
                    </div>
                </div>

                <div class="bill-to">
                    <div>
                        <div class="section-title">Bill To:</div>
                        <p style="font-weight: 600; color: #0f172a;">Client ID: ${invoice.clientId}</p>
                    </div>
                    ${invoice.legalEntityName ? `
                    <div>
                        <div class="section-title">Fiscal Info:</div>
                        <p style="font-size: 14px;">
                            ${invoice.legalEntityName}<br/>
                            INN: ${invoice.inn || 'N/A'}<br/>
                            MFO: ${invoice.mfo || 'N/A'}<br/>
                            OKED: ${invoice.oked || 'N/A'}
                        </p>
                    </div>
                    ` : ''}
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th style="text-align: center;">Qty</th>
                            <th style="text-align: right;">Rate</th>
                            <th style="text-align: right;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${invoice.items?.map((item: any) => `
                            <tr>
                                <td style="font-weight: 500;">${item.description}</td>
                                <td style="text-align: center;">${item.quantity}</td>
                                <td style="text-align: right;">$${Number(item.rate).toFixed(2)}</td>
                                <td style="text-align: right; font-weight: 600;">$${Number(item.amount).toFixed(2)}</td>
                            </tr>
                        `).join('') || ''}
                    </tbody>
                </table>

                <div class="totals-box">
                    <div class="total-row">
                        <span>Subtotal:</span>
                        <span>$${Number(invoice.amount).toFixed(2)}</span>
                    </div>
                    ${invoice.taxRate && Number(invoice.taxRate) > 0 ? `
                    <div class="total-row">
                        <span>Tax (${invoice.taxRate}%):</span>
                        <span>$${(Number(invoice.amount) * (Number(invoice.taxRate) / 100)).toFixed(2)}</span>
                    </div>
                    <div class="total-row grand-total">
                        <span>Total:</span>
                        <span>$${(Number(invoice.amount) * (1 + Number(invoice.taxRate) / 100)).toFixed(2)}</span>
                    </div>
                    ` : `
                    <div class="total-row grand-total">
                        <span>Total:</span>
                        <span>$${Number(invoice.amount).toFixed(2)}</span>
                    </div>
                    `}
                </div>

                ${invoice.notes ? `
                <div style="margin-top: 40px;">
                    <div class="section-title">Notes:</div>
                    <p style="font-size: 14px; color: #475569;">${invoice.notes}</p>
                </div>
                ` : ''}

                <div class="footer">
                    <p>Thank you for choosing ImmigrationAI. For questions, contact support@immigrationai.com</p>
                    <p>&copy; 2025 ImmigrationAI | Digital Legal Solutions</p>
                </div>
                
                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
    };

    const markPaid = async (id: string) => {
        try {
            await apiRequest(`/invoices/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ status: 'paid' })
            });
            toast({ title: 'Payment Confirmed' });
            setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: 'paid' } : inv));
        } catch (err) {
            toast({ title: 'Failed to update', variant: 'destructive' });
        }
    };

    return (
        <div className="space-y-8 pb-12">
            <div className="flex justify-between items-center bg-white/30 dark:bg-slate-900/30 backdrop-blur-md p-6 rounded-3xl border border-white/20 dark:border-white/5 shadow-xl">
                <div>
                    <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Financial Hub</h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Manage billable hours, invoices, and payments</p>
                </div>
                <LiveButton onClick={() => setShowCreate(true)} icon={Plus} size="lg" className="rounded-2xl">
                    Create Invoice
                </LiveButton>
            </div>

            <AnimatePresence>
                {showCreate && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <AnimatedCard className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 border-brand-200/50 dark:border-brand-800/50 p-8 shadow-2xl">
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-blue-500">Draft New Invoice</h3>
                                <button onClick={() => setShowCreate(false)} className="hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-xl transition-colors">
                                    <Trash2 size={20} className="text-slate-400" />
                                </button>
                            </div>

                            <div className="grid lg:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Client Information</label>
                                        <GlassInput
                                            placeholder="Enter Client ID or Email"
                                            value={newInvoice.clientId}
                                            onChange={e => setNewInvoice({ ...newInvoice, clientId: e.target.value })}
                                            className="w-full"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Invoice Label</label>
                                        <GlassInput
                                            placeholder="Invoice Number"
                                            value={newInvoice.number}
                                            onChange={e => setNewInvoice({ ...newInvoice, number: e.target.value })}
                                            className="w-full"
                                        />
                                    </div>
                                </div>

                                <div className="bg-white/40 dark:bg-black/20 p-6 rounded-2xl border border-white/20 dark:border-white/5 space-y-4">
                                    <h4 className="text-sm font-bold flex items-center gap-2 text-brand-600 dark:text-brand-400">
                                        <Globe size={16} /> Uzbekistan Fiscal Parameters
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <GlassInput
                                            placeholder="Yuridik shaxs nomi"
                                            value={newInvoice.legalEntityName}
                                            onChange={e => setNewInvoice({ ...newInvoice, legalEntityName: e.target.value })}
                                            className="col-span-2"
                                        />
                                        <GlassInput
                                            type="number"
                                            placeholder="QQS (%)"
                                            value={newInvoice.taxRate}
                                            onChange={e => setNewInvoice({ ...newInvoice, taxRate: e.target.value })}
                                        />
                                        <GlassInput
                                            placeholder="INN (STIR)"
                                            value={newInvoice.inn}
                                            onChange={e => setNewInvoice({ ...newInvoice, inn: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-10 space-y-4">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Line Items</label>
                                <div className="space-y-3">
                                    {newInvoice.items.map((item, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ x: -10, opacity: 0 }}
                                            animate={{ x: 0, opacity: 1 }}
                                            className="flex gap-4 items-center"
                                        >
                                            <GlassInput
                                                placeholder="Service description..."
                                                className="flex-1"
                                                value={item.description}
                                                onChange={e => updateItem(i, 'description', e.target.value)}
                                            />
                                            <GlassInput
                                                type="number"
                                                placeholder="Qty"
                                                className="w-24 text-center"
                                                value={item.quantity}
                                                onChange={e => updateItem(i, 'quantity', Number(e.target.value))}
                                            />
                                            <GlassInput
                                                type="number"
                                                placeholder="Rate"
                                                className="w-32"
                                                value={item.rate}
                                                onChange={e => updateItem(i, 'rate', Number(e.target.value))}
                                            />
                                            <div className="w-32 font-black text-right text-lg text-brand-600">
                                                ${item.amount.toLocaleString()}
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                                <button
                                    className="flex items-center gap-2 text-sm text-brand-600 dark:text-brand-400 font-bold hover:gap-3 transition-all mt-4 ml-1"
                                    onClick={() => setNewInvoice({
                                        ...newInvoice,
                                        items: [...newInvoice.items, { description: '', quantity: 1, rate: 0, amount: 0 }]
                                    })}
                                >
                                    <Plus size={16} /> Add service line
                                </button>
                            </div>

                            <div className="flex justify-end items-center gap-6 mt-12 border-t border-slate-100 dark:border-slate-800 pt-8">
                                <div className="text-right">
                                    <p className="text-xs font-bold text-slate-400 uppercase">Estimated Total</p>
                                    <p className="text-3xl font-black text-slate-900 dark:text-white">
                                        ${newInvoice.items.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <LiveButton variant="ghost" onClick={() => setShowCreate(false)} className="px-6">Cancel</LiveButton>
                                    <LiveButton onClick={handleCreate} icon={Send} size="lg" className="px-10">Send to Client</LiveButton>
                                </div>
                            </div>
                        </AnimatedCard>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid gap-6">
                <AnimatedCard className="p-0 border-none bg-white/40 dark:bg-slate-950/40 backdrop-blur-xl shadow-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                                    <th className="px-8 py-5 font-bold text-slate-500 uppercase text-[10px] tracking-[0.2em]">Reference</th>
                                    <th className="px-8 py-5 font-bold text-slate-500 uppercase text-[10px] tracking-[0.2em]">Client</th>
                                    <th className="px-8 py-5 font-bold text-slate-500 uppercase text-[10px] tracking-[0.2em]">Issued</th>
                                    <th className="px-8 py-5 font-bold text-slate-500 uppercase text-[10px] tracking-[0.2em]">Amount</th>
                                    <th className="px-8 py-5 font-bold text-slate-500 uppercase text-[10px] tracking-[0.2em]">Status</th>
                                    <th className="px-8 py-5 text-right font-bold text-slate-500 uppercase text-[10px] tracking-[0.2em]">Operations</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                                {loading ? (
                                    <tr><td colSpan={6} className="p-20 text-center text-slate-400 animate-pulse font-medium">Synchronizing documents...</td></tr>
                                ) : invoices.length === 0 ? (
                                    <tr><td colSpan={6} className="p-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <FileText size={48} className="text-slate-200 dark:text-slate-800" />
                                            <p className="text-slate-500 font-medium">No financial records found in your practice.</p>
                                        </div>
                                    </td></tr>
                                ) : (
                                    invoices.map((inv, idx) => (
                                        <motion.tr
                                            key={inv.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="group hover:bg-brand-50/30 dark:hover:bg-brand-900/10 transition-colors"
                                        >
                                            <td className="px-8 py-6 font-bold text-slate-900 dark:text-white">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600">
                                                        <FileText size={14} />
                                                    </div>
                                                    {inv.number}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">{inv.clientId}</div>
                                                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Case #${inv.applicationId || 'N/A'}</div>
                                            </td>
                                            <td className="px-8 py-6 text-slate-500 font-medium">{new Date(inv.issueDate || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                                            <td className="px-8 py-6">
                                                <span className="text-lg font-black text-slate-900 dark:text-white tabular-nums">${Number(inv.amount).toLocaleString()}</span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${inv.status === 'paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                    inv.status === 'sent' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                        'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                                                    }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${inv.status === 'paid' ? 'bg-green-500' : 'bg-current'}`} />
                                                    {inv.status}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-right space-x-2">
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {inv.status !== 'paid' && (
                                                        <button
                                                            onClick={() => markPaid(inv.id)}
                                                            className="p-2 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 hover:bg-green-100 transition-colors"
                                                            title="Confirm Payment"
                                                        >
                                                            <CheckCircle size={18} />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handlePrint(inv)}
                                                        className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-brand-600 transition-colors"
                                                        title="Export PDF"
                                                    >
                                                        <Download size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </AnimatedCard>
            </div>
        </div>
    );
}
