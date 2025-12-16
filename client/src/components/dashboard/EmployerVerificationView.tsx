import React from "react";
import { LiveButton } from "@/components/ui/live-elements";
import { BadgeCheck, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

export const EmployerVerificationView = () => {
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
