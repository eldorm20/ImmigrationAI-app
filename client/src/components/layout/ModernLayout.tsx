import React from 'react';
import { motion } from 'framer-motion';

const ParticleBackground = () => {
    return (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
            {/* Dynamic Gradient Mesh */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-950 dark:via-brand-950/20 dark:to-slate-900 opacity-80" />

            {/* Floating Orbs */}
            <motion.div
                animate={{
                    x: [0, 100, 0],
                    y: [0, -50, 0],
                    opacity: [0.3, 0.6, 0.3]
                }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400/20 dark:bg-brand-500/10 rounded-full blur-3xl"
            />
            <motion.div
                animate={{
                    x: [0, -70, 0],
                    y: [0, 100, 0],
                    opacity: [0.2, 0.5, 0.2]
                }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear", delay: 2 }}
                className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-purple-400/20 dark:bg-purple-500/10 rounded-full blur-3xl"
            />

            {/* Grid Pattern Overlay */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none" />
        </div>
    );
};

export const ModernLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <div className="min-h-screen relative font-sans text-slate-900 dark:text-slate-100">
            <ParticleBackground />
            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
};
