import React, { ElementType } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "glass" | "neon" | "success" | "danger" | "shine";

interface LiveButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  variant?: Variant;
  className?: string;
  disabled?: boolean;
  icon?: ElementType;
  loading?: boolean;
  size?: "sm" | "md" | "lg" | "icon";
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-gradient-to-r from-brand-600 to-blue-500 text-white shadow-lg shadow-brand-500/30 hover:shadow-brand-500/50 border border-brand-400/20",
  secondary: "bg-white/80 dark:bg-slate-800/80 backdrop-blur-md text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800",
  ghost: "text-slate-600 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/50",
  outline: "border-2 border-brand-500 text-brand-600 hover:bg-brand-50",
  glass: "bg-white/40 dark:bg-black/40 backdrop-blur-xl backdrop-saturate-150 border border-white/20 text-white hover:bg-white/60 transition-all shadow-xl",
  neon: "bg-slate-900 border border-brand-500 text-brand-400 shadow-[0_0_10px_rgba(37,99,235,0.3)] hover:shadow-[0_0_20px_rgba(37,99,235,0.6)] hover:bg-slate-800",
  success: "bg-green-600 text-white shadow-lg shadow-green-500/20 hover:bg-green-700 border-transparent",
  danger: "bg-red-600 text-white shadow-lg shadow-red-500/20 hover:bg-red-700 border-transparent",
  shine: "bg-gradient-to-r from-violet-600 via-pink-500 to-indigo-600 bg-300% animate-shine text-white shadow-xl shadow-indigo-500/30 border border-white/20"
};

const SIZE_CLASSES: Record<"sm" | "md" | "lg" | "icon", string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-5 py-3 text-base",
  lg: "px-8 py-4 text-lg",
  icon: "p-0 w-12 h-12"
};

export const LiveButton: React.FC<LiveButtonProps> = ({ children, onClick, variant = "primary", className = "", disabled = false, icon: Icon, loading = false, size = "md", ...props }) => {
  const IconComp = Icon as ElementType | undefined;

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.05, y: disabled ? 0 : -2 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      onClick={onClick}
      disabled={disabled || loading}
      className={`relative overflow-hidden rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant]} ${className} ${disabled ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
      {...(props as any)}
    >
      {loading ? <Loader2 className="animate-spin w-5 h-5" /> : IconComp && <IconComp className="w-5 h-5" />}
      <span className="relative z-10">{children}</span>
      {(variant === 'primary' || variant === 'neon') && !disabled && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          initial={{ x: '-100%' }}
          whileHover={{ x: '100%' }}
          transition={{ duration: 0.6 }}
        />
      )}
    </motion.button>
  );
};

interface AnimatedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  hoverEffect?: boolean;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({ children, className = "", delay = 0, onClick, hoverEffect = true, ...props }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    // viewport={{ once: true, margin: "0px" }} // Disabled for mobile reliability
    whileHover={hoverEffect ? { y: -5, boxShadow: "0 20px 40px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" } : undefined}
    transition={{ duration: 0.5, delay, ease: "easeOut" }}
    onClick={onClick}
    className={`glass-card rounded-2xl border border-white/40 dark:border-white/10 p-6 ${className}`}
    {...(props as any)}
  >
    {children}
  </motion.div>
);

export const GlassInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input
    {...props}
    className={`bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 ${props.className || ""}`}
  />
);

export const GlassSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ children, ...props }) => (
  <select
    {...props}
    className={`bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all text-slate-900 dark:text-white appearance-none cursor-pointer ${props.className || ""}`}
  >
    {children}
  </select>
);

export { StaggerContainer } from "./stagger-container";
