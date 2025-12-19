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
                    try {
                        const res = await apiRequest<Tenant>(`/companies/lookup?subdomain=${subdomain}`);
                        setTenant(res);

                        // Apply branding
                        if (res.brandingConfig?.primaryColor) {
                            document.documentElement.style.setProperty('--primary', res.brandingConfig.primaryColor);
                        }
                    } catch (apiError) {
                        // Tenant API not available or failed - this is optional, so continue without it
                        console.warn("Tenant loading skipped (optional feature):", apiError);
                        setTenant(null);
                    }
                } else {
                    setTenant(null);
                }
            } catch (err) {
                console.error("Failed to determine tenant subdomain", err);
                setTenant(null);
            } finally {
                setIsLoading(false);
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
