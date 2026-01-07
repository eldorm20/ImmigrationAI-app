import { useI18n } from "@/lib/i18n";
import { LiveButton, AnimatedCard } from "@/components/ui/live-elements";
import { UserPlus, Users, Building2, Lock, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";

export function AgencyView() {
    const { user } = useAuth();
    const { t } = useI18n();

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto space-y-10 pb-12"
        >
            {/* Header */}
            <div className="text-center space-y-4">
                <div className="w-24 h-24 mx-auto mb-6 rounded-[2rem] bg-gradient-to-br from-brand-600 to-indigo-600 flex items-center justify-center shadow-2xl shadow-brand-500/30 rotate-3 hover:rotate-0 transition-transform duration-500">
                    <Building2 size={44} className="text-white" />
                </div>
                <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">{t.agency.title}</h2>
                <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto font-medium italic">
                    {t.agency.desc}
                </p>
            </div>

            {/* Coming Soon Card */}
            <AnimatedCard className="glass-premium p-12 rounded-[3rem] border-none shadow-2xl relative overflow-hidden text-center">
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -mr-32 -mt-32"></div>

                <div className="w-20 h-20 mx-auto mb-8 rounded-[1.5rem] bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-xl shadow-amber-500/20">
                    <Sparkles size={36} className="text-white" />
                </div>

                <h3 className="text-3xl font-black mb-4 text-slate-900 dark:text-white">{t.agency.comingSoon}</h3>
                <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto mb-12 font-medium">
                    {t.agency.comingSoonDesc}
                </p>

                <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto text-left relative z-10">
                    <motion.div whileHover={{ y: -5 }} className="flex items-start gap-4 p-6 rounded-[2rem] bg-white/40 dark:bg-slate-900/40 border border-white/20 shadow-sm">
                        <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center shrink-0">
                            <UserPlus size={24} className="text-brand-500" />
                        </div>
                        <div>
                            <h4 className="font-black text-slate-900 dark:text-white mb-1">{t.agency.invite.title}</h4>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-tight">{t.agency.invite.desc}</p>
                        </div>
                    </motion.div>

                    <motion.div whileHover={{ y: -5 }} className="flex items-start gap-4 p-6 rounded-[2rem] bg-white/40 dark:bg-slate-900/40 border border-white/20 shadow-sm">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center shrink-0">
                            <Users size={24} className="text-indigo-500" />
                        </div>
                        <div>
                            <h4 className="font-black text-slate-900 dark:text-white mb-1">{t.agency.roles.title}</h4>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-tight">{t.agency.roles.desc}</p>
                        </div>
                    </motion.div>

                    <motion.div whileHover={{ y: -5 }} className="flex items-start gap-4 p-6 rounded-[2rem] bg-white/40 dark:bg-slate-900/40 border border-white/20 shadow-sm">
                        <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center shrink-0">
                            <Building2 size={24} className="text-purple-500" />
                        </div>
                        <div>
                            <h4 className="font-black text-slate-900 dark:text-white mb-1">{t.agency.assignment.title}</h4>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-tight">{t.agency.assignment.desc}</p>
                        </div>
                    </motion.div>

                    <motion.div whileHover={{ y: -5 }} className="flex items-start gap-4 p-6 rounded-[2rem] bg-white/40 dark:bg-slate-900/40 border border-white/20 shadow-sm">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                            <Lock size={24} className="text-emerald-500" />
                        </div>
                        <div>
                            <h4 className="font-black text-slate-900 dark:text-white mb-1">{t.agency.collab.title}</h4>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-tight">{t.agency.collab.desc}</p>
                        </div>
                    </motion.div>
                </div>
            </AnimatedCard>

            {/* Current User Info */}
            <AnimatedCard delay={0.1} className="glass-premium p-8 rounded-[2.5rem] border-none shadow-xl">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                    {t.agency.account}
                </h3>
                <div className="flex items-center gap-6 p-6 bg-white/30 dark:bg-slate-900/30 rounded-[2rem] border border-white/10">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-brand-500/20">
                        {user?.firstName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
                    </div>
                    <div>
                        <div className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                            {user?.firstName} {user?.lastName}
                        </div>
                        <div className="text-sm text-slate-500 font-bold">{user?.email}</div>
                    </div>
                    <div className="ml-auto">
                        <span className="px-5 py-2 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 font-black text-[10px] uppercase tracking-widest border border-brand-500/20">
                            {user?.role || "Member"}
                        </span>
                    </div>
                </div>
            </AnimatedCard>

            {/* Pricing Hint */}
            <motion.div
                whileHover={{ scale: 1.01 }}
                className="bg-gradient-to-r from-brand-600 to-indigo-600 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-brand-500/20 relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                <div className="relative z-10">
                    <h4 className="text-2xl font-black mb-3 italic">{t.agency.enterprise}</h4>
                    <p className="text-brand-100 font-medium leading-relaxed max-w-2xl text-lg">
                        {t.agency.enterpriseDesc}
                    </p>
                    <LiveButton variant="shine" className="mt-8 bg-white text-brand-600 font-black px-8 py-3 rounded-xl hover:bg-brand-50 border-none h-auto">
                        Contact Sales
                    </LiveButton>
                </div>
            </motion.div>
        </motion.div>
    );
}
