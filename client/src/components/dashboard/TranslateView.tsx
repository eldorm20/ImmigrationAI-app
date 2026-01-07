import React, { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import { LiveButton, AnimatedCard } from "@/components/ui/live-elements";
import { Languages, Download, RefreshCw, FileCheck, Sparkles, ArrowRightLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const TranslateView = () => {
    const { toast } = useToast();
    const { t } = useI18n();
    const [text, setText] = useState("");
    const [translated, setTranslated] = useState("");
    const [fromLang, setFromLang] = useState("uz");
    const [toLang, setToLang] = useState("en");
    const [translating, setTranslating] = useState(false);
    const [certified, setCertified] = useState(false);

    const languages = [
        { code: 'en', name: t.langNames.en },
        { code: 'uz', name: t.langNames.uz },
        { code: 'ru', name: t.langNames.ru },
        { code: 'de', name: t.langNames.de },
        { code: 'fr', name: t.langNames.fr },
        { code: 'es', name: t.langNames.es }
    ];

    const handleTranslate = async () => {
        if (!text.trim()) {
            toast({ title: t.translate.error, description: t.translate.enterTextError, variant: "destructive" });
            return;
        }

        setTranslating(true);
        try {


            const resp = await apiRequest<{ translation: string }>("/api/ai/translate", {
                method: "POST",
                body: JSON.stringify({ text, fromLang, toLang }),
            });
            setTranslated(resp.translation || "");
            toast({ title: t.translate.complete, description: certified ? t.translate.certifiedReady : t.translate.aiComplete, className: "bg-green-50 text-green-900 border-green-200" });
        } catch (err) {
            toast({ title: t.translate.error, description: (err as any)?.message || t.error.message, variant: 'destructive' });
        } finally {
            setTranslating(false);
        }
    };

    const handleDownload = () => {
        const content = `${t.translate.original} (${languages.find(l => l.code === fromLang)?.name}):\n${text}\n\n${t.translate.translated} (${languages.find(l => l.code === toLang)?.name}):\n${translated}${certified ? `\n\n${t.translate.certifiedLabel}` : ''}`;
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `translation_${new Date().toISOString().slice(0, 10)}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: t.translate.downloaded, description: t.translate.saved });
    };

    const swapLanguages = () => {
        const temp = fromLang;
        setFromLang(toLang);
        setToLang(temp);
        if (translated) {
            setText(translated);
            setTranslated("");
        }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-10 pb-12 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center gap-6 mb-2">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
                    <Languages size={32} />
                </div>
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{t.translate.title}</h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">{t.translate.aiComplete}</p>
                </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 items-start">
                {/* Input Card */}
                <AnimatedCard className="glass-premium p-10 rounded-[2.5rem] border-none shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-600" />

                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4 flex-1">
                            <div className="flex-1">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block">{t.translate.from}</label>
                                <select
                                    value={fromLang}
                                    onChange={(e) => setFromLang(e.target.value)}
                                    className="w-full p-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all appearance-none cursor-pointer"
                                >
                                    {languages.map(lang => (
                                        <option key={lang.code} value={lang.code}>{lang.name}</option>
                                    ))}
                                </select>
                            </div>

                            <button
                                onClick={swapLanguages}
                                className="mt-6 w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all active:scale-95 shadow-sm"
                            >
                                <ArrowRightLeft size={18} />
                            </button>

                            <div className="flex-1">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block">{t.translate.to}</label>
                                <select
                                    value={toLang}
                                    onChange={(e) => setToLang(e.target.value)}
                                    className="w-full p-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all appearance-none cursor-pointer"
                                >
                                    {languages.map(lang => (
                                        <option key={lang.code} value={lang.code}>{lang.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="relative">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 block ml-1">{t.translate.textToTranslate}</label>
                            <textarea
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder={t.translate.enterText}
                                className="w-full p-8 rounded-[2rem] bg-white/50 dark:bg-slate-950/50 border-2 border-slate-100 dark:border-slate-800 min-h-[300px] text-slate-900 dark:text-white placeholder-slate-400 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all shadow-inner font-bold text-lg leading-relaxed resize-none"
                            />
                            <div className="absolute bottom-6 right-6 text-[10px] font-black text-slate-300 pointer-events-none">
                                {text.length} characters
                            </div>
                        </div>

                        <div className="flex items-center gap-4 p-5 rounded-[1.5rem] bg-indigo-500/5 border border-indigo-500/10 group cursor-pointer" onClick={() => setCertified(!certified)}>
                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${certified ? 'bg-indigo-600 border-indigo-600' : 'border-slate-200 dark:border-slate-700'}`}>
                                {certified && <FileCheck size={14} className="text-white" />}
                            </div>
                            <span className="text-sm font-bold text-slate-600 dark:text-slate-400 group-hover:text-indigo-600 transition-colors">
                                {t.translate.certified}
                            </span>
                        </div>

                        <LiveButton
                            onClick={handleTranslate}
                            disabled={translating || !text.trim()}
                            loading={translating}
                            className="w-full py-6 rounded-2xl text-xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 shadow-xl shadow-indigo-500/20"
                        >
                            {translating ? t.translate.translating : t.translate.translate}
                        </LiveButton>
                    </div>
                </AnimatedCard>

                {/* Result Card */}
                <AnimatedCard className="glass-premium p-10 rounded-[2.5rem] border-none shadow-2xl relative min-h-[500px] flex flex-col">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-500 to-emerald-600" />

                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-3">
                            <Sparkles size={16} className="text-green-500" /> {t.translate.result}
                        </h3>
                        {translated && (
                            <div className="px-4 py-2 rounded-xl bg-green-500/10 text-green-600 text-[10px] font-black uppercase tracking-widest border border-green-500/20">
                                {certified ? t.translate.certifiedLabel : t.translate.complete}
                            </div>
                        )}
                    </div>

                    <div className="flex-1 flex flex-col">
                        <div className="flex-1 p-8 rounded-[2rem] bg-slate-50/50 dark:bg-slate-900/50 border-2 border-slate-50 dark:border-slate-800 shadow-inner relative overflow-y-auto max-h-[400px]">
                            <AnimatePresence mode="wait">
                                {translated ? (
                                    <motion.p
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="text-slate-900 dark:text-white whitespace-pre-wrap leading-relaxed font-bold text-lg"
                                    >
                                        {translated}
                                    </motion.p>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-center py-20 opacity-30">
                                        <div className="w-20 h-20 rounded-[2rem] bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6">
                                            <RefreshCw className="text-slate-400 w-10 h-10 animate-pulse" />
                                        </div>
                                        <p className="text-xl font-black italic tracking-tight text-slate-400">{t.translate.willAppear}</p>
                                    </div>
                                )}
                            </AnimatePresence>
                        </div>

                        {translated && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex flex-col sm:flex-row gap-4 mt-8"
                            >
                                <LiveButton
                                    variant="outline"
                                    className="flex-1 py-5 rounded-2xl font-black text-lg border-2 border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                                    onClick={swapLanguages}
                                >
                                    <RefreshCw size={20} className="mr-3" /> {t.translate.swap}
                                </LiveButton>
                                <LiveButton
                                    onClick={handleDownload}
                                    className="flex-[2] py-5 rounded-2xl font-black text-lg bg-green-600 shadow-xl shadow-green-500/20"
                                >
                                    <Download size={20} className="mr-3" /> {t.translate.download}
                                </LiveButton>
                            </motion.div>
                        )}
                    </div>
                </AnimatedCard>
            </div>
        </motion.div>
    );
};
