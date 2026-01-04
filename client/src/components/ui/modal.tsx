/**
 * Modal/Dialog Component
 * Premium modal with glassmorphism and smooth animations
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { designSystem } from '@/lib/design-system';

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    showCloseButton?: boolean;
}

const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-7xl',
};

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    size = 'md',
    showCloseButton = true,
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: 'spring', duration: 0.5 }}
                            className={`${sizeClasses[size]} w-full pointer-events-auto`}
                        >
                            <div
                                className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-white/20 dark:border-white/10 overflow-hidden"
                                style={{
                                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                                }}
                            >
                                {/* Header */}
                                {(title || showCloseButton) && (
                                    <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
                                        {title && (
                                            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                                {title}
                                            </h2>
                                        )}
                                        {showCloseButton && (
                                            <button
                                                onClick={onClose}
                                                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                            >
                                                <X size={24} />
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Content */}
                                <div className="p-6">{children}</div>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};

export default Modal;
