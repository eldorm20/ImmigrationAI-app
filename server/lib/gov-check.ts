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
    /**
     * Check USCIS Case Status
     * Note: This is a basic scraper. USCIS has strong bot detection.
     * Fallback is to return the direct link.
     */
    async checkUSCISCaseStatus(receiptNumber: string) {
        const url = "https://egov.uscis.gov/casestatus/mycasestatus.do";
        try {
            // Attempt a simple GET first to see if reachable
            // In MVP, safest is to return the link as 'manual_verification_required'
            // attempting to scrape might IP block the server.

            return {
                status: "manual_check_required",
                provider: "USCIS",
                message: "Please click the link to verify official status.",
                link: `${url}?appReceiptNum=${receiptNumber}`,
                receiptNumber
            };

            /*
            // Scraping Logic (Commented out for safety/reliability)
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: `appReceiptNum=${receiptNumber}&initCaseSearch=CHECK STATUS`
            });
            const html = await res.text();
            // Parse HTML...
            */
        } catch (error) {
            logger.error({ error, receiptNumber }, "USCIS check failed");
            return null;
        }
    }

    /**
     * Check Uzbekistan Visa Status
     */
    async checkUzbekistanVisaStatus(activationCode: string, passportNumber: string) {
        // e-visa.gov.uz
        const url = "https://e-visa.gov.uz/status";
        return {
            status: "manual_check_required",
            provider: "Uzbekistan E-Visa",
            message: "Please verify on the official portal.",
            link: url,
            details: { activationCode, passportNumber }
        };
    }
}
