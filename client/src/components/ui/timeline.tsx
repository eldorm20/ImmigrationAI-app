import React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { colors, transitions } from '@/lib/design-system';

interface TimelineItem {
    id: string;
    title: string;
    description?: string;
    status: 'complete' | 'active' | 'pending';
    date?: string;
}

interface TimelineProps {
    items: TimelineItem[];
    className?: string;
}

export function Timeline({ items, className }: TimelineProps) {
    return (
        <div className={cn('relative', className)}>
            {/* Connecting line */}
            <div
                className="absolute left-4 top-0 bottom-0 w-0.5"
                style={{ background: colors.border.default }}
            />

            {items.map((item, index) => (
                <div key={item.id} className="relative pb-8 last:pb-0">
                    {/* Step indicator */}
                    <div className="flex items-start">
                        <div
                            className={cn(
                                'relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all',
                                item.status === 'complete' && 'bg-gradient-to-br from-green-500 to-green-600 border-green-500',
                                item.status === 'active' && 'bg-gradient-to-br from-purple-500 to-blue-500 border-purple-500 animate-pulse',
                                item.status === 'pending' && 'bg-zinc-800 border-zinc-700'
                            )}
                            style={{ transition: transitions.base }}
                        >
                            {item.status === 'complete' ? (
                                <Check className="w-4 h-4 text-white" />
                            ) : (
                                <span className="text-xs font-semibold" style={{ color: colors.text.primary }}>
                                    {index + 1}
                                </span>
                            )}
                        </div>

                        {/* Content */}
                        <div className="ml-4 flex-1">
                            <div className="flex items-center justify-between">
                                <h3
                                    className={cn(
                                        'font-semibold transition-colors',
                                        item.status === 'complete' && 'text-green-400',
                                        item.status === 'active' && 'text-white',
                                        item.status === 'pending' && 'text-zinc-400'
                                    )}
                                    style={{ transition: transitions.base }}
                                >
                                    {item.title}
                                </h3>
                                {item.date && (
                                    <span className="text-sm" style={{ color: colors.text.tertiary }}>
                                        {item.date}
                                    </span>
                                )}
                            </div>

                            {item.description && (
                                <p className="mt-1 text-sm" style={{ color: colors.text.secondary }}>
                                    {item.description}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
