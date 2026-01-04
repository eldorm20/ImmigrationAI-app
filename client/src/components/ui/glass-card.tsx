import React from 'react';
import { cn } from '@/lib/utils';
import { glass, shadows, transitions } from '@/lib/design-system';

interface GlassCardProps {
    children: React.ReactNode;
    className?: string;
    variant?: 'default' | 'hover' | 'card';
    interactive?: boolean;
    onClick?: () => void;
}

export function GlassCard({
    children,
    className,
    variant = 'card',
    interactive = false,
    onClick
}: GlassCardProps) {
    const glassStyle = glass[variant];

    return (
        <div
            onClick={onClick}
            className={cn(
                'rounded-xl p-6 transition-all',
                interactive && 'cursor-pointer hover:scale-[1.02]',
                className
            )}
            style={{
                background: glassStyle.background,
                backdropFilter: glassStyle.backdropFilter,
                border: glassStyle.border,
                boxShadow: interactive ? shadows.md : 'none',
                transition: transitions.base,
            }}
        >
            {children}
        </div>
    );
}
