import React from "react";
import { useI18n } from "@/lib/i18n";
import { CheckCircle, Globe, Send, Clock, ShieldCheck, Mail } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { AnimatedCard } from "@/components/ui/live-elements";
import { motion } from "framer-motion";

interface SubmissionStatusViewProps {
    application: any;
    onContactLegal?: () => void;
}

export const SubmissionStatusView: React.FC<SubmissionStatusViewProps> = ({ application, onContactLegal }) => {
    const { t } = useI18n();

    if (!application) return null;

    const status = application.status || 'new';

    const formattedDate = application.updatedAt
        ? new Date(application.updatedAt).toLocaleDateString()
        : new Date().toLocaleDateString();

    // Define workflow steps based on database status
    const getStepStatus = (st: string[], current: string) => {
        const currentIndex = st.indexOf(current);
        return (step: string) => {
            const stepIndex = st.indexOf(step);
            if (stepIndex < currentIndex) return 'completed';
            if (stepIndex === currentIndex) return 'current';
            return 'pending';
        };
    };

    const statusOrder = [
        'new',
        'pending',
        'in_progress',
        'pending_documents',
        'submitted',
        'under_review',
        'submitted_to_gov',
        'approved'
    ];

    const currentStatus = getStepStatus(statusOrder, status);

    const steps = [
        {
            title: t?.roadmap?.documents || "Document Phase",
            date: statusOrder.indexOf(status) > 3 ? formattedDate : "Ongoing",
            status: currentStatus('pending_documents'),
            icon: ShieldCheck
        },
        {
            title: t?.roadmap?.lawyerReview || "Lawyer Review",
            date: statusOrder.indexOf(status) > 5 ? formattedDate : (status === 'submitted' || status === 'under_review' ? "In Progress" : "TBD"),
            status: currentStatus('under_review'),
            icon: ShieldCheck
        },
        {
            title: t?.roadmap?.submission || "Official Submission",
            date: status === 'submitted_to_gov' || status === 'approved' ? formattedDate : "TBD",
            status: currentStatus('submitted_to_gov'),
            icon: Send
        },
        {
            title: t.dashStatus.final_decision,
            date: status === 'approved' ? formattedDate : "TBD",
            status: currentStatus('approved'),
            icon: CheckCircle
        },
    ];

    const getNextSteps = () => {
        const prefix = status === 'submitted_to_gov' ? 'next.submitted_to_gov' :
            (status === 'submitted' || status === 'under_review') ? 'next.review' :
                status === 'pending_documents' ? 'next.pending_docs' : 'next.default';
        return [
            t(prefix + '.1'),
            t(prefix + '.2'),
            t(prefix + '.3')
        ];
    };

    const headerContent = {
        submitted_to_gov: {
            title: t.dashStatus.submitted_to_gov,
            desc: t.dashStatus.submitted_gov_desc,
            color: "from-green-600 to-emerald-600",
            bg: "bg-green-500",
            icon: CheckCircle
        },
        under_review: {
            title: t.dashStatus.under_review,
            desc: t.dashStatus.under_review_desc,
            color: "from-blue-600 to-indigo-600",
            bg: "bg-blue-500",
            icon: ShieldCheck
        },
        pending_documents: {
            title: t.dashStatus.pending_documents,
            desc: t.dashStatus.pending_docs_desc,
            color: "from-amber-600 to-orange-600",
            bg: "bg-amber-500",
            icon: Clock
        },
        default: {
            title: t.dashStatus.case_prep,
            desc: t.dashStatus.prep_desc,
            color: "from-brand-600 to-blue-600",
            bg: "bg-brand-500",
            icon: Send
        }
    };

    const activeHeader = headerContent[status as keyof typeof headerContent] || headerContent.default;

    return (
        <div className="max-w-4xl mx-auto space-y-8 py-8 px-4">
            <AnimatedCard className={`text-center p-12 overflow-hidden relative border-none shadow-2xl bg-white dark:bg-slate-900`}>
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`mx-auto w-24 h-24 ${activeHeader.bg} rounded-full flex items-center justify-center mb-6 shadow-xl relative z-10`}
                >
                    <activeHeader.icon className="text-white" size={48} />
                </motion.div>

                <h1 className={`text-4xl font-black mb-4 bg-clip-text text-transparent bg-gradient-to-r ${activeHeader.color} relative z-10`}>
                    {activeHeader.title}
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto relative z-10">
                    {activeHeader.desc}
                </p>

                {/* Decorative Elements */}
                <div className={`absolute -top-24 -right-24 w-64 h-64 opacity-10 rounded-full blur-3xl ${activeHeader.bg}`} />
                <div className={`absolute -bottom-24 -left-24 w-64 h-64 opacity-10 rounded-full blur-3xl ${activeHeader.bg}`} />
            </AnimatedCard>

            <div className="grid md:grid-cols-2 gap-8">
                <GlassCard className="p-8">
                    <h3 className="font-bold text-xl mb-6 flex items-center gap-2">
                        <Clock className="text-brand-500" size={24} />
                        {t.dashStatus?.journey || "Journey Progress"}
                    </h3>
                    <div className="space-y-6">
                        {steps.map((step, i) => (
                            <div key={i} className="flex gap-4 relative">
                                {i < steps.length - 1 && (
                                    <div className={`absolute left-5 top-10 w-0.5 h-10 ${step.status === 'completed' ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-800'}`} />
                                )}
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-lg ${step.status === 'completed' ? 'bg-green-500 text-white' :
                                    step.status === 'current' ? 'bg-brand-500 text-white animate-pulse' :
                                        'bg-slate-100 dark:bg-slate-900 text-slate-400'
                                    }`}>
                                    <step.icon size={20} />
                                </div>
                                <div className="pt-1">
                                    <h4 className={`font-bold ${step.status === 'completed' ? 'text-green-600' :
                                        step.status === 'current' ? 'text-brand-600' :
                                            'text-slate-400'
                                        }`}>
                                        {step.title}
                                    </h4>
                                    <p className="text-sm opacity-60 font-medium">{step.date}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </GlassCard>

                <div className="space-y-6">
                    <GlassCard className="p-8 border-brand-500/10">
                        <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
                            <Mail className="text-brand-500" size={24} />
                            {t.dash.nextSteps}
                        </h3>
                        <ul className="space-y-4 text-slate-600 dark:text-slate-400">
                            {getNextSteps().map((text, i) => (
                                <li key={i} className="flex gap-3">
                                    <span className="w-6 h-6 rounded-full bg-brand-500/10 text-brand-600 flex items-center justify-center text-xs font-black shrink-0">{i + 1}</span>
                                    <p dangerouslySetInnerHTML={{ __html: text.replace(/('.+?')|(\*\*.+?\*\*)/g, '<strong>$0</strong>') }} />
                                </li>
                            ))}
                        </ul>
                    </GlassCard>

                    <GlassCard className="p-8 bg-brand-600 text-white">
                        <h4 className="font-black text-lg mb-2">{t.dash.needAssistance}</h4>
                        <p className="text-white/80 mb-6 text-sm">
                            {t.dash.legalHelpDesc}
                        </p>
                        <button
                            className="w-full py-4 bg-white text-brand-600 font-bold rounded-2xl hover:bg-white/90 active:scale-95 transition-all shadow-xl shadow-black/10 text-lg"
                            onClick={onContactLegal}
                        >
                            {t.dash.contactLegal}
                        </button>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
};
