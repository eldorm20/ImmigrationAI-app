import React, { createContext, useContext, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { apiRequest } from "./api";

interface BrandingConfig {
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
}

interface Tenant {
    id: string;
    name: string;
    logo?: string;
    subdomain: string;
    brandingConfig?: BrandingConfig;
}

interface TenantContextType {
    tenant: Tenant | null;
    isLoading: boolean;
}

const TenantContext = createContext<TenantContextType>({ tenant: null, isLoading: true });

export const useTenant = () => useContext(TenantContext);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [tenant, setTenant] = useState<Tenant | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [location] = useLocation();

    useEffect(() => {
        const checkTenant = async () => {
            try {
                // Method 1: Subdomain (for production)
                const host = window.location.hostname;
                const parts = host.split('.');
                let subdomain = '';

                // e.g. acme.app.com -> acme
                if (parts.length > 2 && parts[0] !== 'www') {
                    subdomain = parts[0];
                }

                // Method 2: Path prefix (for dev/testing) -> /tenant/acme
                if (!subdomain && window.location.pathname.startsWith('/tenant/')) {
                    const pathParts = window.location.pathname.split('/');
                    if (pathParts[2]) {
                        subdomain = pathParts[2];
                    }
                }

                // Method 3: Query param (fallback)
                if (!subdomain) {
                    const params = new URLSearchParams(window.location.search);
                    const ref = params.get('org');
                    if (ref) subdomain = ref;
                }

                if (subdomain && subdomain !== 'localhost') {
                    const res = await apiRequest(`/companies/lookup?subdomain=${subdomain}`);
                    setTenant(res);
                    // The original `if (subdomain && subdomain !== 'localhost')` block is replaced.
                    // The new logic fetches tenant data and applies branding.
                    // The outer try-catch is removed, and a new inner try-catch is introduced for the fetch.
                    // This makes the tenant loading non-blocking for the overall app initialization.

                    // Apply branding (this part remains, but the `res` object is now `data` from the new fetch)
                    // Note: The branding application here assumes `data` will have `brandingConfig`
                    // if the fetch is successful. If the fetch fails or returns null, branding won't be applied.

                    try {
                        const data = await fetch(`/api/tenant/${subdomain || 'default'}`).then(r => {
                            // If endpoint returns HTML (404/500), skip tenant loading
                            if (!r.ok || r.headers.get('content-type')?.includes('text/html')) {
                                return null;
                            }
                            return r.json();
                        });
                        setTenant(data);

                        // Apply branding if tenant data is successfully loaded
                        if (data?.brandingConfig?.primaryColor) {
                            document.documentElement.style.setProperty('--primary', data.brandingConfig.primaryColor);
                            // You might need to convert hex to HSL for shadcn compatibility in a real scenario
                        }
                    } catch (err) {
                        // Tenant system is optional - log but don't block app
                        console.warn("Tenant loading skipped (optional feature):", err);
                        setTenant(null);
                    } finally {
                        setIsLoading(false);
                    }
                } catch (err) {
                    // This outer catch now only handles errors from subdomain detection, not the fetch itself.
                    console.error("Failed to determine tenant subdomain or initial setup", err);
                    setTenant(null);
                    setIsLoading(false); // Ensure loading state is cleared even if subdomain detection fails
                }
            };

            checkTenant();
        }, [location]);

    return (
        <TenantContext.Provider value={{ tenant, isLoading }}>
            {children}
        </TenantContext.Provider>
    );
};
