import React, { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import { LiveButton, AnimatedCard } from "@/components/ui/live-elements";
import { Languages, Download, RefreshCw, FileCheck } from "lucide-react";
import { motion } from "framer-motion";

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
        { code: 'en', name: 'English' },
        { code: 'uz', name: 'Uzbek' },
        { code: 'ru', name: 'Russian' },
        { code: 'de', name: 'German' },
        { code: 'fr', name: 'French' },
        { code: 'es', name: 'Spanish' }
    ];

    const handleTranslate = async () => {
        if (!text.trim()) {
            toast({ title: t.translate.error, description: t.translate.enterTextError, variant: "destructive" });
            return;
        }

        setTranslating(true);
        try {
<<<<<<< HEAD
            const resp = await apiRequest<{ translation: string }>("/ai/translate", {
                method: "POST",
                body: JSON.stringify({ fromLang, toLang, text }),
=======
            const resp = await apiRequest<{ translation: string }>("/api/translate", {
                method: "POST",
                body: JSON.stringify({ text, source: fromLang, target: toLang }),
>>>>>>> ae371cb03865287dde318080e6e8b024b7d45b6c
            });
            setTranslated(resp.translation || "");
            toast({ title: t.translate.complete, description: certified ? t.translate.certifiedReady : t.translate.aiComplete, className: "bg-green-50 text-green-900 border-green-200" });
        } catch (err) {
            toast({ title: "Translation Error", description: (err as any)?.message || 'Failed to translate', variant: 'destructive' });
        } finally {
            setTranslating(false);
        }
    };

    const handleDownload = () => {
        const content = `Original (${languages.find(l => l.code === fromLang)?.name}):\n${text}\n\nTranslated (${languages.find(l => l.code === toLang)?.name}):\n${translated}${certified ? '\n\n[CERTIFIED TRANSLATION]' : ''}`;
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `translation_${new Date().toISOString().slice(0, 10)}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: t.translate.downloaded, description: t.translate.saved });
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid md:grid-cols-2 gap-6">
            <AnimatedCard>
                <h3 className="font-bold text-xl mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
                    <Languages className="text-brand-500" /> {t.translate.title}
                </h3>

                <div className="space-y-4">
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="text-xs font-bold uppercase text-slate-500 mb-2 block">{t.translate.from}</label>
                            <select
                                value={fromLang}
                                onChange={(e) => setFromLang(e.target.value)}
                                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                            >
                                {languages.map(lang => (
                                    <option key={lang.code} value={lang.code}>{lang.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex-1">
                            <label className="text-xs font-bold uppercase text-slate-500 mb-2 block">{t.translate.to}</label>
                            <select
                                value={toLang}
                                onChange={(e) => setToLang(e.target.value)}
                                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                            >
                                {languages.map(lang => (
                                    <option key={lang.code} value={lang.code}>{lang.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold uppercase text-slate-500 mb-2 block">{t.translate.textToTranslate}</label>
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder={t.translate.enterText}
                            className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 min-h-[200px] text-slate-900 dark:text-white placeholder-slate-400"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="certified"
                            checked={certified}
                            onChange={(e) => setCertified(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                        <label htmlFor="certified" className="text-sm text-slate-700 dark:text-slate-300">
                            {t.translate.certified}
                        </label>
                    </div>

                    <LiveButton
                        onClick={handleTranslate}
                        disabled={translating || !text.trim()}
                        loading={translating}
                        className="w-full"
                        icon={Languages}
                    >
                        {translating ? t.translate.translating : t.translate.translate}
                    </LiveButton>
                </div>
            </AnimatedCard>

            <AnimatedCard>
                <h3 className="font-bold text-xl mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
                    <FileCheck className="text-green-500" /> {t.translate.result}
                </h3>

                <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 min-h-[200px]">
                        {translated ? (
                            <p className="text-slate-900 dark:text-white whitespace-pre-wrap leading-relaxed">{translated}</p>
                        ) : (
                            <p className="text-slate-400 italic">{t.translate.willAppear}</p>
                        )}
                    </div>

                    {translated && (
                        <div className="flex gap-2">
                            <LiveButton variant="secondary" onClick={() => {
                                setText(translated);
                                setTranslated("");
                                const temp = fromLang;
                                setFromLang(toLang);
                                setToLang(temp);
                            }} icon={RefreshCw}>
                                {t.translate.swap}
                            </LiveButton>
                            <LiveButton variant="primary" onClick={handleDownload} icon={Download} className="flex-1">
                                {t.translate.download} {certified && '(Certified)'}
                            </LiveButton>
                        </div>
                    )}
                </div>
            </AnimatedCard>
        </motion.div>
    );
};
