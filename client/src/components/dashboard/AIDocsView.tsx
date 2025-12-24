import React, { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import { trackEvent } from "@/lib/analytics";
import { LiveButton, AnimatedCard } from "@/components/ui/live-elements";
import { FileCheck, Download, RefreshCw, Sparkles, CheckCircle, Edit3, Loader2, Search, AlertCircle, FileText, XCircle, Shield } from "lucide-react";
import { motion } from "framer-motion";

export const AIDocsView = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const { t, lang } = useI18n();

    type TemplateKey = 'motivation' | 'cv' | 'reference';
    const [docType, setDocType] = useState<TemplateKey>('motivation');
    const [generatedContent, setGeneratedContent] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [mode, setMode] = useState<'generate' | 'review'>('generate');
    const [reviewContent, setReviewContent] = useState("");
    const [reviewResult, setReviewResult] = useState<{ score: number; feedback: string[]; flags: { type: 'red' | 'green' | 'amber'; message: string }[] } | null>(null);
    const [isReviewing, setIsReviewing] = useState(false);
    const [formData, setFormData] = useState({ role: '', company: '', skills: '', name: '', experience: '', education: '', achievements: '' });

    const generateMotivationLetter = (data: Record<string, any>) => {
        const skillsList = data.skills ? data.skills.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
        const skillsText = skillsList.length > 0 ? skillsList.join(', ') : '[Your key skills]';

        return `Dear Hiring Manager,\n\nI am writing to express my strong interest in the ${data.role || '[Position Title]'} position at ${data.company || '[Company Name]'}. With ${data.experience || '[X]'} years of professional experience and a proven track record in ${skillsText}, I am confident that I would be a valuable addition to your team.\n\nPROFESSIONAL BACKGROUND\n${data.experience ? `I bring ${data.experience} years of experience in [relevant field], with expertise in ${skillsText}.` : 'I have extensive experience in [relevant field].'} My background includes working with ${data.company || 'leading organizations'} where I have consistently delivered results and exceeded expectations.\n\nKEY QUALIFICATIONS\n${skillsList.length > 0 ? skillsList.map((skill: string, i: number) => `• ${skill}`).join('\n') : '• [Skill 1]\n• [Skill 2]\n• [Skill 3]'}\n\n${data.achievements ? `RECENT ACHIEVEMENTS\n${data.achievements}` : ''}\n\nWHY I AM INTERESTED\nI am particularly drawn to ${data.company || 'your organization'} because of [specific reason]. The opportunity to contribute to [specific project/goal] aligns perfectly with my career aspirations and professional values.\n\nI am excited about the possibility of bringing my skills and experience to your team and contributing to your continued success. I would welcome the opportunity to discuss how my background, skills, and enthusiasm can benefit ${data.company || 'your organization'}.\n\nThank you for considering my application. I look forward to hearing from you.\n\nSincerely,\n${user?.name || '[Your Name]'}\n${user?.email ? user.email : '[Your Email]'}\n${new Date().toLocaleDateString()}`;
    };

    const generateCVEnhancement = (data: Record<string, any>) => {
        const skillsList = data.skills ? data.skills.split(',').map((s: string) => s.trim()).filter(Boolean) : [];

        return `PROFESSIONAL SUMMARY\n\nResults-driven ${data.role || 'professional'} with ${data.experience || '[X]'} years of experience in [industry/field]. Proven expertise in ${skillsList.length > 0 ? skillsList.join(', ') : '[key skills]'} with a track record of delivering exceptional results in ${data.company ? `organizations like ${data.company}` : 'diverse professional environments'}.\n\nCORE COMPETENCIES\n${skillsList.length > 0 ? skillsList.map((skill: string) => `• ${skill}`).join('\n') : '• [Competency 1]\n• [Competency 2]\n• [Competency 3]'}\n\nPROFESSIONAL EXPERIENCE\n\n${data.role || '[Job Title]'} | ${data.company || '[Company Name]'} | ${data.experience ? `[Dates] (${data.experience} years)` : '[Dates]'}\n${data.achievements ? `• ${data.achievements.split(',').map((a: string) => a.trim()).join('\n• ')}` : '• [Key Achievement 1]\n• [Key Achievement 2]\n• [Key Achievement 3]'}\n\nEDUCATION\n${data.education || '[Degree] in [Field] from [University] | [Year]'}\n\nCERTIFICATIONS & SKILLS\n${skillsList.length > 0 ? skillsList.map((skill: string) => `• ${skill}`).join('\n') : '• [Certification/Skill 1]\n• [Certification/Skill 2]'}\n\nLANGUAGES\n• English (Professional)\n• [Additional Languages]\n\n${data.achievements ? `KEY ACHIEVEMENTS\n${data.achievements}` : ''}`;
    };

    const generateReferenceLetter = (data: Record<string, any>) => {
        return `To Whom It May Concern,\n\nRE: Reference Letter for ${user?.name || '[Employee Name]'}\n\nI am writing to provide a professional reference for ${user?.name || '[Employee Name]'}, who ${data.experience ? `worked with us for ${data.experience} years` : 'was employed with our organization'} in the capacity of ${data.role || '[Position]'}.\n\nEMPLOYMENT PERIOD\n${data.experience ? `During their ${data.experience} years of service` : 'During their tenure'} with ${data.company || 'our organization'}, ${user?.name || 'the employee'} demonstrated exceptional professionalism, dedication, and competence.\n\nKEY STRENGTHS\n${data.skills ? data.skills.split(',').map((s: string) => `• ${s.trim()}`).join('\n') : '• [Strength 1]\n• [Strength 2]\n• [Strength 3]'}\n\nPERFORMANCE HIGHLIGHTS\n${data.achievements || '• Consistently met and exceeded performance expectations\n• Demonstrated strong problem-solving abilities\n• Worked effectively both independently and as part of a team'}\n\nRECOMMENDATION\nI can confidently recommend ${user?.name || '[Employee Name]'} for any position that requires ${data.skills ? data.skills.split(',').slice(0, 2).join(' and ') : '[relevant skills]'}. They would be a valuable asset to any organization.\n\nIf you require any additional information, please do not hesitate to contact me.\n\nSincerely,\n\n[Manager Name]\n[Your Title]\n${data.company || '[Company Name]'}\n[Contact Information]\n${new Date().toLocaleDateString()}`;
    };

    const templates: Record<TemplateKey, (data: Record<string, any>) => string> = {
        'motivation': generateMotivationLetter,
        'cv': generateCVEnhancement,
        'reference': generateReferenceLetter
    };

    const keyToAITemplate = (key: TemplateKey) => {
        if (key === 'motivation') return 'Motivation Letter';
        if (key === 'cv') return 'CV Enhancement';
        if (key === 'reference') return 'Reference Letter';
        return 'Motivation Letter';
    };

    const handleGenerate = () => {
        if (!formData.role && !formData.company && !formData.skills) {
            toast({
                title: t.tools.gen,
                description: t.docs.fillRequired,
                variant: "destructive",
            });
            return;
        }

        setIsGenerating(true);
        setGeneratedContent("");

        (async () => {
            try {
                const resp = await apiRequest<{ document: string }>("/ai/documents/generate", {
                    method: "POST",
                    body: JSON.stringify({ template: keyToAITemplate(docType), data: formData, language: lang || 'en' }),
                    timeout: 120000,
                });

                const targetText = resp.document || "";
                try { trackEvent('ai_document_generated', { template: docType, language: lang || 'en', length: (targetText || '').length }); } catch { };
                let i = 0;

                const interval = setInterval(() => {
                    const safeText = String(targetText || "");
                    if (i >= safeText.length) {
                        clearInterval(interval);
                        setIsGenerating(false);
                        toast({
                            title: t.docs.genSuccess,
                            description: `${t.docs[docType]} ${t.docs.genSuccess.toLowerCase()}`,
                            className: "bg-green-50 text-green-900 border-green-200",
                        });
                        return;
                    }

                    setGeneratedContent((prev) => prev + safeText.charAt(i));
                    i++;
                }, 10);
            } catch (err) {
                setIsGenerating(false);
                toast({ title: t.docs.genError, description: err instanceof Error ? err.message : t.docs.genError, variant: 'destructive' });
            }
        })();
    };

    const handleReview = async () => {
        if (reviewContent.length < 50) {
            toast({ title: t.docs.tooShort, description: t.docs.tooShortDesc, variant: "destructive" });
            return;
        }

        setIsReviewing(true);
        try {
            const res = await apiRequest<any>("/ai/documents/review", {
                method: "POST",
                body: JSON.stringify({
                    content: reviewContent,
                    docType: keyToAITemplate(docType),
                    visaType: "Skilled Worker"
                })
            });
            setReviewResult(res);
            toast({
                title: t.upload.ocrComplete,
                description: `${t.docs.score}: ${res.score}%`,
                className: "bg-blue-50 text-blue-900 border-blue-200"
            });
        } catch (err) {
            toast({ title: t.docs.reviewFail, description: t.error.message, variant: "destructive" });
        } finally {
            setIsReviewing(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid lg:grid-cols-12 gap-8 h-full max-w-[1600px] mx-auto pb-12">
            <div className="lg:col-span-4 space-y-6">
                <AnimatedCard className="h-full flex flex-col glass-premium p-8 rounded-3xl border-none shadow-2xl overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full blur-2xl -mr-16 -mt-16"></div>
                    <div className="flex items-center justify-between mb-8 z-10">
                        <h3 className="text-2xl font-black flex items-center gap-3 text-slate-900 dark:text-white">
                            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
                                <Sparkles className="text-white" size={20} />
                            </div>
                            {t.docs.title}
                        </h3>
                    </div>

                    <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1.5 rounded-2xl mb-8 border border-white/20 dark:border-slate-800 z-10">
                        <button
                            onClick={() => setMode('generate')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${mode === 'generate' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-xl' : 'text-slate-500 hover:text-slate-600'}`}
                        >
                            <FileText size={16} /> {t.tools.gen}
                        </button>
                        <button
                            onClick={() => setMode('review')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${mode === 'review' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-xl' : 'text-slate-500 hover:text-slate-600'}`}
                        >
                            <Search size={16} /> {t.review.title}
                        </button>
                    </div>

                    <div className="space-y-3 mb-8 z-10">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block pl-1">{t.docs.docType}</label>
                        <div className="grid gap-2">
                            {(Object.keys(templates) as TemplateKey[]).map(key => (
                                <button
                                    key={key}
                                    onClick={() => setDocType(key)}
                                    className={`p-4 rounded-2xl text-left text-sm font-black transition-all border-2 flex items-center justify-between group ${docType === key
                                        ? 'bg-brand-600 border-brand-500 text-white shadow-lg shadow-brand-500/20'
                                        : 'border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 hover:border-brand-300 dark:hover:border-brand-800 text-slate-600 dark:text-slate-300'}`}
                                >
                                    {t.docs[key]}
                                    {docType === key ? <CheckCircle size={18} className="text-white" /> : <div className="w-5 h-5 rounded-full border-2 border-slate-200 dark:border-slate-700 group-hover:border-brand-300 transition-colors"></div>}
                                </button>
                            ))}
                        </div>
                    </div>

                    {mode === 'generate' ? (
                        <div className="space-y-5 mb-8 flex-1 overflow-y-auto pr-3 custom-scrollbar z-10">
                            <div className="grid grid-cols-1 gap-5">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block pl-1">{t.docs.fullName}</label>
                                    <input
                                        className="w-full px-5 py-4 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-sm font-bold outline-none focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-slate-900 dark:text-white"
                                        placeholder="e.g. John Doe"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-5">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block pl-1">{t.docs.role}</label>
                                        <input
                                            className="w-full px-5 py-4 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-sm font-bold outline-none focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-slate-900 dark:text-white"
                                            placeholder="e.g. Engineer"
                                            value={formData.role}
                                            onChange={e => setFormData({ ...formData, role: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block pl-1">{t.docs.company}</label>
                                        <input
                                            className="w-full px-5 py-4 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-sm font-bold outline-none focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-slate-900 dark:text-white"
                                            placeholder="e.g. Google"
                                            value={formData.company}
                                            onChange={e => setFormData({ ...formData, company: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-5">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block pl-1">{t.docs.experience}</label>
                                        <input
                                            type="number"
                                            className="w-full px-5 py-4 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-sm font-bold outline-none focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-slate-900 dark:text-white"
                                            placeholder="e.g. 5"
                                            value={formData.experience}
                                            onChange={e => setFormData({ ...formData, experience: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block pl-1">{t.docs.education}</label>
                                        <input
                                            className="w-full px-5 py-4 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-sm font-bold outline-none focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-slate-900 dark:text-white"
                                            placeholder="e.g. MSc CS"
                                            value={formData.education}
                                            onChange={e => setFormData({ ...formData, education: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block pl-1">{t.docs.skills}</label>
                                    <textarea
                                        className="w-full px-5 py-4 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-sm font-bold h-24 resize-none outline-none focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-slate-900 dark:text-white leading-relaxed"
                                        placeholder="e.g. React, SQL, Leadership"
                                        value={formData.skills}
                                        onChange={e => setFormData({ ...formData, skills: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block pl-1">{t.docs.achievements}</label>
                                    <textarea
                                        className="w-full px-5 py-4 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-sm font-bold h-24 resize-none outline-none focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-slate-900 dark:text-white leading-relaxed"
                                        placeholder="e.g. Saved 20% costs, Led 10 people"
                                        value={formData.achievements}
                                        onChange={e => setFormData({ ...formData, achievements: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 mb-8 flex-1 z-10">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block pl-1">{t.review.desc}</label>
                                <textarea
                                    className="w-full px-5 py-4 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-sm font-bold h-80 resize-none outline-none focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-slate-900 dark:text-white font-mono leading-relaxed"
                                    placeholder={t.review.desc}
                                    value={reviewContent}
                                    onChange={e => setReviewContent(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {mode === 'generate' ? (
                        <LiveButton onClick={handleGenerate} disabled={isGenerating} loading={isGenerating} className="w-full py-5 rounded-2xl text-xl font-black shadow-xl shadow-brand-500/20 hover:scale-[1.02] active:scale-95 transition-all z-10">
                            {isGenerating ? <><Loader2 className="animate-spin mr-3" size={24} /> {t.tools.typing}</> : <><Sparkles className="mr-3 text-yellow-300" size={24} /> {t.tools.gen}</>}
                        </LiveButton>
                    ) : (
                        <LiveButton onClick={handleReview} disabled={isReviewing} loading={isReviewing} className="w-full py-5 rounded-2xl text-xl font-black shadow-xl shadow-brand-500/20 bg-brand-600 text-white hover:scale-[1.02] active:scale-95 transition-all z-10">
                            {isReviewing ? <><Loader2 className="animate-spin mr-3" size={24} /> {t.review.reviewing}</> : <><Search className="mr-3" size={24} /> {t.review.check}</>}
                        </LiveButton>
                    )}
                </AnimatedCard>
            </div>

            <div className="lg:col-span-8">
                {mode === 'generate' ? (
                    <AnimatedCard className="h-full flex flex-col glass-premium rounded-3xl border-none shadow-2xl overflow-hidden relative group">
                        <div className="absolute top-0 left-0 w-full bg-slate-100 dark:bg-slate-900 p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 z-20">
                            <div className="flex gap-2">
                                <div className="w-3.5 h-3.5 rounded-full bg-red-500/80 shadow-inner"></div>
                                <div className="w-3.5 h-3.5 rounded-full bg-yellow-500/80 shadow-inner"></div>
                                <div className="w-3.5 h-3.5 rounded-full bg-green-500/80 shadow-inner"></div>
                            </div>
                            <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] flex items-center gap-3">
                                {t.docs[docType]?.replace(' ', '_')}.pdf {isGenerating ? <Loader2 size={16} className="animate-spin text-brand-500" /> : <FileCheck size={16} className="text-brand-500" />}
                            </span>
                        </div>

                        <div className="mt-14 flex-1 p-10 whitespace-pre-wrap text-[15px] leading-[1.8] text-slate-700 dark:text-slate-300 overflow-y-auto custom-scrollbar font-serif italic text-justify">
                            {generatedContent ? (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                    {generatedContent}
                                </motion.div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400 italic opacity-40">
                                    <Edit3 size={64} strokeWidth={1} className="mb-6" />
                                    <p className="text-xl font-medium">{t.docs.fillForm}</p>
                                </div>
                            )}
                            {isGenerating && <span className="inline-block w-2.5 h-5 bg-brand-500 ml-1.5 animate-pulse rounded-sm"></span>}
                        </div>

                        {generatedContent && !isGenerating && (
                            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="absolute bottom-8 right-8 flex gap-3 z-30">
                                <LiveButton variant="secondary" className="px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest bg-white dark:bg-slate-800 shadow-xl border border-slate-100 dark:border-slate-700 hover:scale-105 transition-all" onClick={() => { setGeneratedContent(""); setIsGenerating(false); }}>
                                    <RefreshCw className="mr-2" size={16} /> {t.tools.clear}
                                </LiveButton>
                                <LiveButton variant="primary" className="px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest text-white shadow-xl shadow-brand-500/20 hover:scale-110 active:scale-95 transition-all" onClick={() => {
                                    const printWindow = window.open('', '', 'width=800,height=600');
                                    if (printWindow) {
                                        printWindow.document.write(`
                                             <html>
                                               <head>
                                                 <title>${t.docs[docType]}</title>
                                                 <style>
                                                   body { font-family: serif; padding: 60px; line-height: 1.8; white-space: pre-wrap; color: #334155; font-size: 16px; font-style: italic; }
                                                 </style>
                                               </head>
                                               <body>${generatedContent}</body>
                                             </html>
                                           `);
                                        printWindow.document.close();
                                        printWindow.focus();
                                        printWindow.print();
                                        printWindow.close();
                                    }
                                }}>
                                    <Download className="mr-2" size={16} /> {t.docs.print}
                                </LiveButton>
                            </motion.div>
                        )}
                    </AnimatedCard>
                ) : (
                    <div className="h-full flex flex-col gap-6">
                        {reviewResult ? (
                            <>
                                <AnimatedCard className="glass-premium border-l-[6px] border-l-brand-600 p-10 shadow-2xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
                                    <div className="flex items-center justify-between mb-10 relative z-10">
                                        <h3 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-4">
                                            {t.docs.score}
                                            <span className={`px-6 py-2 rounded-2xl text-white font-black shadow-xl ${reviewResult.score > 80 ? 'bg-green-500 shadow-green-500/20' : reviewResult.score > 50 ? 'bg-amber-500 shadow-amber-500/20' : 'bg-red-500 shadow-red-500/20'}`}>
                                                {reviewResult.score}%
                                            </span>
                                        </h3>
                                        <LiveButton variant="ghost" className="px-4 py-2 rounded-xl text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-all font-black text-xs uppercase tracking-widest border border-slate-100 dark:border-slate-800" onClick={() => setReviewResult(null)}>
                                            <RefreshCw className="mr-2" size={14} /> {t.tools.clear}
                                        </LiveButton>
                                    </div>

                                    <div className="grid lg:grid-cols-2 gap-10 relative z-10">
                                        <div>
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-3">
                                                <div className="w-1.5 h-4 bg-brand-500 rounded-full"></div>
                                                {t.docs.observations}
                                            </h4>
                                            <ul className="space-y-4">
                                                {reviewResult.feedback.map((f, i) => (
                                                    <motion.li
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: i * 0.1 }}
                                                        key={i}
                                                        className="flex items-start gap-4 text-[15px] font-medium text-slate-600 dark:text-slate-400 leading-relaxed"
                                                    >
                                                        <CheckCircle size={18} className="text-brand-500 shrink-0 mt-0.5" />
                                                        {f}
                                                    </motion.li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div className="space-y-6">
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-3">
                                                <div className="w-1.5 h-4 bg-brand-500 rounded-full"></div>
                                                {t.docs.findings}
                                            </h4>
                                            {reviewResult.flags.map((flag, i) => (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: 0.3 + (i * 0.1) }}
                                                    key={i}
                                                    className={`p-5 rounded-2xl border-2 flex items-start gap-4 shadow-sm ${flag.type === 'red' ? 'bg-red-500/5 dark:bg-red-500/10 border-red-500/20' : flag.type === 'amber' ? 'bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/20' : 'bg-green-500/5 dark:bg-green-500/10 border-green-500/20'}`}
                                                >
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${flag.type === 'red' ? 'bg-red-500/10 text-red-600' : flag.type === 'amber' ? 'bg-amber-500/10 text-amber-600' : 'bg-green-500/10 text-green-600'}`}>
                                                        {flag.type === 'red' ? <XCircle size={20} /> : flag.type === 'amber' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
                                                    </div>
                                                    <p className={`text-[15px] font-bold leading-relaxed ${flag.type === 'red' ? 'text-red-700 dark:text-red-300' : flag.type === 'amber' ? 'text-amber-700 dark:text-amber-300' : 'text-green-700 dark:text-green-300'}`}>
                                                        {flag.message}
                                                    </p>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                </AnimatedCard>

                                <AnimatedCard className="bg-white/30 dark:bg-slate-900/50 font-mono text-[11px] opacity-60 p-8 rounded-3xl overflow-y-auto max-h-60 border-2 border-dashed border-slate-200 dark:border-slate-800 leading-relaxed shadow-inner italic">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 block">{t.docs.analyzedContent}</label>
                                    {reviewContent}
                                </AnimatedCard>
                            </>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center p-16 text-center glass-premium rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800 overflow-hidden relative group">
                                <div className="absolute inset-0 bg-brand-500/5 blur-[120px] rounded-full -m-20"></div>
                                {isReviewing ? (
                                    <>
                                        <div className="relative mb-8">
                                            <Loader2 size={64} className="animate-spin text-brand-600" />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <Search size={24} className="text-brand-400" />
                                            </div>
                                        </div>
                                        <h3 className="text-3xl font-black mb-4 text-slate-900 dark:text-white uppercase tracking-tight">{t.docs.analyzing}</h3>
                                        <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto text-lg italic font-medium leading-relaxed">
                                            {t.docs.analyzingDesc}
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-24 h-24 rounded-3xl bg-brand-600/10 text-brand-600 flex items-center justify-center mb-8 shadow-xl shadow-brand-500/5 border border-brand-500/20 group-hover:scale-110 transition-transform">
                                            <Search size={48} strokeWidth={2.5} />
                                        </div>
                                        <h3 className="text-3xl font-black mb-4 text-slate-900 dark:text-white uppercase tracking-tight">{t.docs.readyReview}</h3>
                                        <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-10 text-lg italic font-medium leading-relaxed">
                                            {t.docs.readyReviewDesc}
                                        </p>
                                        <div className="flex gap-6 opacity-20 grayscale group-hover:opacity-40 transition-opacity">
                                            <FileText size={40} />
                                            <FileCheck size={40} />
                                            <Shield size={40} />
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    );
};
