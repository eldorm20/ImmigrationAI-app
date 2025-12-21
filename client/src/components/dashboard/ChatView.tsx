import React, { useState, useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n";
import { apiRequest } from "@/lib/api";
import { LiveButton, AnimatedCard } from "@/components/ui/live-elements";
import { Send, Sparkles, User, Download, RefreshCw, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

export const ChatView = () => {
    const { t, lang } = useI18n();
    const { toast } = useToast();
    const [messages, setMessages] = useState<{ role: string; text: string; ts: string }[]>([]);
    const [input, setInput] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isTyping, setIsTyping] = useState(false);

    // Load history from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('ai_chat_history');
        if (saved) {
            try {
                setMessages(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse chat history", e);
            }
        } else {
            setMessages([{ role: 'ai', text: t.chat.greeting, ts: new Date().toISOString() }]);
        }
    }, [t.chat.greeting]);

    // Save history to localStorage whenever messages change
    useEffect(() => {
        if (messages.length > 0) {
            localStorage.setItem('ai_chat_history', JSON.stringify(messages));
        }
    }, [messages]);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isTyping]);

    const handleSend = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!input.trim()) return;

        const userMsg = input;
        setMessages(prev => [...prev, { role: 'user', text: userMsg, ts: new Date().toISOString() }]);
        setInput("");
        setIsTyping(true);
        (async () => {
            try {
                const conversationHistory = messages.map(m => ({
                    role: m.role,
                    content: m.text
                }));

                const resp = await apiRequest<{ reply: string }>("/ai/chat", {
                    method: "POST",
                    body: JSON.stringify({
                        message: userMsg,
                        language: lang,
                        history: conversationHistory
                    }),
                });
                setIsTyping(false);
                setMessages(prev => [...prev, { role: 'ai', text: resp.reply, ts: new Date().toISOString() }]);
            } catch (err: any) {
                setIsTyping(false);
                const errorMsg = err?.message || t.chat.error;
                setMessages(prev => [...prev, { role: 'ai', text: errorMsg, ts: new Date().toISOString() }]);
            }
        })();
    };

    const clearChat = () => {
        if (confirm(t.chat.clearConfirm)) {
            localStorage.removeItem('ai_chat_history');
            setMessages([{ role: 'ai', text: t.chat.historyCleared, ts: new Date().toISOString() }]);
            toast({ title: t.chat.cleared, description: t.chat.clearedDesc });
        }
    };

    const exportPDF = () => {
        const printWindow = window.open('', '', 'width=800,height=600');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Immigration AI Chat History</title>
                        <style>
                            body { font-family: sans-serif; padding: 40px; line-height: 1.6; color: #1e293b; }
                            .message { margin-bottom: 20px; padding: 20px; border-radius: 15px; max-width: 85%; position: relative; }
                            .user { background-color: #f8fafc; margin-left: auto; border: 1px solid #e2e8f0; }
                            .ai { background-color: #f0f9ff; border: 1px solid #bae6fd; }
                            .role { font-weight: 800; font-size: 0.7em; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; margin-bottom: 5px; display: block; }
                            .timestamp { font-size: 0.7em; color: #94a3b8; margin-top: 10px; display: block; border-top: 1px solid rgba(0,0,0,0.05); padding-top: 5px; }
                            h1 { font-weight: 900; border-bottom: 4px solid #3b82f6; padding-bottom: 10px; color: #1e293b; }
                            .header { margin-bottom: 40px; }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <h1>ImmigrationAI Chat Export</h1>
                            <p><strong>Exported on:</strong> ${new Date().toLocaleString()}</p>
                            <p><strong>Language:</strong> ${lang.toUpperCase()}</p>
                        </div>
                        ${messages.map(m => `
                            <div class="message ${m.role}">
                                <span class="role">${m.role === 'user' ? 'You' : t.chat.assistant}</span>
                                <div>${m.text.replace(/\n/g, '<br/>')}</div>
                                <span class="timestamp">${new Date(m.ts).toLocaleString()}</span>
                            </div>
                        `).join('')}
                    </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 250);
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-[calc(100vh-200px)] flex flex-col max-w-5xl mx-auto w-full">
            <AnimatedCard className="flex-1 flex flex-col p-0 overflow-hidden glass-premium border-none shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-[2.5rem]">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-20">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
                            <Sparkles className="text-white" size={24} />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-900 dark:text-white tracking-tight">{t.chat.assistant}</h3>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t.common.connected}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <LiveButton variant="ghost" size="sm" onClick={exportPDF} className="rounded-xl border border-slate-100 dark:border-slate-800 font-bold text-xs uppercase tracking-widest text-slate-500 hover:text-brand-600">
                            <Download size={14} className="mr-2" /> {t.chat.export}
                        </LiveButton>
                        <LiveButton variant="ghost" size="sm" onClick={clearChat} className="rounded-xl border border-slate-100 dark:border-slate-800 font-bold text-xs uppercase tracking-widest text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10">
                            <Trash2 size={14} className="mr-2" /> {t.chat.clear}
                        </LiveButton>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 bg-slate-50/30 dark:bg-slate-950/30 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                    <AnimatePresence initial={false}>
                        {messages.map((m, i) => (
                            <motion.div
                                key={`${m.ts}-${i}`}
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`flex items-end gap-3 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${m.role === 'ai' ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400' : 'bg-brand-600 text-white shadow-brand-500/20'}`}>
                                        {m.role === 'ai' ? <Sparkles size={18} /> : <User size={18} />}
                                    </div>
                                    <div className={`group relative p-5 rounded-[1.5rem] shadow-sm border ${m.role === 'user'
                                        ? 'bg-brand-600 border-brand-500 text-white rounded-br-none'
                                        : 'bg-white dark:bg-slate-800 border-white/20 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-bl-none'
                                        }`}>
                                        <p className="text-[15px] leading-relaxed font-medium whitespace-pre-wrap">{m.text}</p>
                                        <div className={`text-[10px] mt-3 font-black uppercase tracking-[0.1em] opacity-50 ${m.role === 'user' ? 'text-white' : 'text-slate-400'}`}>
                                            {new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    {isTyping && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
                            <div className="flex items-end gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 flex items-center justify-center shadow-md">
                                    <Sparkles size={18} />
                                </div>
                                <div className="px-6 py-4 rounded-[1.5rem] rounded-bl-none bg-white dark:bg-slate-800 border border-white/20 dark:border-slate-700 shadow-sm">
                                    <div className="flex gap-1.5">
                                        <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                        <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                        <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                    <div ref={scrollRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 md:p-8 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 space-y-6">
                    <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide no-scrollbar">
                        {t.chat.tags?.map((tag: string) => (
                            <motion.button
                                key={tag}
                                whileHover={{ y: -3, scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => {
                                    setInput(tag);
                                    setTimeout(() => handleSend(), 50);
                                }}
                                className="whitespace-nowrap px-5 py-2.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-brand-50 dark:hover:bg-brand-900/20 hover:text-brand-600 dark:hover:text-brand-400 text-xs font-black uppercase tracking-widest text-slate-500 transition-all border border-slate-100 dark:border-slate-800 hover:border-brand-200 dark:hover:border-brand-700 shadow-sm"
                            >
                                {tag}
                            </motion.button>
                        ))}
                    </div>

                    <form onSubmit={handleSend} className="flex gap-4 relative">
                        <div className="relative flex-1">
                            <input
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                        handleSend();
                                    }
                                }}
                                className="w-full bg-slate-100/50 dark:bg-slate-800/50 border-2 border-transparent focus:border-brand-500/30 rounded-2xl px-6 py-4 outline-none transition-all text-[15px] font-bold text-slate-900 dark:text-white placeholder-slate-400 shadow-inner"
                                placeholder={t.tools.chatP}
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase tracking-widest text-slate-400 pointer-events-none hidden md:block">
                                {t.chat.inputHint.split(' ').slice(-1)}
                            </div>
                        </div>
                        <LiveButton
                            type="submit"
                            disabled={!input.trim()}
                            className="w-14 h-14 rounded-2xl p-0 shadow-lg shadow-brand-500/20 active:scale-90 transition-all"
                            icon={Send}
                        >
                            {""}
                        </LiveButton>
                    </form>
                </div>
            </AnimatedCard>
        </motion.div>
    );
};
