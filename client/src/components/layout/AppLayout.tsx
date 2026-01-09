import React, { useState } from 'react';
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { motion, AnimatePresence } from 'framer-motion';
import {
    LogOut, Menu, X, Globe, ChevronRight, LayoutDashboard
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarItem {
    id: string;
    label: string;
    icon: React.ElementType;
}

interface AppLayoutProps {
    children: React.ReactNode;
    navItems: SidebarItem[];
    activeTab: string;
    onTabChange: (id: string) => void;
    title: string;
    subtitle?: string;
    actions?: React.ReactNode;
}

export function AppLayout({
    children,
    navItems,
    activeTab,
    onTabChange,
    title,
    subtitle,
    actions
}: AppLayoutProps) {
    const { user, logout } = useAuth();
    const { t } = useI18n();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [, setLocation] = useLocation();

    return (
        <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-950 transition-colors duration-500 overflow-hidden relative">
            <div className="absolute inset-0 bg-white/10 dark:bg-black/10 backdrop-blur-[1px] pointer-events-none z-0" />

            {/* Mobile Menu Backdrop */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <motion.aside
                className={cn(
                    "fixed md:static inset-y-0 left-0 z-50 w-72 glass-sidebar flex flex-col md:translate-x-0 transition-transform duration-300 shadow-2xl md:shadow-none",
                    isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {/* Logo Area */}
                <div className="h-24 flex items-center px-8 border-b border-white/20 dark:border-white/5">
                    <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setLocation('/')}>
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-brand-500/20 group-hover:scale-110 transition-transform duration-300">
                            <Globe size={20} />
                        </div>
                        <div>
                            <h1 className="font-bold text-lg tracking-tight text-slate-900 dark:text-white leading-tight">
                                ImmigrationAI
                            </h1>
                            <p className="text-[10px] uppercase font-bold text-brand-500 tracking-widest">Premium</p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto px-4 py-8 space-y-2 no-scrollbar">
                    {navItems.map((item) => {
                        const isActive = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => {
                                    onTabChange(item.id);
                                    setIsMobileMenuOpen(false);
                                }}
                                className={cn(
                                    "w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group relative overflow-hidden",
                                    isActive
                                        ? "text-white shadow-lg shadow-brand-500/25"
                                        : "text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                                )}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="activeTabBg"
                                        className="absolute inset-0 bg-brand-600 dark:bg-brand-600 z-0"
                                        initial={false}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                )}
                                {item.icon && <item.icon size={20} className="relative z-10 shrink-0" />}
                                <span className="relative z-10 font-medium tracking-wide text-sm">{item.label}</span>
                                {isActive && (
                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="ml-auto relative z-10"
                                    >
                                        <ChevronRight size={16} />
                                    </motion.div>
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="p-6 border-t border-white/20 dark:border-white/5 space-y-4">
                    <div className="p-4 rounded-3xl bg-white/40 dark:bg-slate-800/40 border border-white/20 dark:border-white/5 backdrop-blur-md flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
                            {user?.name?.[0] || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold truncate text-slate-900 dark:text-white">{user?.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate capitalize">{user?.role}</p>
                        </div>
                    </div>

                    <button
                        onClick={() => logout()}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                    >
                        <LogOut size={14} /> {t?.nav?.logout || "Logout"}
                    </button>
                </div>
            </motion.aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0 relative z-10 overflow-hidden">
                {/* Header */}
                <header className="h-24 px-8 flex items-center justify-between shrink-0 glass-panel md:bg-transparent md:border-none md:shadow-none md:backdrop-filter-none">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="md:hidden p-2 text-slate-600 dark:text-slate-300"
                        >
                            <Menu size={24} />
                        </button>
                        <div>
                            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{title}</h2>
                            {subtitle && <p className="text-slate-500 font-medium">{subtitle}</p>}
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {actions}
                        <div className="hidden md:block">
                            <ThemeToggle />
                        </div>
                    </div>
                </header>

                {/* Content Scroll Area */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-10 pt-4">
                    <div className="max-w-7xl mx-auto h-full space-y-8">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                                className="h-full"
                            >
                                {children}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </main>
        </div>
    );
}
