import React, { useState, useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n";
import { apiRequest } from "@/lib/api";
import { motion } from "framer-motion";
import { LiveButton, AnimatedCard } from "@/components/ui/live-elements";
import { Sparkles, User, Send, Mic } from "lucide-react";

export const ChatView = () => {
    const { t, lang } = useI18n();
    const [messages, setMessages] = useState<{ role: string; text: string; ts: string }[]>([{ role: 'ai', text: "Hello! I'm your Immigration AI Assistant. Ask me anything about UK or German visas.", ts: new Date().toISOString() }]);
    const [input, setInput] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isTyping, setIsTyping] = useState(false);
    const [isListening, setIsListening] = useState(false);

    // Voice Input Handler
    const startListening = () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert(t.tools?.voiceNotSupported || "Voice input not supported in this browser.");
            return;
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        if (lang === 'uz') {
            recognition.lang = 'uz-UZ';
        } else if (lang === 'ru') {
            recognition.lang = 'ru-RU';
        } else {
            recognition.lang = 'en-US';
        }
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = () => setIsListening(false);

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setInput(prev => prev ? `${prev} ${transcript}` : transcript);
        };

        recognition.start();
    };

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = input;
        setMessages(prev => [...prev, { role: 'user', text: userMsg, ts: new Date().toISOString() }]);
        setInput("");
        setIsTyping(true);
        (async () => {
            try {
                // Send conversation history with the request for better context
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
            } catch (err) {
                setIsTyping(false);
                setMessages(prev => [...prev, { role: 'ai', text: "Sorry, I couldn't reach the AI service right now.", ts: new Date().toISOString() }]);
            }
        })();
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-[calc(100vh-200px)] flex flex-col">
            <AnimatedCard className="flex-1 flex flex-col p-0 overflow-hidden bg-white dark:bg-slate-900">
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 dark:bg-slate-950/50">
                    {messages.map((m, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`flex items-end gap-2 max-w-[80%] ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.role === 'ai' ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                                    {m.role === 'ai' ? <Sparkles size={14} /> : <User size={14} />}
                                </div>
                                <div className={`p-4 rounded-2xl text-sm shadow-sm leading-relaxed ${m.role === 'user'
                                    ? 'bg-brand-600 text-white rounded-br-none'
                                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-bl-none border border-slate-100 dark:border-slate-700'
                                    }`}>
                                    {m.text}
                                    {m.ts && (
                                        <div className={`text-xs mt-2 opacity-70 flex items-center justify-between ${m.role === 'user' ? 'text-white/70' : 'text-slate-400'}`}>
                                            <span>{new Date(m.ts).toLocaleTimeString()}</span>
                                            {m.role === 'ai' && (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => apiRequest("/dataset/feedback", { method: "POST", body: JSON.stringify({ query: messages[i - 1]?.text, response: m.text, rating: 1 }) })}
                                                        className="hover:text-green-500 transition-colors"
                                                        title="Good Answer"
                                                    >
                                                        👍
                                                    </button>
                                                    <button
                                                        onClick={() => apiRequest("/dataset/feedback", { method: "POST", body: JSON.stringify({ query: messages[i - 1]?.text, response: m.text, rating: -1 }) })}
                                                        className="hover:text-red-500 transition-colors"
                                                        title="Bad Answer"
                                                    >
                                                        👎
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                    {isTyping && (
                        <div className="flex justify-start">
                            <div className="flex items-end gap-2 max-w-[80%]">
                                <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                                    <Sparkles size={14} />
                                </div>
                                <div className="p-4 rounded-2xl rounded-bl-none bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                                    <div className="flex gap-1">
                                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={scrollRef} />
                </div>

                <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                        {["Visa Costs", "Processing Time", "Job Offer Requirements", "Family Visa", "Required Documents", "Eligibility", "Germany Opportunity Card", "UK Skilled Worker"].map(tag => (
                            <motion.button
                                key={tag}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                    setInput(tag);
                                    const inputEl = document.querySelector('input[placeholder*="Ask"]') as HTMLInputElement;
                                    if (inputEl) {
                                        setTimeout(() => inputEl.focus(), 100);
                                    }
                                }}
                                className="whitespace-nowrap px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-brand-50 dark:hover:bg-brand-900/30 hover:text-brand-600 dark:hover:text-brand-400 text-xs font-bold text-slate-600 dark:text-slate-400 transition-colors border border-transparent hover:border-brand-200 dark:hover:border-brand-800"
                            >
                                {tag}
                            </motion.button>
                        ))}
                    </div>
                    <form onSubmit={handleSend} className="flex gap-2">
                        <input
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                    handleSend(e as any);
                                }
                            }}
                            className="flex-1 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-5 py-3 focus:ring-2 focus:ring-brand-500 outline-none transition-all text-slate-900 dark:text-white placeholder-slate-400"
                            placeholder={t.tools.chatP}
                        />
                        <LiveButton type="submit" size="icon" className="w-12 h-12 rounded-xl p-0" icon={Send} >
                            <span className="sr-only">Send</span>
                        </LiveButton>
                        <LiveButton
                            type="button"
                            onClick={startListening}
                            variant={isListening ? "danger" : "secondary"}
                            size="icon"
                            className={`w-12 h-12 rounded-xl p-0 ${isListening ? 'animate-pulse' : ''}`}
                            icon={Mic}
                        >
                            <span className="sr-only">Voice Input</span>
                        </LiveButton>
                    </form>
                    <p className="text-xs text-slate-400 mt-2 text-center">Press Cmd/Ctrl + Enter to send</p>
                </div>
            </AnimatedCard>
        </motion.div>
    );
};
