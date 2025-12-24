import { Router } from "express";
import { logger } from "../lib/logger";

export const companyRouter = Router();

// Mock data for when API key is missing
const MOCK_COMPANIES = [
    {
        company_number: "12345678",
        title: "MOCK IMMIGRATION SERVICES LTD",
        company_status: "active",
        address_snippet: "123 High Street, London, UK",
        date_of_creation: "2020-01-01"
    },
    {
        company_number: "87654321",
        title: "GLOBAL TALENT VISA SPONSORS INC",
        company_status: "active",
        address_snippet: "456 Tech Park, Manchester, UK",
        date_of_creation: "2019-05-15"
    },
    {
        company_number: "00000001",
        title: "APPLE RETAIL UK LIMITED",
        company_status: "active",
        address_snippet: "1 Hanover Street, London, W1S 1YZ",
        date_of_creation: "2003-09-15"
    },
    {
        company_number: "00000002",
        title: "GOOGLE UK LIMITED",
        company_status: "active",
        address_snippet: "6 Pancras Square, London, N1C 4AG",
        date_of_creation: "2003-09-17"
    }
];

companyRouter.get("/search", async (req, res) => {
    const query = req.query.q as string;

    if (!query) {
        return res.status(400).json({ error: "Query parameter 'q' is required" });
    }

    const apiKey = process.env.COMPANIES_HOUSE_API_KEY;

    try {
        if (!apiKey) {
            logger.warn("COMPANIES_HOUSE_API_KEY not set. Returning mock data.");
            // Filter mock data
            const results = MOCK_COMPANIES.filter(c =>
                c.title.toLowerCase().includes(query.toLowerCase()) ||
                c.company_number.includes(query)
            );
            return res.json({ items: results, total_results: results.length });
        }

        const auth = Buffer.from(apiKey + ':').toString('base64');
        const response = await fetch(`https://api.company-information.service.gov.uk/search/companies?q=${encodeURIComponent(query)}`, {
            headers: {
                'Authorization': `Basic ${auth}`
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                logger.error("Companies House API Unauthorized. Check API Key.");
                return res.status(500).json({ error: "External service configuration error" });
            }
            throw new Error(`Companies House API responded with ${response.status}`);
        }

        const data = await response.json();
        res.json(data);

    } catch (error) {
        logger.error({ error, query }, "Company search failed");
        res.status(500).json({ error: "Failed to search companies" });
    }
});
