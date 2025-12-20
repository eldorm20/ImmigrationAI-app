import React, { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import { trackEvent } from "@/lib/analytics";
import { LiveButton, AnimatedCard } from "@/components/ui/live-elements";
import { FileCheck, Download, RefreshCw, Sparkles, CheckCircle, Edit3, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export const AIDocsView = () => {
    const [docType, setDocType] = useState('Motivation Letter');
    const [generatedContent, setGeneratedContent] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [formData, setFormData] = useState({ role: '', company: '', skills: '', name: '', experience: '', education: '', achievements: '' });
    const { user } = useAuth();
    const { toast } = useToast();
    const { t, lang } = useI18n();

    const generateMotivationLetter = (data: Record<string, any>) => {
        const skillsList = data.skills ? data.skills.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
        const skillsText = skillsList.length > 0 ? skillsList.join(', ') : '[Your key skills]';

        return `Dear Hiring Manager,

I am writing to express my strong interest in the ${data.role || '[Position Title]'} position at ${data.company || '[Company Name]'}. With ${data.experience || '[X]'} years of professional experience and a proven track record in ${skillsText}, I am confident that I would be a valuable addition to your team.

PROFESSIONAL BACKGROUND
${data.experience ? `I bring ${data.experience} years of experience in [relevant field], with expertise in ${skillsText}.` : 'I have extensive experience in [relevant field].'} My background includes working with ${data.company || 'leading organizations'} where I have consistently delivered results and exceeded expectations.

KEY QUALIFICATIONS
${skillsList.length > 0 ? skillsList.map((skill: string, i: number) => `• ${skill}`).join('\n') : '• [Skill 1]\n• [Skill 2]\n• [Skill 3]'}

${data.achievements ? `RECENT ACHIEVEMENTS\n${data.achievements}` : ''}

WHY I AM INTERESTED
I am particularly drawn to ${data.company || 'your organization'} because of [specific reason]. The opportunity to contribute to [specific project/goal] aligns perfectly with my career aspirations and professional values.

I am excited about the possibility of bringing my skills and experience to your team and contributing to your continued success. I would welcome the opportunity to discuss how my background, skills, and enthusiasm can benefit ${data.company || 'your organization'}.

Thank you for considering my application. I look forward to hearing from you.

Sincerely,
${user?.name || '[Your Name]'}
${user?.email ? user.email : '[Your Email]'}
${new Date().toLocaleDateString()}`;
    };

    const generateCVEnhancement = (data: Record<string, any>) => {
        const skillsList = data.skills ? data.skills.split(',').map((s: string) => s.trim()).filter(Boolean) : [];

        return `PROFESSIONAL SUMMARY

Results-driven ${data.role || 'professional'} with ${data.experience || '[X]'} years of experience in [industry/field]. Proven expertise in ${skillsList.length > 0 ? skillsList.join(', ') : '[key skills]'} with a track record of delivering exceptional results in ${data.company ? `organizations like ${data.company}` : 'diverse professional environments'}.

CORE COMPETENCIES
${skillsList.length > 0 ? skillsList.map((skill: string) => `• ${skill}`).join('\n') : '• [Competency 1]\n• [Competency 2]\n• [Competency 3]'}

PROFESSIONAL EXPERIENCE

${data.role || '[Job Title]'} | ${data.company || '[Company Name]'} | ${data.experience ? `[Dates] (${data.experience} years)` : '[Dates]'}
${data.achievements ? `• ${data.achievements.split(',').map((a: string) => a.trim()).join('\n• ')}` : '• [Key Achievement 1]\n• [Key Achievement 2]\n• [Key Achievement 3]'}

EDUCATION
${data.education || '[Degree] in [Field] from [University] | [Year]'}

CERTIFICATIONS & SKILLS
${skillsList.length > 0 ? skillsList.map((skill: string) => `• ${skill}`).join('\n') : '• [Certification/Skill 1]\n• [Certification/Skill 2]'}

LANGUAGES
• English (Professional)
• [Additional Languages]

${data.achievements ? `KEY ACHIEVEMENTS\n${data.achievements}` : ''}`;
    };

    const generateReferenceLetter = (data: Record<string, any>) => {
        return `To Whom It May Concern,

RE: Reference Letter for ${user?.name || '[Employee Name]'}

I am writing to provide a professional reference for ${user?.name || '[Employee Name]'}, who ${data.experience ? `worked with us for ${data.experience} years` : 'was employed with our organization'} in the capacity of ${data.role || '[Position]'}.

EMPLOYMENT PERIOD
${data.experience ? `During their ${data.experience} years of service` : 'During their tenure'} with ${data.company || 'our organization'}, ${user?.name || 'the employee'} demonstrated exceptional professionalism, dedication, and competence.

KEY STRENGTHS
${data.skills ? data.skills.split(',').map((s: string) => `• ${s.trim()}`).join('\n') : '• [Strength 1]\n• [Strength 2]\n• [Strength 3]'}

PERFORMANCE HIGHLIGHTS
${data.achievements || '• Consistently met and exceeded performance expectations\n• Demonstrated strong problem-solving abilities\n• Worked effectively both independently and as part of a team'}

RECOMMENDATION
I can confidently recommend ${user?.name || '[Employee Name]'} for any position that requires ${data.skills ? data.skills.split(',').slice(0, 2).join(' and ') : '[relevant skills]'}. They would be a valuable asset to any organization.

If you require any additional information, please do not hesitate to contact me.

Sincerely,

[Manager Name]
[Your Title]
${data.company || '[Company Name]'}
[Contact Information]
${new Date().toLocaleDateString()}`;
    };

    type TemplateKey = 'Motivation Letter' | 'CV Enhancement' | 'Reference Letter';
    const templates: Record<TemplateKey, (data: Record<string, any>) => string> = {
        'Motivation Letter': generateMotivationLetter,
        'CV Enhancement': generateCVEnhancement,
        'Reference Letter': generateReferenceLetter
    };

    const handleGenerate = () => {
        if (!formData.role && !formData.company && !formData.skills) {
            toast({
                title: t.tools.gen,
                description: "Please fill in at least role, company, or skills for better results",
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
                    body: JSON.stringify({ template: docType, data: formData, language: lang || 'en' }),
                    timeout: 120000, // Increase timeout for AI document generation
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
                            title: "Document Generated",
                            description: `${docType} has been generated successfully`,
                            className: "bg-green-50 text-green-900 border-green-200",
                        });
                        return;
                    }

                    setGeneratedContent((prev) => prev + safeText.charAt(i));
                    i++;
                }, 10);
            } catch (err) {
                setIsGenerating(false);
                toast({ title: "Generation Error", description: err instanceof Error ? err.message : 'Failed to generate document', variant: 'destructive' });
            }
        })();
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid md:grid-cols-12 gap-8 h-full">
            <div className="md:col-span-4 space-y-6">
                <AnimatedCard className="h-full flex flex-col">
                    <h3 className="font-bold text-xl mb-6 flex items-center gap-2 text-slate-900 dark:text-white"><Sparkles className="text-brand-500" /> {t.dash.docs}</h3>

                    <div className="space-y-2 mb-6">
                        <label className="text-xs font-bold uppercase text-slate-500">{t.tools.gen} Type</label>
                        <div className="grid gap-2">
                            {Object.keys(templates).map(t => (
                                <button
                                    key={t}
                                    onClick={() => setDocType(t)}
                                    className={`p-3 rounded-xl text-left text-sm font-bold transition-all border flex items-center justify-between ${docType === t ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-500 text-brand-700 dark:text-brand-300' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                                >
                                    {t}
                                    {docType === t && <CheckCircle size={16} className="text-brand-500" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4 mb-6 flex-1">
                        <div>
                            <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Target Role / Job Title</label>
                            <input
                                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white"
                                placeholder="e.g. Software Engineer"
                                value={formData.role}
                                onChange={e => setFormData({ ...formData, role: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Company Name</label>
                            <input
                                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white"
                                placeholder="e.g. Google UK"
                                value={formData.company}
                                onChange={e => setFormData({ ...formData, company: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Years of Experience</label>
                            <input
                                type="number"
                                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white"
                                placeholder="e.g. 5"
                                value={formData.experience}
                                onChange={e => setFormData({ ...formData, experience: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Education</label>
                            <input
                                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white"
                                placeholder="e.g. Bachelor's in Computer Science"
                                value={formData.education}
                                onChange={e => setFormData({ ...formData, education: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Key Skills (Comma separated)</label>
                            <textarea
                                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm h-24 resize-none outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white"
                                placeholder="e.g. React, Leadership, English C1"
                                value={formData.skills}
                                onChange={e => setFormData({ ...formData, skills: e.target.value })}
                            />
                        </div>
                    </div>

                    <LiveButton onClick={handleGenerate} disabled={isGenerating} loading={isGenerating} icon={Sparkles} className="w-full">
                        {isGenerating ? t.tools.typing : `${t.tools.gen} Document`}
                    </LiveButton>
                </AnimatedCard>
            </div>

            <div className="md:col-span-8">
                <AnimatedCard className="h-full flex flex-col bg-slate-50 dark:bg-slate-900 font-mono relative overflow-hidden border-2 border-dashed border-slate-200 dark:border-slate-800">
                    <div className="absolute top-0 left-0 w-full bg-slate-100 dark:bg-slate-800 p-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4">
                        <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-400"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                            <div className="w-3 h-3 rounded-full bg-green-400"></div>
                        </div>
                        <span className="text-xs text-slate-400 font-sans font-bold uppercase flex items-center gap-2">
                            {docType.replace(' ', '_')}.pdf <FileCheck size={14} />
                        </span>
                    </div>

                    <div className="mt-8 flex-1 p-6 whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300 overflow-y-auto">
                        {generatedContent ? (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                {generatedContent}
                            </motion.div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 italic opacity-70">
                                <Edit3 size={48} className="mb-4 opacity-20" />
                                <p>Fill the form and click Generate...</p>
                            </div>
                        )}
                        {isGenerating && <span className="inline-block w-2 h-4 bg-brand-500 ml-1 animate-pulse"></span>}
                    </div>

                    {generatedContent && !isGenerating && (
                        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="absolute bottom-6 right-6 flex gap-2">
                            <LiveButton variant="secondary" icon={RefreshCw} onClick={() => { setGeneratedContent(""); setIsGenerating(false); }}>{t.tools.clear}</LiveButton>
                            <LiveButton variant="secondary" icon={Download} onClick={() => {
                                const printWindow = window.open('', '', 'width=800,height=600');
                                if (printWindow) {
                                    printWindow.document.write(`
                     <html>
                       <head>
                         <title>${docType}</title>
                         <style>
                           body { font-family: sans-serif; padding: 40px; line-height: 1.6; white-space: pre-wrap; }
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
                            }}>Print / PDF</LiveButton>
                            <LiveButton variant="primary" icon={Download} onClick={() => {
                                const blob = new Blob([generatedContent], { type: 'text/plain;charset=utf-8' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `${docType.replace(' ', '_')}_${new Date().toISOString().slice(0, 10)}.txt`;
                                a.click();
                                URL.revokeObjectURL(url);
                                toast({ title: t.tools.dl, description: "Document downloaded successfully", className: "bg-green-50 text-green-900 border-green-200" });
                            }}>{t.tools.dl} (.txt)</LiveButton>
                        </motion.div>
                    )}
                </AnimatedCard>
            </div>
        </motion.div>
    );
};
