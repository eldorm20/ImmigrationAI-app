import React from 'react';
import { cn } from '@/lib/utils';
import { buttonVariants, transitions } from '@/lib/design-system';
import { Loader2 } from 'lucide-react';

interface GradientButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'ghost' | 'success' | 'danger';
    loading?: boolean;
    icon?: React.ReactNode;
    iconPosition?: 'left' | 'right';
}

export function GradientButton({
    children,
    variant = 'primary',
    loading = false,
    icon,
    iconPosition = 'left',
    className,
    disabled,
    ...props
}: GradientButtonProps) {
    const variantStyle = buttonVariants[variant];

    return (
        <button
            className={cn(
                'relative px-6 py-3 rounded-xl font-medium transition-all',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'flex items-center justify-center gap-2',
                className
            )}
            style={{
                background: variantStyle.background,
                color: variantStyle.color,
                border: variantStyle.border,
                boxShadow: variantStyle.shadow,
                transition: transitions.base,
            }}
            disabled={disabled || loading}
            {...props}
        >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {!loading && icon && iconPosition === 'left' && icon}
            {children}
            {!loading && icon && iconPosition === 'right' && icon}
        </button>
    );
}
