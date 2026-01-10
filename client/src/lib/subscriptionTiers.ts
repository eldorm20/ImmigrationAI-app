// Lawyer Subscription System - Tiers and Pricing
// Tailored for Uzbekistan market

export interface SubscriptionFeature {
    name: string;
    included: boolean;
    details?: string;
}

export interface SubscriptionTier {
    id: string;
    name: string;
    nameUz: string;
    nameRu: string;
    price: number;
    currency: 'UZS' | 'USD';
    billingPeriod: 'monthly' | 'annual';
    commission: number; // Platform commission percentage
    features: SubscriptionFeature[];
    limits: {
        maxClients: number;
        maxCases: number;
        maxDocuments: number;
        maxVideoConsultations: number;
        maxTemplates: number;
    };
    popular?: boolean;
    color: string;
    description?: string;
}

export const CLIENT_SUBSCRIPTION_TIERS: SubscriptionTier[] = [
    {
        id: 'starter',
        name: 'Starter',
        nameUz: 'Boshlang\'ich',
        nameRu: 'Начальный',
        price: 0,
        currency: 'UZS',
        billingPeriod: 'monthly',
        description: 'Ideal for basic immigration needs',
        commission: 0,
        features: [
            { name: 'Document Uploads', included: true, details: '50/month' },
            { name: 'AI Document Generation', included: true, details: '20/month' },
            { name: 'AI Chat Requests', included: true, details: '500/month' },
            { name: 'Research Library', included: true },
            { name: 'Lawyer Directory', included: true },
        ],
        limits: {
            maxClients: 0,
            maxCases: 1,
            maxDocuments: 50,
            maxVideoConsultations: 5,
            maxTemplates: 0,
        },
        color: 'from-blue-600 to-blue-500',
    },
    {
        id: 'professional',
        name: 'Professional',
        nameUz: 'Professional',
        nameRu: 'Профессиональный',
        price: 15000,
        currency: 'UZS',
        billingPeriod: 'monthly',
        description: 'For active solo applicants',
        commission: 0,
        features: [
            { name: 'Document Uploads', included: true, details: '150/month' },
            { name: 'AI Document Generation', included: true, details: '75/month' },
            { name: 'AI Chat Requests', included: true, details: '7,500/month' },
            { name: 'Priority Support', included: true },
            { name: 'Advanced Analytics', included: true },
        ],
        limits: {
            maxClients: 0,
            maxCases: 3,
            maxDocuments: 150,
            maxVideoConsultations: 30,
            maxTemplates: 5,
        },
        color: 'from-purple-600 to-purple-500',
    },
    {
        id: 'premium',
        name: 'Premium',
        nameUz: 'Premium',
        nameRu: 'Премиум',
        price: 50000,
        currency: 'UZS',
        billingPeriod: 'monthly',
        description: 'For power users & families',
        commission: 0,
        popular: true,
        features: [
            { name: 'Document Uploads', included: true, details: '500/month' },
            { name: 'AI Document Generation', included: true, details: '250/month' },
            { name: 'AI Chat Requests', included: true, details: '25,000/month' },
            { name: 'Lawyer Directory Access', included: true },
            { name: 'Custom Reports', included: true },
        ],
        limits: {
            maxClients: 0,
            maxCases: 10,
            maxDocuments: 500,
            maxVideoConsultations: 100,
            maxTemplates: 20,
        },
        color: 'from-brand-600 to-blue-500',
    },
];

export const LAWYER_SUBSCRIPTION_TIERS: SubscriptionTier[] = [
    {
        id: 'starter',
        name: 'Lawyer Starter',
        nameUz: 'Lawyer Boshlang\'ich',
        nameRu: 'Lawyer Начальный',
        price: 0,
        currency: 'UZS',
        billingPeriod: 'monthly',
        description: 'Essential tools for solo practitioners',
        commission: 15,
        features: [
            { name: 'Client Management Portal', included: true },
            { name: 'Document Generation (AI)', included: true, details: '50/month' },
            { name: 'Video Consultations', included: true, details: '10/month' },
            { name: 'Payment Processing', included: true },
            { name: 'Email Support', included: true },
            { name: 'Case Management', included: true },
        ],
        limits: {
            maxClients: 50,
            maxCases: 100,
            maxDocuments: 100,
            maxVideoConsultations: 10,
            maxTemplates: 10,
        },
        color: 'from-blue-600 to-blue-500',
    },
    {
        id: 'professional',
        name: 'Lawyer Professional',
        nameUz: 'Lawyer Professional',
        nameRu: 'Lawyer Профессиональный',
        price: 375000,
        currency: 'UZS',
        billingPeriod: 'monthly',
        description: 'Advanced management for growing practices',
        commission: 12,
        features: [
            { name: 'Everything in Starter', included: true },
            { name: 'Document Generation (AI)', included: true, details: '200/month' },
            { name: 'Video Consultations', included: true, details: '50/month' },
            { name: 'Priority Support', included: true },
            { name: 'Advanced Analytics', included: true },
        ],
        limits: {
            maxClients: 200,
            maxCases: 500,
            maxDocuments: 500,
            maxVideoConsultations: 50,
            maxTemplates: 50,
        },
        color: 'from-purple-600 to-purple-500',
    },
    {
        id: 'premium',
        name: 'Lawyer Premium',
        nameUz: 'Lawyer Premium',
        nameRu: 'Lawyer Премиум',
        price: 1200000,
        currency: 'UZS',
        billingPeriod: 'monthly',
        description: 'Complete solution for established firms',
        commission: 10,
        popular: true,
        features: [
            { name: 'Everything in Professional', included: true },
            { name: 'Document Generation (AI)', included: true, details: '1000/month' },
            { name: 'Video Consultations', included: true, details: '200/month' },
            { name: 'Custom Reports', included: true },
            { name: 'Lawyer Directory Listing', included: true },
        ],
        limits: {
            maxClients: 500,
            maxCases: 1000,
            maxDocuments: 2000,
            maxVideoConsultations: 200,
            maxTemplates: 100,
        },
        color: 'from-brand-600 to-blue-500',
    },
    {
        id: 'enterprise',
        name: 'Lawyer Enterprise',
        nameUz: 'Korxona',
        nameRu: 'Корпоративный',
        price: 3850000,
        currency: 'UZS',
        billingPeriod: 'monthly',
        description: 'Bespoke features for large organizations',
        commission: 5,
        features: [
            { name: 'Everything in Premium', included: true },
            { name: 'White Label Branding', included: true },
            { name: 'API Access', included: true },
            { name: 'Dedicated Account Manager', included: true },
            { name: 'Custom Integrations', included: true },
        ],
        limits: {
            maxClients: -1,
            maxCases: -1,
            maxDocuments: -1,
            maxVideoConsultations: -1,
            maxTemplates: -1,
        },
        color: 'from-slate-900 to-slate-800',
    },
];

// Annual pricing (with discount)
export const ANNUAL_DISCOUNT = 0.20; // 20% discount for annual billing

export function getAnnualPrice(tier: SubscriptionTier): number {
    const monthlyTotal = tier.price * 12;
    return Math.floor(monthlyTotal * (1 - ANNUAL_DISCOUNT));
}

// Helper functions
export function getSubscriptionTier(tierId: string, role: string = 'applicant'): SubscriptionTier | undefined {
    const tiers = role === 'lawyer' ? LAWYER_SUBSCRIPTION_TIERS : CLIENT_SUBSCRIPTION_TIERS;
    return tiers.find(t => t.id === tierId);
}

export function calculateCommission(tier: SubscriptionTier, amount: number): number {
    return amount * (tier.commission / 100);
}

export function getNetPayment(tier: SubscriptionTier, amount: number): number {
    return amount - calculateCommission(tier, amount);
}
