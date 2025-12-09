import React, { ElementType } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "outline";

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
  outline: "border-2 border-brand-500 text-brand-600 hover:bg-brand-50"
};

const SIZE_CLASSES: Record<"sm" | "md" | "lg" | "icon", string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-5 py-3 text-base",
  lg: "px-8 py-4 text-lg"
  ,
  icon: "p-0 w-12 h-12"
};

export const LiveButton: React.FC<LiveButtonProps> = ({ children, onClick, variant = "primary", className = "", disabled = false, icon: Icon, loading = false, size = "md", ...props }) => {
  const IconComp = Icon as ElementType | undefined;

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02, y: disabled ? 0 : -2 }}
      whileTap={{ scale: disabled ? 1 : 0.96 }}
      onClick={onClick}
      disabled={disabled || loading}
      className={`relative overflow-hidden rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant]} ${className} ${disabled ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
      {...props}
    >
      {loading ? <Loader2 className="animate-spin w-5 h-5" /> : IconComp && <IconComp className="w-5 h-5" />}
      <span className="relative z-10">{children}</span>
      {variant === 'primary' && !disabled && (
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
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({ children, className = "", delay = 0, onClick, ...props }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay, ease: "easeOut" }}
    onClick={onClick}
    className={`glass-card rounded-2xl border border-white/40 dark:border-white/10 p-6 ${className}`}
    {...props}
  >
    {children}
  </motion.div>
);
