import React, { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { LiveButton } from "@/components/ui/live-elements";
import { Printer, Download, X, Briefcase, Minus } from "lucide-react";

interface InvoiceItem {
    description: string;
    amount: string;
}

interface Invoice {
    id: string;
    amount: string;
    status: string;
    dueDate?: string;
    createdAt: string;
    items: InvoiceItem[];
    applicant?: {
        firstName?: string;
        lastName?: string;
        email: string;
    };
}

interface InvoiceViewerProps {
    invoice: Invoice | null;
    open: boolean;
    onClose: () => void;
    lawyer: { firstName?: string; lastName?: string; email: string; } | null;
}

type TemplateType = "modern" | "classic" | "bold";

export default function InvoiceViewer({ invoice, open, onClose, lawyer }: InvoiceViewerProps) {
    const [template, setTemplate] = useState<TemplateType>("modern");

    if (!invoice) return null;

    const handlePrint = () => {
        window.print();
    };

    const getTemplateStyles = () => {
        switch (template) {
            case "classic":
                return {
                    font: "font-serif",
                    header: "border-b-2 border-slate-900 pb-6",
                    accent: "bg-slate-900 text-white",
                    tableHead: "border-b border-slate-300 text-slate-600",
                };
            case "bold":
                return {
                    font: "font-sans",
                    header: "bg-slate-900 text-white p-8 -mx-8 -mt-8 mb-8",
                    accent: "text-brand-600",
                    tableHead: "bg-slate-100 text-slate-700 uppercase tracking-wider",
                };
            default: // modern
                return {
                    font: "font-sans",
                    header: "border-b border-slate-100 pb-6",
                    accent: "text-brand-600",
                    tableHead: "text-slate-500 uppercase text-xs tracking-wider",
                };
        }
    };

    const styles = getTemplateStyles();

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-50 dark:bg-slate-900 p-0 gap-0 border-none sm:rounded-2xl">
                {/* Visual Header / Controls - Hidden on print */}
                <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 no-print sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-slate-500">Template:</span>
                        <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                            {(["modern", "classic", "bold"] as TemplateType[]).map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setTemplate(t)}
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all ${template === t
                                            ? "bg-white dark:bg-slate-600 text-brand-600 shadow-sm"
                                            : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                        }`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <LiveButton variant="primary" icon={Printer} onClick={handlePrint}>
                            Print / PDF
                        </LiveButton>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Printable Content Wrapper */}
                <div className="p-8 md:p-12 overflow-x-auto bg-slate-50 dark:bg-slate-950 flex justify-center">
                    <div
                        id="invoice-content"
                        className={`printable-content bg-white text-slate-900 shadow-lg w-full max-w-[210mm] min-h-[297mm] p-12 md:p-16 relative ${styles.font}`}
                    >
                        {/* Header */}
                        <div className={`flex justify-between items-start mb-12 ${styles.header}`}>
                            <div>
                                {template === "bold" ? (
                                    <h1 className="text-4xl font-black mb-2">INVOICE</h1>
                                ) : (
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${template === 'classic' ? 'bg-slate-900 text-white' : 'bg-brand-600 text-white'}`}>
                                            <Briefcase size={18} />
                                        </div>
                                        <span className="font-bold text-xl tracking-tight">ImmigrationAI</span>
                                    </div>
                                )}
                                <p className="text-sm opacity-70">
                                    Invoice #{invoice.id.slice(0, 8).toUpperCase()}
                                </p>
                                <p className="text-sm opacity-70">
                                    Date: {new Date(invoice.createdAt).toLocaleDateString()}
                                </p>
                                {invoice.dueDate && (
                                    <p className="text-sm opacity-70">
                                        Due: {new Date(invoice.dueDate).toLocaleDateString()}
                                    </p>
                                )}
                            </div>
                            <div className="text-right">
                                <h3 className="font-bold text-lg mb-1">
                                    {lawyer?.firstName} {lawyer?.lastName}
                                </h3>
                                <p className="text-sm text-slate-500">{lawyer?.email}</p>
                            </div>
                        </div>

                        {/* Bill To */}
                        <div className="mb-12">
                            <h4 className="text-xs uppercase font-bold text-slate-400 mb-2">Bill To</h4>
                            <p className="text-xl font-bold">
                                {invoice.applicant?.firstName} {invoice.applicant?.lastName}
                            </p>
                            <p className="text-slate-500">{invoice.applicant?.email}</p>
                        </div>

                        {/* Items Table */}
                        <table className="w-full mb-12">
                            <thead>
                                <tr className={styles.tableHead}>
                                    <th className="text-left py-3 px-2">Description</th>
                                    <th className="text-right py-3 px-2">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {invoice.items.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="py-4 px-2">{item.description || "Service Fee"}</td>
                                        <td className="py-4 px-2 text-right font-medium">
                                            ${parseFloat(item.amount).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Totals */}
                        <div className="flex justify-end border-t border-slate-200 pt-8">
                            <div className="w-64 space-y-3">
                                <div className="flex justify-between text-slate-500">
                                    <span>Subtotal</span>
                                    <span>${parseFloat(invoice.amount).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-slate-500">
                                    <span>Tax (0%)</span>
                                    <span>$0.00</span>
                                </div>
                                <div className={`flex justify-between text-xl font-bold pt-4 border-t border-slate-200 ${styles.accent}`}>
                                    <span>Total</span>
                                    <span>${parseFloat(invoice.amount).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="absolute bottom-12 left-16 right-16 text-center text-xs text-slate-400">
                            <p>Thank you for your business.</p>
                            <p className="mt-1">Please make payment by the due date.</p>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
