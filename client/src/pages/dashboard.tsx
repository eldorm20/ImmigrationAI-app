import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { 
  LayoutDashboard, FileText, MessageSquare, LogOut, CheckCircle, Circle, 
  ArrowRight, Download, Send, User, X, Sparkles, Briefcase,
  Loader2, ChevronRight, Globe, Zap, FileCheck, RefreshCw, Edit3, Check,
  Upload, Languages, FileUp, Trash2, Eye, Book, Settings, CreditCard, Bell, BadgeCheck
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { LiveButton, AnimatedCard } from "@/components/ui/live-elements";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { apiRequest } from "@/lib/api";
import { error as logError } from "@/lib/logger";
import { trackEvent } from "../lib/analytics";
import ConsultationPanel from "@/components/consultation-panel";
import MessagingPanel from "@/components/messaging-panel";

// --- Main Dashboard Component ---

export default function UserDash() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const [activeTab, setActiveTab] = useState('roadmap');
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const tabs = ['roadmap', 'docs', 'upload', 'translate', 'chat', 'messages', 'lawyer', 'research'];
        const currentIndex = tabs.indexOf(activeTab);
        const nextTabId = tabs[(currentIndex + 1) % tabs.length];
        setActiveTab(nextTabId);
        toast({ title: t.dash?.tabSwitched || "Tab Switched", description: t.dash?.[nextTabId] || `Switched to ${nextTabId}`, className: "bg-blue-50 text-blue-900 border-blue-200" });
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [activeTab, toast]);
  
  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 flex flex-col md:flex-row overflow-hidden transition-colors duration-300">
      
      {/* Sidebar */}
      <motion.aside 
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-full md:w-72 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800 flex flex-col h-screen sticky top-0 z-20 shadow-sm"
      >
        <div className="p-8 flex justify-between items-center">
          <motion.div 
            className="flex items-center gap-3 font-extrabold text-2xl tracking-tight cursor-pointer"
            whileHover={{ scale: 1.05 }}
            onClick={() => window.location.href = "/"}
          >
             <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-500/30">
               <Globe size={20} />
             </div>
             <span className="text-slate-900 dark:text-white hidden md:inline">{t.brand.name}</span>
          </motion.div>
          <div className="md:hidden">
             <ThemeToggle />
          </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          {[
            { id: 'roadmap', icon: LayoutDashboard, label: t.dash.roadmap },
            { id: 'docs', icon: FileText, label: t.dash.docs },
            { id: 'employer', icon: BadgeCheck, label: 'Employer Verification' },
            { id: 'upload', icon: Upload, label: t.dash.upload },
            { id: 'translate', icon: Globe, label: t.dash.translate },
            { id: 'chat', icon: MessageSquare, label: t.dash.chat },
            { id: 'messages', icon: Send, label: t.dash.messages },
            { id: 'lawyer', icon: Briefcase, label: t.dash.lawyer },
            { id: 'research', icon: Book, label: t.dash.research }
          ].map(item => (
            <motion.button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              whileHover={{ x: 5 }}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-bold transition-all relative overflow-hidden ${activeTab === item.id ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
            >
              {activeTab === item.id && (
                <motion.div 
                  layoutId="activeTabIndicator"
                  className="absolute left-0 w-1 h-8 bg-brand-600 rounded-r-full"
                />
              )}
              <span className="relative z-10 flex items-center gap-3">
                <item.icon size={20} className={activeTab === item.id ? "text-brand-600 dark:text-brand-400" : ""} /> 
                {item.label}
              </span>
            </motion.button>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <div className="flex items-center gap-4 mb-6 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-brand-500 to-purple-500 p-[2px]">
              <div className="w-full h-full bg-white dark:bg-slate-900 rounded-full flex items-center justify-center font-bold text-xs text-slate-900 dark:text-white">
                {user.name[0]}
              </div>
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-bold truncate text-slate-900 dark:text-white">{user.name}</p>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
          <LiveButton 
            variant="ghost" 
            className="w-full justify-start text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/20" 
            onClick={() => setLocation("/subscription")}
            icon={CreditCard}
          >
            {t.subscription?.manage || "Subscription"}
          </LiveButton>
          <LiveButton 
            variant="ghost" 
            className="w-full justify-start text-purple-600 hover:bg-purple-50 hover:text-purple-700 dark:hover:bg-purple-900/20" 
            onClick={() => setLocation("/notifications")}
            icon={Bell}
          >
            {t.settings?.notificationPreferences || "Notifications"}
          </LiveButton>
          <LiveButton 
            variant="ghost" 
            className="w-full justify-start text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800" 
            onClick={() => setLocation("/settings")}
            icon={Settings}
          >
            {t.settings?.title || "Settings"}
          </LiveButton>
          <LiveButton 
            variant="ghost" 
            className="w-full justify-start text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20" 
            onClick={logout} 
            icon={LogOut}
          >
            {t.dash.logout}
          </LiveButton>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto relative">
        {/* Background Elements */}
        <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-brand-50/50 to-transparent dark:from-brand-900/10 pointer-events-none" />
        
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 relative z-10 gap-4">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl font-extrabold tracking-tight mb-2 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
              {t.dash.welcome} {user.name}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              {t.dashStatus?.label || 'Immigration Status:'} <span className="text-brand-600 dark:text-brand-400 font-bold">{t.dashStatus?.active || 'Active'}</span>
            </p>
          </motion.div>
          <div className="flex items-center gap-4">
             <div className="hidden md:block"><ThemeToggle /></div>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'roadmap' && <RoadmapView key="roadmap" setActiveTab={setActiveTab} toast={toast} />}
          {activeTab === 'docs' && <DocsView key="docs" />}
          {activeTab === 'employer' && <EmployerVerificationView key="employer" />}
          {activeTab === 'upload' && <UploadView key="upload" />}
          {activeTab === 'translate' && <TranslateView key="translate" />}
          {activeTab === 'chat' && <ChatView key="chat" />}
          {activeTab === 'messages' && <MessagingPanel key="messages" />}
          {activeTab === 'lawyer' && <ConsultationPanel key="lawyer" />}
          {activeTab === 'research' && (
            <motion.div key="research" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-20">
              <AnimatedCard className="max-w-md mx-auto">
                <Book className="w-16 h-16 mx-auto mb-4 text-brand-500" />
                <h3 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">{t.research.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                  {t.research.subtitle}
                </p>
                <LiveButton onClick={() => {
                  setLocation('/research');
                }} icon={Book}>
                  {t.research.title}
                </LiveButton>
              </AnimatedCard>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// --- Sub-Views ---

type ToastHandler = ReturnType<typeof import('@/hooks/use-toast').toast>;

interface RoadmapItem {
  id?: string;
  title: string;
  status?: string;
  description?: string;
}

interface ApplicationSummary {
  id: string;
  status?: string;
}

const RoadmapView = ({ setActiveTab, toast }: { setActiveTab: (tab: string) => void; toast: ToastHandler }) => {
  const { user } = useAuth();
  const { t } = useI18n();
  const [application, setApplication] = useState<ApplicationSummary | null>(null);
  const [roadmapItems, setRoadmapItems] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const loadRoadmapData = async () => {
      try {
        setLoading(true);
        // Fetch user's applications
        const appData = await apiRequest<ApplicationSummary[]>('/applications');
        if (appData && appData.length > 0) {
          const activeApp = appData[0]; // Get first application
          setApplication(activeApp);

          // Fetch roadmap items for this application
          const items = await apiRequest<RoadmapItem[]>(`/roadmap/application/${activeApp.id}`);
          setRoadmapItems(items || []);

          // Calculate progress
          const completed = (items || []).filter((i) => i.status === 'completed').length;
          const total = (items || []).length || 1;
          setProgress(Math.round((completed / total) * 100));
        }
      } catch (error) {
        logError('Failed to load roadmap:', error);
        setProgress(35); // Fallback for demo
      } finally {
        setLoading(false);
      }
    };

    loadRoadmapData();
  }, []);

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
        <AnimatedCard>
          <div className="flex items-center justify-center p-12">
            <Loader2 className="animate-spin" />
          </div>
        </AnimatedCard>
      </motion.div>
    );
  }

  const items = roadmapItems.length > 0 ? roadmapItems : [
    { title: t.roadmap?.eligibility || 'Eligibility Assessment', status: 'done', description: t.roadmap?.defaults?.eligibilityDesc || 'Passed with 85 points' },
    { title: t.roadmap?.collection || 'Document Collection', status: 'current', description: t.roadmap?.defaults?.collectionDesc || 'Passport, Degree, TB Test' },
    { title: t.roadmap?.translation || 'Official Translation', status: 'pending', description: t.roadmap?.defaults?.translationDesc || 'Notarized translations required' },
    { title: t.roadmap?.submission || 'Visa Application Submission', status: 'pending', description: t.roadmap?.defaults?.submissionDesc || 'Home Office portal' }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="space-y-8"
    >
      <AnimatedCard className="border-l-4 border-brand-500 bg-gradient-to-r from-white to-brand-50/30 dark:from-slate-900 dark:to-brand-900/10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h3 className="font-bold text-xl flex items-center gap-2 text-slate-900 dark:text-white">
              {application?.visaType || 'Skilled Worker Visa'} ({application?.country || 'UK'})
              <span className="bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">{application?.status || 'In Progress'}</span>
            </h3>
            <p className="text-slate-500 mt-1">{t.roadmap?.applicationReference || 'Application Reference:'} #{application?.id?.slice(0, 8).toUpperCase() || 'UK-SW-2025-8842'}</p>
          </div>
            <div className="text-right">
            <div className="text-3xl font-extrabold text-brand-600 dark:text-brand-400">{progress}%</div>
            <div className="text-xs font-bold text-slate-400 uppercase">{t.roadmap?.completionLabel || 'Completion'}</div>
          </div>
        </div>
        
        <div className="w-full bg-slate-200/50 dark:bg-slate-700/50 rounded-full h-3 mb-6 overflow-hidden">
          <motion.div 
            initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1.5, ease: "easeOut" }}
            className="bg-gradient-to-r from-brand-500 to-purple-500 h-full rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)] relative"
          >
             <div className="absolute inset-0 bg-white/30 animate-[shimmer_2s_infinite] skew-x-12"></div>
          </motion.div>
        </div>
        
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2">
          <Zap size={16} className="text-yellow-500 fill-yellow-500" /> 
          {t.roadmap?.nextStepLabel || 'Next Step:'} <span className="font-bold">{items.find(i => i.status === 'current')?.title || (t.roadmap?.defaults?.submissionDesc || 'Complete Application')}</span>
        </p>
      </AnimatedCard>

      <div className="grid gap-4">
        {items.map((step: RoadmapItem, i: number) => (
          <AnimatedCard 
            key={i} 
            delay={i * 0.1} 
            className={`p-0 overflow-hidden transition-all cursor-pointer ${step.status === 'current' ? 'ring-2 ring-brand-500 ring-offset-2 dark:ring-offset-slate-950' : 'opacity-80 hover:opacity-100'} ${step.status !== 'pending' ? 'hover:shadow-lg' : ''}`}
            onClick={() => step.status !== 'pending' && (
              step.title.includes('Document') ? setActiveTab('upload') : 
              step.title.includes('Translation') ? setActiveTab('translate') : null
            )}
          >
             <div className={`p-5 flex items-center gap-5 ${step.status === 'current' ? 'bg-white dark:bg-slate-800' : 'bg-slate-50/50 dark:bg-slate-900/50'}`}>
               {step.status === 'done' || step.status === 'completed' ? (
                 <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 flex items-center justify-center shadow-sm">
                   <CheckCircle size={20} />
                 </div>
               ) : step.status === 'current' ? (
                 <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 flex items-center justify-center shadow-sm relative">
                   <div className="absolute inset-0 bg-brand-500 rounded-full opacity-20 animate-ping"></div>
                   <Loader2 size={20} className="animate-spin" />
                 </div>
               ) : (
                 <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
                   <Circle size={20} />
                 </div>
               )}
               
               <div className="flex-1">
                 <h4 className={`font-bold text-lg ${step.status === 'pending' ? 'text-slate-500' : 'text-slate-900 dark:text-white'}`}>{step.title}</h4>
                 <p className="text-sm text-slate-500">{step.description || step.desc}</p>
               </div>
               
                 {step.status === 'current' && (
                 <LiveButton size="sm" className="h-10 px-6 text-sm" onClick={() => {
                   toast({ 
                     title: t.tools?.nextStep || "Next Step", 
                     description: `${t.roadmap?.starting || 'Starting'} ${step.title}...`,
                     className: "bg-blue-50 text-blue-900 border-blue-200"
                   });
                 }}>
                   {t.tools?.next || 'Next'} <ArrowRight size={16} />
                 </LiveButton>
               )}
             </div>
          </AnimatedCard>
        ))}
      </div>
    </motion.div>
  );
};

const EmployerVerificationView = () => {
  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="w-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-2xl p-8"
    >
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <BadgeCheck className="w-16 h-16 mx-auto mb-4 text-blue-600 dark:text-blue-400" />
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Employer Verification
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Verify employers across European company registries to validate employment information for visa applications
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="p-6 bg-white dark:bg-slate-800 rounded-lg border border-blue-200 dark:border-blue-900 shadow-sm dark:shadow-black/30">
            <CheckCircle className="w-8 h-8 text-blue-600 dark:text-blue-400 mb-3" />
            <h3 className="font-bold text-slate-900 dark:text-white mb-2">UK Companies</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">Verify against Companies House registry</p>
          </div>
          <div className="p-6 bg-white dark:bg-slate-800 rounded-lg border border-green-200 dark:border-green-900 shadow-sm dark:shadow-black/30">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400 mb-3" />
            <h3 className="font-bold text-slate-900 dark:text-white mb-2">German Companies</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">Verify against HWR Register</p>
          </div>
        </div>

        <div className="text-center">
          <LiveButton
            variant="primary"
            onClick={() => window.location.href = '/employer-verification'}
            className="inline-flex items-center gap-2"
          >
            <BadgeCheck size={18} />
            Go to Employer Verification
          </LiveButton>
        </div>
      </div>
    </motion.div>
  );
};

const DocsView = () => {
  const [docType, setDocType] = useState('Motivation Letter');
  const [generatedContent, setGeneratedContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState({ role: '', company: '', skills: '', name: '', experience: '', education: '', achievements: '' });
  const { user } = useAuth();
  const { toast } = useToast();
  const { t, lang } = useI18n();

  const generateMotivationLetter = (data: Record<string, unknown>) => {
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

  const generateCVEnhancement = (data: Record<string, unknown>) => {
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

  const generateReferenceLetter = (data: Record<string, unknown>) => {
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
  const templates: Record<TemplateKey, (data: Record<string, unknown>) => string> = {
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
        });

        const targetText = resp.document || "";
        try { trackEvent('ai_document_generated', { template: docType, language: lang || 'en', length: (targetText || '').length }); } catch {};
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
                 onChange={e => setFormData({...formData, role: e.target.value})}
               />
             </div>
             <div>
               <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Company Name</label>
               <input 
                 className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white" 
                 placeholder="e.g. Google UK" 
                 value={formData.company}
                 onChange={e => setFormData({...formData, company: e.target.value})}
               />
             </div>
             <div>
               <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Years of Experience</label>
               <input 
                 type="number"
                 className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white" 
                 placeholder="e.g. 5"
                 value={formData.experience}
                 onChange={e => setFormData({...formData, experience: e.target.value})}
               />
             </div>
             <div>
               <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Education</label>
               <input 
                 className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white" 
                 placeholder="e.g. Bachelor's in Computer Science"
                 value={formData.education}
                 onChange={e => setFormData({...formData, education: e.target.value})}
               />
             </div>
             <div>
               <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Key Skills (Comma separated)</label>
               <textarea 
                 className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm h-24 resize-none outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white" 
                 placeholder="e.g. React, Leadership, English C1" 
                 value={formData.skills}
                 onChange={e => setFormData({...formData, skills: e.target.value})}
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
                {docType.replace(' ', '_')}.pdf <FileCheck size={14}/>
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
               <LiveButton variant="primary" icon={Download} onClick={() => {
                 const blob = new Blob([generatedContent], { type: 'text/plain;charset=utf-8' });
                 const url = URL.createObjectURL(blob);
                 const a = document.createElement('a');
                 a.href = url;
                 a.download = `${docType.replace(' ', '_')}_${new Date().toISOString().slice(0,10)}.txt`;
                 a.click();
                 URL.revokeObjectURL(url);
                 toast({ title: t.tools.dl, description: "Document downloaded successfully", className: "bg-green-50 text-green-900 border-green-200" });
               }}>{t.tools.dl}</LiveButton>
             </motion.div>
           )}
        </AnimatedCard>
      </div>
    </motion.div>
  );
};

const ChatView = () => {
  const { t, lang } = useI18n();
  const [messages, setMessages] = useState([{ role: 'ai', text: "Hello! I'm your Immigration AI Assistant. Ask me anything about UK or German visas.", ts: new Date().toISOString() }]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isTyping, setIsTyping] = useState(false);

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
            history: conversationHistory  // Include conversation history
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
                  {m.role === 'ai' ? <Sparkles size={14}/> : <User size={14}/>}
                </div>
                <div className={`p-4 rounded-2xl text-sm shadow-sm leading-relaxed ${
                  m.role === 'user' 
                    ? 'bg-brand-600 text-white rounded-br-none' 
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-bl-none border border-slate-100 dark:border-slate-700'
                }`}>
                  {m.text}
                  {m.ts && (
                    <div className={`text-xs mt-2 opacity-70 ${m.role === 'user' ? 'text-white/70' : 'text-slate-400'}`}>
                      {new Date(m.ts).toLocaleTimeString()}
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
                  <Sparkles size={14}/>
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
            <LiveButton type="submit" size="icon" className="w-12 h-12 rounded-xl p-0" icon={Send} />
          </form>
          <p className="text-xs text-slate-400 mt-2 text-center">Press Cmd/Ctrl + Enter to send</p>
        </div>
      </AnimatedCard>
    </motion.div>
  );
};

const UploadView = () => {
  interface UploadedFile {
    id: string | number;
    name: string;
    size: number;
    type: string;
    uploadedAt: string;
    status: 'analyzed' | 'pending';
    url: string;
  }

  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = async (fileList: File[]) => {
    setUploading(true);
    let uploadedCount = 0;
    
    try {
      for (const file of fileList) {
        // Validate file size (10MB max)
        const MAX_FILE_SIZE = 10 * 1024 * 1024;
        if (file.size > MAX_FILE_SIZE) {
          toast({ 
            title: 'File Too Large', 
            description: `${file.name} exceeds 10MB limit`,
            className: "bg-orange-50 text-orange-900 border-orange-200",
            variant: 'destructive'
          });
          continue;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('documentType', 'application_document');

        try {
          // Use apiRequest so auth/refresh logic and error handling are consistent
          const uploadedDoc = await apiRequest<any>("/documents/upload", {
            method: 'POST',
            body: formData,
            // apiRequest now omits Content-Type when body is FormData
          });

          try { trackEvent('document_uploaded', { mimeType: uploadedDoc.mimeType, fileSize: uploadedDoc.fileSize }); } catch {};
          
          const newFile = {
            id: uploadedDoc.id,
            name: uploadedDoc.fileName,
            size: uploadedDoc.fileSize,
            type: uploadedDoc.mimeType,
            uploadedAt: uploadedDoc.createdAt || new Date().toISOString(),
            status: 'analyzed' as const,
            url: uploadedDoc.url
          };
          
          setFiles(prev => [newFile, ...prev]);
          uploadedCount++;
        } catch (fileError) {
          const errorMsg = fileError instanceof Error ? fileError.message : 'Upload failed';
          toast({ 
            title: 'Upload Error', 
            description: `${file.name}: ${errorMsg}`,
            className: "bg-red-50 text-red-900 border-red-200",
            variant: 'destructive'
          });
        }
      }
      
      setUploading(false);
      if (uploadedCount > 0) {
        toast({ 
          title: t.upload.uploadedSuccess, 
          description: `${uploadedCount} of ${fileList.length} file(s) ${t.upload.uploadedDesc}`,
          className: "bg-green-50 text-green-900 border-green-200"
        });
      }
    } catch (error) {
      setUploading(false);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      toast({ 
        title: 'Upload Error', 
        description: errorMessage,
        className: "bg-red-50 text-red-900 border-red-200",
        variant: 'destructive'
      });
    }
  };

  const deleteFile = (id: number) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    toast({ title: t.upload.deleted, description: t.upload.deletedDesc });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
      <AnimatedCard>
        <h3 className="font-bold text-xl mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
          <FileUp className="text-brand-500" /> {t.upload.title}
        </h3>
        
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
            dragActive 
              ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' 
              : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50'
          }`}
        >
          <Upload className="w-16 h-16 mx-auto mb-4 text-slate-400" />
          <h4 className="text-lg font-bold mb-2 text-slate-900 dark:text-white">{t.upload.dropFiles}</h4>
          <p className="text-slate-500 dark:text-slate-400 mb-4">{t.upload.supports}</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileInput}
            className="hidden"
            id="file-upload"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          />
          <LiveButton 
            variant="primary" 
            className="cursor-pointer" 
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? <Loader2 className="animate-spin" /> : <Upload size={18} />}
            {uploading ? t.upload.uploading : t.upload.chooseFiles}
          </LiveButton>
        </div>
      </AnimatedCard>

      {files.length > 0 && (
        <AnimatedCard>
          <h3 className="font-bold text-xl mb-4 text-slate-900 dark:text-white">{t.upload.uploaded}</h3>
          <div className="space-y-3">
            {files.map((file) => (
              <div key={file.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                    <FileText className="text-brand-600 dark:text-brand-400" size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-900 dark:text-white">{file.name}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {formatFileSize(file.size)} • {new Date(file.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400">
                    {t.upload.analyzed}
                  </span>
                </div>
                <div className="flex gap-2 ml-4">
                  <LiveButton variant="ghost" size="sm" icon={Eye} onClick={() => {
                    toast({ title: "Document Preview", description: `Previewing ${file.name}`, className: "bg-blue-50 text-blue-900 border-blue-200" });
                  }}>{t.upload.view}</LiveButton>
                  <LiveButton variant="ghost" size="sm" icon={Trash2} onClick={() => deleteFile(file.id)}>{t.upload.delete}</LiveButton>
                </div>
              </div>
            ))}
          </div>
        </AnimatedCard>
      )}
    </motion.div>
  );
};

const TranslateView = () => {
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
      const resp = await apiRequest<{ translation: string }>("/ai/translate", {
        method: "POST",
        body: JSON.stringify({ fromLang, toLang, text }),
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
    a.download = `translation_${new Date().toISOString().slice(0,10)}.txt`;
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
