// Toast notifications hook
import { useState, useCallback } from 'react';

interface Toast {
    id: string;
    title: string;
    description?: string;
    variant?: 'default' | 'destructive' | 'success';
    duration?: number;
}

let toastCounter = 0;

export function useToast() {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const toast = useCallback(
        ({ title, description, variant = 'default', duration = 3000 }: Omit<Toast, 'id'>) => {
            const id = `toast-${++toastCounter}`;
            const newToast: Toast = { id, title, description, variant, duration };

            setToasts((prev) => [...prev, newToast]);

            // Auto-dismiss after duration
            if (duration > 0) {
                setTimeout(() => {
                    setToasts((prev) => prev.filter((t) => t.id !== id));
                }, duration);
            }

            return id;
        },
        []
    );

    const dismiss = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return { toast, toasts, dismiss };
}
