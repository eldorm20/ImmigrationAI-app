import { logger } from "./logger";

export interface TenantBranding {
  tenantId: string;
  name: string;
  logo: string;
  primaryColor: string;
  secondaryColor: string;
  favicon: string;
  customDomain: string;
  supportEmail: string;
  termsUrl?: string;
  privacyUrl?: string;
}

export interface TenantSettings {
  tenantId: string;
  enabledFeatures: string[];
  maxUsers: number;
  maxStorage: number; // in GB
  customizationLevel: "basic" | "standard" | "premium";
  apiRateLimit: number; // requests per minute
  ssoEnabled: boolean;
  whiteLabel: boolean;
  customTheme?: TenantBranding;
}

// Store tenant configurations (in production, use database)
const tenants: Map<string, TenantSettings> = new Map();
const tenantBranding: Map<string, TenantBranding> = new Map();

// Create new tenant
export function createTenant(settings: TenantSettings): TenantSettings {
  tenants.set(settings.tenantId, settings);
  logger.info({ tenantId: settings.tenantId }, "Tenant created");
  return settings;
}

// Get tenant settings
export function getTenantSettings(tenantId: string): TenantSettings | null {
  return tenants.get(tenantId) || null;
}

// Update tenant settings
export function updateTenantSettings(
  tenantId: string,
  updates: Partial<TenantSettings>
): TenantSettings | null {
  const tenant = tenants.get(tenantId);
  if (!tenant) return null;

  const updated = { ...tenant, ...updates, tenantId };
  tenants.set(tenantId, updated);
  logger.info({ tenantId }, "Tenant settings updated");
  return updated;
}

// Set tenant branding
export function setTenantBranding(
  tenantId: string,
  branding: TenantBranding
): TenantBranding {
  branding.tenantId = tenantId;
  tenantBranding.set(tenantId, branding);
  logger.info({ tenantId }, "Tenant branding updated");
  return branding;
}

// Get tenant branding
export function getTenantBranding(tenantId: string): TenantBranding | null {
  return tenantBranding.get(tenantId) || null;
}

// Check if tenant has feature enabled
export function isTenantFeatureEnabled(tenantId: string, feature: string): boolean {
  const tenant = tenants.get(tenantId);
  if (!tenant) return false;
  return tenant.enabledFeatures.includes(feature);
}

// Get tenant customization level
export function getTenantCustomizationLevel(
  tenantId: string
): "basic" | "standard" | "premium" | null {
  const tenant = tenants.get(tenantId);
  return tenant?.customizationLevel || null;
}

// List available features by customization level
export function getAvailableFeatures(level: "basic" | "standard" | "premium"): string[] {
  const featureMatrix: Record<string, string[]> = {
    basic: [
      "document_upload",
      "basic_analytics",
      "email_support",
      "standard_branding",
    ],
    standard: [
      "document_upload",
      "advanced_analytics",
      "priority_support",
      "custom_domain",
      "api_access",
      "consultation_features",
    ],
    premium: [
      "document_upload",
      "advanced_analytics",
      "priority_support",
      "custom_domain",
      "api_access",
      "consultation_features",
      "white_label",
      "sso",
      "custom_theme",
      "advanced_integrations",
      "dedicated_account_manager",
    ],
  };

  return featureMatrix[level] || [];
}

// Enable/disable feature for tenant
export function setTenantFeature(
  tenantId: string,
  feature: string,
  enabled: boolean
): boolean {
  const tenant = tenants.get(tenantId);
  if (!tenant) return false;

  if (enabled) {
    if (!tenant.enabledFeatures.includes(feature)) {
      tenant.enabledFeatures.push(feature);
    }
  } else {
    tenant.enabledFeatures = tenant.enabledFeatures.filter((f) => f !== feature);
  }

  logger.info({ tenantId, feature, enabled }, "Tenant feature toggled");
  return true;
}

// Check tenant usage limits
export function checkTenantUsage(
  tenantId: string,
  currentUsers: number,
  currentStorage: number // in GB
): { canAddUsers: boolean; canAddStorage: boolean } {
  const tenant = tenants.get(tenantId);
  if (!tenant) {
    return { canAddUsers: false, canAddStorage: false };
  }

  return {
    canAddUsers: currentUsers < tenant.maxUsers,
    canAddStorage: currentStorage < tenant.maxStorage,
  };
}

// Get tenant API rate limit
export function getTenantRateLimit(tenantId: string): number {
  const tenant = tenants.get(tenantId);
  return tenant?.apiRateLimit || 60; // Default to 60 requests/minute
}

// Generate tenant-specific API key
export function generateTenantApiKey(tenantId: string): string {
  const tenant = tenants.get(tenantId);
  if (!tenant) return "";

  // Generate a secure random key
  const key = `tenant_${tenantId}_${Math.random().toString(36).substring(2, 15)}`;
  logger.info({ tenantId }, "Tenant API key generated");
  return key;
}

// Get tenant by custom domain
export function getTenantByDomain(domain: string): TenantSettings | null {
  for (const [, branding] of Array.from(tenantBranding.entries())) {
    if (branding.customDomain === domain) {
      return tenants.get(branding.tenantId) || null;
    }
  }
  return null;
}

// Get tenant resources (docs, emails, etc.) based on customization
export function getTenantResourceLimits(tenantId: string): {
  maxDocuments: number;
  maxConsultations: number;
  maxApiCalls: number;
  storageLimitGB: number;
} {
  const tenant = tenants.get(tenantId);
  if (!tenant) {
    return {
      maxDocuments: 10,
      maxConsultations: 5,
      maxApiCalls: 1000,
      storageLimitGB: 1,
    };
  }

  const limits: Record<
    string,
    { maxDocuments: number; maxConsultations: number; maxApiCalls: number; storageLimitGB: number }
  > = {
    basic: { maxDocuments: 20, maxConsultations: 10, maxApiCalls: 10000, storageLimitGB: 5 },
    standard: { maxDocuments: 100, maxConsultations: 50, maxApiCalls: 100000, storageLimitGB: 50 },
    premium: {
      maxDocuments: 1000,
      maxConsultations: 500,
      maxApiCalls: 1000000,
      storageLimitGB: 500,
    },
  };

  return limits[tenant.customizationLevel] || limits.basic;
}

// List all tenants (admin only)
export function listAllTenants(): TenantSettings[] {
  return Array.from(tenants.values());
}

// Delete tenant
export function deleteTenant(tenantId: string): boolean {
  const deleted1 = tenants.delete(tenantId);
  const deleted2 = tenantBranding.delete(tenantId);
  logger.info({ tenantId }, "Tenant deleted");
  return deleted1 || deleted2;
}

// Get tenant stats
export function getTenantStats(tenantId: string): {
  tenantId: string;
  customizationLevel: string;
  featuresEnabled: number;
  totalFeatures: number;
  hasWhiteLabel: boolean;
  hasSso: boolean;
} | null {
  const tenant = tenants.get(tenantId);
  if (!tenant) return null;

  const availableFeatures = getAvailableFeatures(tenant.customizationLevel);

  return {
    tenantId,
    customizationLevel: tenant.customizationLevel,
    featuresEnabled: tenant.enabledFeatures.length,
    totalFeatures: availableFeatures.length,
    hasWhiteLabel: tenant.whiteLabel,
    hasSso: tenant.ssoEnabled,
  };
}
