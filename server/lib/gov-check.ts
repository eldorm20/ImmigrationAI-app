/**
 * UK Government API Integration (Gov Check)
 * Primarily implements Companies House API for employer verification.
 */

import { logger } from "./logger";

export interface GovCheckConfig {
    companiesHouseApiKey?: string;
    homeOfficeApiKey?: string;
}

export class GovCheckService {
    private companiesHouseUrl = "https://api.companieshouse.gov.uk";
    private homeOfficeUrl = "https://api.service.homeoffice.gov.uk/v1"; // Example Home Office API base

    constructor(private config: GovCheckConfig) { }

    /**
     * Search for a company by name or registration number
     */
    async searchCompany(query: string) {
        try {
            const auth = Buffer.from(`${this.config.companiesHouseApiKey}:`).toString("base64");
            const res = await fetch(`${this.companiesHouseUrl}/search/companies?q=${encodeURIComponent(query)}`, {
                headers: {
                    "Authorization": `Basic ${auth}`
                }
            });

            if (!res.ok) {
                throw new Error(`Companies House API returned ${res.status}`);
            }

            return await res.json();
        } catch (error) {
            logger.error({ error, query }, "Gov Check search failed");
            return null;
        }
    }

    /**
     * Get detailed info for a specific company
     */
    async getCompanyDetails(companyNumber: string) {
        try {
            const auth = Buffer.from(`${this.config.companiesHouseApiKey}:`).toString("base64");
            const res = await fetch(`${this.companiesHouseUrl}/company/${companyNumber}`, {
                headers: {
                    "Authorization": `Basic ${auth}`
                }
            });

            if (!res.ok) return null;
            return await res.json();
        } catch (error) {
            logger.error({ error, companyNumber }, "Failed to get company details");
            return null;
        }
    }

    /**
     * Check Right to Work Status (Home Office API)
     */
    async checkRightToWork(shareCode: string, dateOfBirth: string) {
        try {
            const res = await fetch(`${this.homeOfficeUrl}/right-to-work-checks`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this.config.homeOfficeApiKey}`
                },
                body: JSON.stringify({
                    share_code: shareCode,
                    date_of_birth: dateOfBirth
                })
            });

            if (!res.ok) throw new Error(`HO RTW API returned ${res.status}`);
            return await res.json();
        } catch (error) {
            logger.error({ error, shareCode }, "RTW check failed");
            return null;
        }
    }

    /**
     * Check Immigration Status (Home Office API)
     */
    async checkImmigrationStatus(shareCode: string, dateOfBirth: string) {
        try {
            const res = await fetch(`${this.homeOfficeUrl}/immigration-status`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this.config.homeOfficeApiKey}`
                },
                body: JSON.stringify({
                    share_code: shareCode,
                    date_of_birth: dateOfBirth
                })
            });

            if (!res.ok) throw new Error(`HO Status API returned ${res.status}`);
            return await res.json();
        } catch (error) {
            logger.error({ error, shareCode }, "Immigration status check failed");
            return null;
        }
    }

    /**
     * Check Visa Application Status
     */
    async checkVisaStatus(applicationReference: string, lastName: string, dateOfBirth: string) {
        try {
            const res = await fetch(`${this.homeOfficeUrl}/visa-applications/${applicationReference}`, {
                headers: {
                    "Authorization": `Bearer ${this.config.homeOfficeApiKey}`
                },
                query: {
                    last_name: lastName,
                    dob: dateOfBirth
                }
            } as any);

            if (!res.ok) return null;
            return await res.json();
        } catch (error) {
            logger.error({ error, applicationReference }, "Visa status check failed");
            return null;
        }
    }
}
