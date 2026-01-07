import React from "react";
import { useI18n } from "@/lib/i18n";
import { CheckCircle, Globe, Send, Clock, ShieldCheck, Mail } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { AnimatedCard } from "@/components/ui/live-elements";
import { motion } from "framer-motion";

interface SubmissionStatusViewProps {
    application: any;
}

export const SubmissionStatusView: React.FC<SubmissionStatusViewProps> = ({ application }) => {
    const { t } = useI18n();

    if (!application) return null;

    const formattedDate = application.updatedAt
        ? new Date(application.updatedAt).toLocaleDateString()
        : new Date().toLocaleDateString();

    // Mapping steps for the timeline
    const steps = [
        { title: t?.roadmap?.lawyerReview || "Lawyer Review", date: formattedDate, status: 'completed', icon: ShieldCheck },
        { title: t?.roadmap?.submission || "Submission", date: formattedDate, status: 'completed', icon: Send },
        { title: "Government Processing", date: "Ongoing", status: 'current', icon: Globe },
        { title: "Final Decision", date: "TBD", status: 'pending', icon: CheckCircle },
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-8 py-8">
            <AnimatedCard className="text-center p-12 bg-green-500/5 border-green-500/20 overflow-hidden relative">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="mx-auto w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-green-500/20"
                >
                    <CheckCircle className="text-white" size={48} />
                </motion.div>

                <h1 className="text-4xl font-black mb-4 bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-emerald-600">
                    {t.dashStatus?.submitted_to_gov || "Officially Submitted"}
                </h1>
                <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                    Your immigration application has been officially submitted to the government authorities.
                    Our legal team has verified all details for maximum success probability.
                </p>

                {/* Decorative Elements */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-green-500/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
            </AnimatedCard>

            <div className="grid md:grid-cols-2 gap-8">
                <GlassCard className="p-8">
                    <h3 className="font-bold text-xl mb-6 flex items-center gap-2">
                        <Clock className="text-brand-500" size={24} />
                        Current Journey Status
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
                                    <h4 className={`font-bold ${step.status === 'completed' ? 'text-green-600' : step.status === 'current' ? 'text-brand-600' : 'text-slate-400'}`}>
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
                            Next Steps
                        </h3>
                        <ul className="space-y-4 text-slate-600 dark:text-slate-400">
                            <li className="flex gap-3">
                                <span className="w-6 h-6 rounded-full bg-brand-500/10 text-brand-600 flex items-center justify-center text-xs font-black shrink-0">1</span>
                                <p>Monitor your email for official government correspondence or requests for additional biometric data.</p>
                            </li>
                            <li className="flex gap-3">
                                <span className="w-6 h-6 rounded-full bg-brand-500/10 text-brand-600 flex items-center justify-center text-xs font-black shrink-0">2</span>
                                <p>Our legal team will continue to monitor the case status and notify you of any updates via the platform.</p>
                            </li>
                            <li className="flex gap-3">
                                <span className="w-6 h-6 rounded-full bg-brand-500/10 text-brand-600 flex items-center justify-center text-xs font-black shrink-0">3</span>
                                <p>Estimated processing time: <strong>4-8 weeks</strong> (Subject to government backlogs).</p>
                            </li>
                        </ul>
                    </GlassCard>

                    <GlassCard className="p-8 bg-brand-600 text-white">
                        <h4 className="font-black text-lg mb-2">Need Assistance?</h4>
                        <p className="text-white/80 mb-6 text-sm">Our lawyers are available via the messaging panel for any queries regarding your official submission.</p>
                        <button className="w-full py-4 bg-white text-brand-600 font-bold rounded-2xl hover:bg-white/90 transition-all shadow-xl shadow-black/10 text-lg">
                            Contact Legal Team
                        </button>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
};
