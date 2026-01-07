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
        price: 500000, // 500,000 UZS (~$40/month)
        currency: 'UZS',
        billingPeriod: 'monthly',
        commission: 15, // 15% commission on client payments
        features: [
            { name: 'Client Management Portal', included: true },
            { name: 'Document Generation (AI)', included: true, details: '50/month' },
            { name: 'Video Consultations', included: true, details: '20/month' },
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
            maxVideoConsultations: 20,
            maxTemplates: 10,
        },
        color: 'from-blue-600 to-blue-500',
    },
    {
        id: 'professional',
        name: 'Professional',
        nameUz: 'Professional',
        nameRu: 'Профессиональный',
        price: 1200000, // 1,200,000 UZS (~$95/month)
        currency: 'UZS',
        billingPeriod: 'monthly',
        commission: 12, // 12% commission
        popular: true,
        features: [
            { name: 'Everything in Starter', included: true },
            { name: 'Document Generation (AI)', included: true, details: 'Unlimited' },
            { name: 'Video Consultations', included: true, details: 'Unlimited' },
            { name: 'Priority Email & Chat Support', included: true },
            { name: 'Advanced Analytics & Reports', included: true },
            { name: 'Custom Document Templates', included: true, details: 'Up to 50' },
            { name: 'Team Collaboration', included: true, details: 'Up to 3 members' },
            { name: 'Automated Workflows', included: true },
            { name: 'Export & Backup', included: true },
            { name: 'White Label Branding', included: false },
            { name: 'API Access', included: false },
            { name: 'Dedicated Account Manager', included: false },
        ],
        limits: {
            maxClients: 200,
            maxCases: 500,
            maxDocuments: -1, // unlimited
            maxVideoConsultations: -1, // unlimited
            maxTemplates: 50,
        },
        color: 'from-purple-600 to-purple-500',
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        nameUz: 'Korxona',
        nameRu: 'Корпоративный',
        price: 3000000, // 3,000,000 UZS (~$240/month)
        currency: 'UZS',
        billingPeriod: 'monthly',
        commission: 8, // 8% commission (best rate)
        features: [
            { name: 'Everything in Professional', included: true },
            { name: 'White Label Branding', included: true, details: 'Full customization' },
            { name: 'API Access', included: true, details: 'Full REST API' },
            { name: 'Dedicated Account Manager', included: true },
            { name: '24/7 Priority Support', included: true },
            { name: 'Custom Integrations', included: true },
            { name: 'Team Collaboration', included: true, details: 'Unlimited members' },
            { name: 'Advanced Security & Compliance', included: true },
            { name: 'Custom Training & Onboarding', included: true },
            { name: 'SLA Guarantee', included: true, details: '99.9% uptime' },
            { name: 'Data Migration Support', included: true },
            { name: 'Custom Feature Development', included: true, details: 'On request' },
        ],
        limits: {
            maxClients: -1, // unlimited
            maxCases: -1, // unlimited
            maxDocuments: -1, // unlimited
            maxVideoConsultations: -1, // unlimited
            maxTemplates: -1, // unlimited
        },
        color: 'from-gradient-to-br-brand-600 to-gold-500',
    },
];

// Annual pricing (with discount)
export const ANNUAL_DISCOUNT = 0.20; // 20% discount for annual billing

export function getAnnualPrice(tier: SubscriptionTier): number {
    const monthlyTotal = tier.price * 12;
    return Math.floor(monthlyTotal * (1 - ANNUAL_DISCOUNT));
}

// Helper functions
export function getSubscriptionTier(tierId: string): Subscription Tier | undefined {
    return SUBSCRIPTION_TIERS.find(t => t.id === tierId);
}

export function calculateCommission(tier: SubscriptionTier, amount: number): number {
    return amount * (tier.commission / 100);
}

export function getNetPayment(tier: SubscriptionTier, amount: number): number {
    return amount - calculateCommission(tier, amount);
}

// Feature comparison helper
export function compareFeatures(features: string[]): Record<string, Record<string, boolean>> {
    const comparison: Record<string, Record<string, boolean>> = {};

    features.forEach(featureName => {
        comparison[featureName] = {};
        SUBSCRIPTION_TIERS.forEach(tier => {
            const feature = tier.features.find(f => f.name === featureName);
            comparison[featureName][tier.id] = feature?.included || false;
        });
    });

    return comparison;
}

// All unique features across tiers
export function getAllFeatures(): string[] {
    const featuresSet = new Set<string>();
    SUBSCRIPTION_TIERS.forEach(tier => {
        tier.features.forEach(feature => featuresSet.add(feature.name));
    });
    return Array.from(featuresSet);
}
