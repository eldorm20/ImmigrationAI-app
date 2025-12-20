import { useState } from "react";
import { LiveButton, AnimatedCard } from "@/components/ui/live-elements";
import { UserPlus, Users, Building2, Lock, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";

export function AgencyView() {
    const { user } = useAuth();

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center">
                    <Building2 size={40} className="text-white" />
                </div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Agency & Team Management</h2>
                <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
                    Manage your law firm's team members, assign cases, and collaborate efficiently.
                </p>
            </div>

            {/* Coming Soon Card */}
            <AnimatedCard className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                    <Sparkles size={32} className="text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4">Coming Soon</h3>
                <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto mb-8">
                    Team management features are being developed. Soon you'll be able to:
                </p>

                <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto text-left">
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                        <UserPlus size={20} className="text-brand-500 mt-1" />
                        <div>
                            <h4 className="font-bold text-sm">Invite Team Members</h4>
                            <p className="text-xs text-slate-500">Add associates, paralegals, and staff</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                        <Users size={20} className="text-brand-500 mt-1" />
                        <div>
                            <h4 className="font-bold text-sm">Role-Based Permissions</h4>
                            <p className="text-xs text-slate-500">Control access levels for each member</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                        <Building2 size={20} className="text-brand-500 mt-1" />
                        <div>
                            <h4 className="font-bold text-sm">Case Assignment</h4>
                            <p className="text-xs text-slate-500">Assign and track cases across your team</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                        <Lock size={20} className="text-brand-500 mt-1" />
                        <div>
                            <h4 className="font-bold text-sm">Secure Collaboration</h4>
                            <p className="text-xs text-slate-500">Share documents and notes securely</p>
                        </div>
                    </div>
                </div>
            </AnimatedCard>

            {/* Current User Info */}
            <AnimatedCard delay={0.1}>
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Users size={20} className="text-brand-500" />
                    Your Account
                </h3>
                <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-400 to-purple-500 flex items-center justify-center text-white font-bold">
                        {user?.firstName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
                    </div>
                    <div>
                        <div className="font-bold text-slate-900 dark:text-white">
                            {user?.firstName} {user?.lastName}
                        </div>
                        <div className="text-sm text-slate-500">{user?.email}</div>
                    </div>
                    <div className="ml-auto">
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 uppercase">
                            {user?.role || "Member"}
                        </span>
                    </div>
                </div>
            </AnimatedCard>

            {/* Pricing Hint */}
            <div className="bg-gradient-to-r from-brand-50 to-purple-50 dark:from-brand-900/20 dark:to-purple-900/20 rounded-2xl p-6 border border-brand-100 dark:border-brand-800">
                <h4 className="font-bold text-brand-800 dark:text-brand-300 mb-2">Enterprise Plans</h4>
                <p className="text-sm text-brand-700 dark:text-brand-400">
                    Team management features will be available on our Enterprise plan. Contact us to learn more about firm-wide solutions with unlimited seats and dedicated support.
                </p>
            </div>
        </div>
    );
}
