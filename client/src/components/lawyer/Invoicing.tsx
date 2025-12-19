import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { LiveButton, AnimatedCard } from '@/components/ui/live-elements';
import { Plus, Download, DollarSign, CheckCircle, Clock, FileText, Send } from 'lucide-react';
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
        notes: ''
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

    const markPaid = async (id: string) => {
        try {
            await apiRequest(`/invoices/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ status: 'paid' })
            });
            toast({ title: 'Marked as paid' });
            // Update local state optimistic
            setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: 'paid' } : inv));
        } catch (err) {
            toast({ title: 'Failed to update', variant: 'destructive' });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Invoices & Billing</h2>
                <LiveButton onClick={() => setShowCreate(true)} icon={Plus}>
                    New Invoice
                </LiveButton>
            </div>

            {showCreate && (
                <AnimatedCard className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
                    <h3 className="font-bold mb-4">Create New Invoice</h3>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <input
                                placeholder="Client ID (for demo, manual entry)"
                                className="p-2 border rounded bg-transparent"
                                value={newInvoice.clientId}
                                onChange={e => setNewInvoice({ ...newInvoice, clientId: e.target.value })}
                            />
                            <input
                                placeholder="Invoice Number"
                                className="p-2 border rounded bg-transparent"
                                value={newInvoice.number}
                                onChange={e => setNewInvoice({ ...newInvoice, number: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold">Line Items</label>
                            {newInvoice.items.map((item, i) => (
                                <div key={i} className="flex gap-2">
                                    <input
                                        placeholder="Description"
                                        className="flex-1 p-2 border rounded bg-transparent"
                                        value={item.description}
                                        onChange={e => updateItem(i, 'description', e.target.value)}
                                    />
                                    <input
                                        type="number"
                                        placeholder="Qty"
                                        className="w-20 p-2 border rounded bg-transparent"
                                        value={item.quantity}
                                        onChange={e => updateItem(i, 'quantity', Number(e.target.value))}
                                    />
                                    <input
                                        type="number"
                                        placeholder="Rate"
                                        className="w-24 p-2 border rounded bg-transparent"
                                        value={item.rate}
                                        onChange={e => updateItem(i, 'rate', Number(e.target.value))}
                                    />
                                    <div className="w-24 p-2 font-bold text-right">${item.amount}</div>
                                </div>
                            ))}
                            <button
                                className="text-sm text-brand-600 font-bold"
                                onClick={() => setNewInvoice({
                                    ...newInvoice,
                                    items: [...newInvoice.items, { description: '', quantity: 1, rate: 0, amount: 0 }]
                                })}
                            >
                                + Add Item
                            </button>
                        </div>

                        <div className="flex justify-end gap-2 mt-4">
                            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-slate-500">Cancel</button>
                            <LiveButton onClick={handleCreate} icon={Send}>Create & Send</LiveButton>
                        </div>
                    </div>
                </AnimatedCard>
            )}

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-bold uppercase text-xs">
                        <tr>
                            <th className="px-6 py-4">Number</th>
                            <th className="px-6 py-4">Client</th>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Amount</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {loading ? (
                            <tr><td colSpan={6} className="p-8 text-center">Loading invoices...</td></tr>
                        ) : invoices.length === 0 ? (
                            <tr><td colSpan={6} className="p-8 text-center text-slate-500">No invoices found</td></tr>
                        ) : (
                            invoices.map(inv => (
                                <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <td className="px-6 py-4 font-bold">{inv.number}</td>
                                    <td className="px-6 py-4">{inv.clientId}</td>
                                    <td className="px-6 py-4">{new Date(inv.issueDate).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 font-bold text-lg">${Number(inv.amount).toFixed(2)}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${inv.status === 'paid' ? 'bg-green-100 text-green-700' :
                                            inv.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                                                'bg-slate-100 text-slate-700'
                                            }`}>
                                            {inv.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {inv.status !== 'paid' && (
                                            <button
                                                onClick={() => markPaid(inv.id)}
                                                className="text-green-600 font-bold text-xs hover:underline mr-2"
                                            >
                                                Mark Paid
                                            </button>
                                        )}
                                        <button className="text-slate-400 hover:text-brand-600">
                                            <Download size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
