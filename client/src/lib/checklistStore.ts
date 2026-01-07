// Checklist Integration System - Shared state across pages
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ChecklistItem {
    id: string;
    title: string;
    description: string;
    status: 'pending' | 'in-progress' | 'completed';
    page: 'roadmap' | 'documents' | 'upload';
    order: number;
    required: boolean;
    dependencies?: string[]; // IDs of items that must be completed first
}

interface ChecklistStore {
    items: ChecklistItem[];
    addItem: (item: ChecklistItem) => void;
    updateItem: (id: string, updates: Partial<ChecklistItem>) => void;
    removeItem: (id: string) => void;
    completeItem: (id: string) => void;
    resetChecklist: () => void;
    getItemsByPage: (page: ChecklistItem['page']) => ChecklistItem[];
    getProgress: () => { completed: number; total: number; percentage: number };
}

const defaultItems: ChecklistItem[] = [
    // Roadmap items
    {
        id: 'assess-eligibility',
        title: 'Complete Eligibility Assessment',
        description: 'Fill out the initial profile assessment form',
        status: 'pending',
        page: 'roadmap',
        order: 1,
        required: true,
    },
    {
        id: 'review-requirements',
        title: 'Review Visa Requirements',
        description: 'Check required documents and criteria for your visa type',
        status: 'pending',
        page: 'roadmap',
        order: 2,
        required: true,
        dependencies: ['assess-eligibility'],
    },

    // Document items
    {
        id: 'prepare-passport',
        title: 'Prepare Passport Copy',
        description: 'Scan or photograph all pages of your passport',
        status: 'pending',
        page: 'documents',
        order: 1,
        required: true,
    },
    {
        id: 'financial-docs',
        title: 'Gather Financial Documents',
        description: 'Bank statements, proof of funds, employment letters',
        status: 'pending',
        page: 'documents',
        order: 2,
        required: true,
    },
    {
        id: 'education-certs',
        title: 'Education Certificates',
        description: 'Degrees, diplomas, and transcripts',
        status: 'pending',
        page: 'documents',
        order: 3,
        required: false,
    },

    // Upload items
    {
        id: 'upload-passport',
        title: 'Upload Passport',
        description: 'Upload your passport copy to the system',
        status: 'pending',
        page: 'upload',
        order: 1,
        required: true,
        dependencies: ['prepare-passport'],
    },
    {
        id: 'upload-financial',
        title: 'Upload Financial Documents',
        description: 'Upload all financial proof documents',
        status: 'pending',
        page: 'upload',
        order: 2,
        required: true,
        dependencies: ['financial-docs'],
    },
    {
        id: 'upload-photos',
        title: 'Upload Passport Photos',
        description: 'Upload recent passport-sized photographs',
        status: 'pending',
        page: 'upload',
        order: 3,
        required: true,
    },
    {
        id: 'verify-uploads',
        title: 'Verify All Uploads',
        description: 'Review and confirm all uploaded documents',
        status: 'pending',
        page: 'upload',
        order: 4,
        required: true,
        dependencies: ['upload-passport', 'upload-financial', 'upload-photos'],
    },
];

export const useChecklistStore = create<ChecklistStore>()(
    persist(
        (set, get) => ({
            items: defaultItems,

            addItem: (item) =>
                set((state) => ({
                    items: [...state.items, item],
                })),

            updateItem: (id, updates) =>
                set((state) => ({
                    items: state.items.map((item) =>
                        item.id === id ? { ...item, ...updates } : item
                    ),
                })),

            removeItem: (id) =>
                set((state) => ({
                    items: state.items.filter((item) => item.id !== id),
                })),

            completeItem: (id) =>
                set((state) => ({
                    items: state.items.map((item) =>
                        item.id === id ? { ...item, status: 'completed' as const } : item
                    ),
                })),

            resetChecklist: () =>
                set(() => ({
                    items: defaultItems.map((item) => ({ ...item, status: 'pending' as const })),
                })),

            getItemsByPage: (page) => {
                const items = get().items.filter((item) => item.page === page);
                return items.sort((a, b) => a.order - b.order);
            },

            getProgress: () => {
                const items = get().items;
                const requiredItems = items.filter((item) => item.required);
                const completed = items.filter((item) => item.status === 'completed').length;
                const total = items.length;
                const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

                return { completed, total, percentage };
            },
        }),
        {
            name: 'immigration-checklist-storage',
        }
    )
);

// Hook to check if an item can be started (dependencies met)
export function useItemCanStart(itemId: string): boolean {
    const items = useChecklistStore((state) => state.items);
    const item = items.find((i) => i.id === itemId);

    if (!item || !item.dependencies || item.dependencies.length === 0) {
        return true;
    }

    return item.dependencies.every((depId) => {
        const depItem = items.find((i) => i.id === depId);
        return depItem?.status === 'completed';
    });
}

// Hook to get checklist progress for a specific page
export function usePageProgress(page: ChecklistItem['page']) {
    const items = useChecklistStore((state) => state.getItemsByPage(page));
    const completed = items.filter((item) => item.status === 'completed').length;
    const total = items.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { completed, total, percentage, items };
}
