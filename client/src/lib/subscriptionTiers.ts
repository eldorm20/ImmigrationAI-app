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
}

export const SUBSCRIPTION_TIERS: SubscriptionTier[] = [
    {
        id: 'starter',
        name: 'Starter',
        nameUz: 'Boshlang\'ich',
        nameRu: 'Начальный',
        price: 0,
        currency: 'UZS',
        billingPeriod: 'monthly',
        commission: 15,
        features: [
            { name: 'Client Management Portal', included: true },
            { name: 'Document Generation (AI)', included: true, details: '20/month' },
            { name: 'Video Consultations', included: true, details: '5/month' },
            { name: 'Payment Processing', included: true },
            { name: 'Email Support', included: true },
            { name: 'Basic Analytics', included: true },
            { name: 'Case Management', included: true },
            { name: 'Priority Support', included: false },
            { name: 'White Label Branding', included: false },
            { name: 'API Access', included: false },
            { name: 'Custom Document Templates', included: false },
            { name: 'Dedicated Account Manager', included: false },
        ],
        limits: {
            maxClients: 50,
            maxCases: 100,
            maxDocuments: 50,
            maxVideoConsultations: 5,
            maxTemplates: 10,
        },
        color: 'from-blue-600 to-blue-500',
    },
    {
        id: 'professional',
        name: 'Professional',
        nameUz: 'Professional',
        nameRu: 'Профессиональный',
        price: 375000,
        currency: 'UZS',
        billingPeriod: 'monthly',
        commission: 12,
        features: [
            { name: 'Everything in Starter', included: true },
            { name: 'Document Generation (AI)', included: true, details: '75/month' },
            { name: 'Video Consultations', included: true, details: '30/month' },
            { name: 'Priority Support', included: true },
            { name: 'Advanced Analytics', included: true },
            { name: 'Custom Document Templates', included: false },
            { name: 'White Label Branding', included: false },
            { name: 'API Access', included: false },
        ],
        limits: {
            maxClients: 200,
            maxCases: 500,
            maxDocuments: 150,
            maxVideoConsultations: 30,
            maxTemplates: 50,
        },
        color: 'from-purple-600 to-purple-500',
    },
    {
        id: 'premium',
        name: 'Premium',
        nameUz: 'Premium',
        nameRu: 'Премиум',
        price: 1200000,
        currency: 'UZS',
        billingPeriod: 'monthly',
        commission: 10,
        popular: true,
        features: [
            { name: 'Everything in Professional', included: true },
            { name: 'Document Generation (AI)', included: true, details: '250/month' },
            { name: 'Video Consultations', included: true, details: '100/month' },
            { name: 'Custom Reports', included: true },
            { name: 'Lawyer Directory Listing', included: true },
            { name: 'White Label Branding', included: false },
            { name: 'API Access', included: false },
        ],
        limits: {
            maxClients: 500,
            maxCases: 1000,
            maxDocuments: 500,
            maxVideoConsultations: 100,
            maxTemplates: 100,
        },
        color: 'from-brand-600 to-blue-500',
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        nameUz: 'Korxona',
        nameRu: 'Корпоративный',
        price: 3850000,
        currency: 'UZS',
        billingPeriod: 'monthly',
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
export function getSubscriptionTier(tierId: string): SubscriptionTier | undefined {
    return SUBSCRIPTION_TIERS.find(t => t.id === tierId);
}

export function calculateCommission(tier: SubscriptionTier, amount: number): number {
    return amount * (tier.commission / 100);
}

export function getNetPayment(tier: SubscriptionTier, amount: number): number {
    return amount - calculateCommission(tier, amount);
}
