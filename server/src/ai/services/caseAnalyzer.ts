// AI Case Analyzer - Autonomous Agent for Immigration Cases
import { ollamaClient } from '../ollama/client';
import { AI_CONFIG } from '../config';

interface CaseProfile {
    applicantName: string;
    age: number;
    nationality: string;
    education: string;
    occupation: string;
    experience: number;
    language?: string;
    maritalStatus?: string;
    dependents?: number;
    visaType: string;
    targetCountry: string;
    purpose: string;
    financialStatus?: string;
    criminalRecord?: boolean;
    previousRejections?: number;
}

interface CaseAnalysis {
    eligibilityScore: number; // 0-100
    strength: 'very-weak' | 'weak' | 'moderate' | 'strong' | 'very-strong';
    qualifyingFactors: string[];
    riskFactors: string[];
    missingDocuments: string[];
    recommendations: string[];
    timeline: {
        preparation: string;
        submission: string;
        decision: string;
    };
    successProbability: number;
}

export class AICaseAnalyzer {
    /**
     * Comprehensive case analysis using AI
     */
    async analyzeCase(profile: CaseProfile): Promise<CaseAnalysis> {
        const prompt = this.buildAnalysisPrompt(profile);

        const response = await ollamaClient.generate(prompt, {
            model: AI_CONFIG.ollama.models.advanced, // Use Mixtral for complex reasoning
            temperature: 0.3, // Low temperature for consistent analysis
            maxTokens: 2000,
        });

        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const analysis = JSON.parse(jsonMatch[0]);
                return this.normalizeAnalysis(analysis);
            }
        } catch (e) {
            console.error('Error parsing case analysis:', e);
        }

        // Fallback analysis
        return this.generateFallbackAnalysis(profile);
    }

    /**
     * Get specific visa requirements
     */
    async getVisaRequirements(
        visaType: string,
        targetCountry: string
    ): Promise<{
        documents: string[];
        criteria: string[];
        timeframe: string;
        fees: string;
    }> {
        const prompt = `You are an immigration requirements expert. List the requirements for ${visaType} visa to ${targetCountry}.

Provide in JSON format:
{
  "documents": ["doc 1", "doc 2", ...],
  "criteria": ["criteria 1", "criteria 2", ...],
  "timeframe": "typical processing time",
  "fees": "application fee range"
}`;

        const response = await ollamaClient.generate(prompt, {
            model: AI_CONFIG.ollama.models.primary,
            temperature: 0.2,
        });

        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            console.error('Error parsing requirements:', e);
        }

        return {
            documents: ['Passport', 'Photos', 'Application form', 'Financial proof'],
            criteria: ['Valid passport', 'Clean criminal record', 'Sufficient funds'],
            timeframe: '4-8 weeks',
            fees: '$100-$500',
        };
    }

    /**
     * Identify missing documents for case
     */
    async identifyMissingDocuments(
        profile: CaseProfile,
        currentDocuments: string[]
    ): Promise<string[]> {
        const requirements = await this.getVisaRequirements(
            profile.visaType,
            profile.targetCountry
        );

        const missing: string[] = [];

        for (const required of requirements.documents) {
            const found = currentDocuments.some(doc =>
                doc.toLowerCase().includes(required.toLowerCase()) ||
                required.toLowerCase().includes(doc.toLowerCase())
            );

            if (!found) {
                missing.push(required);
            }
        }

        return missing;
    }

    /**
     * Predict case outcome
     */
    async predictOutcome(profile: CaseProfile): Promise<{
        approval: number; // 0-100%
        rejection: number;
        factors: { factor: string; impact: 'positive' | 'negative'; weight: number }[];
    }> {
        const prompt = `As an immigration outcome prediction AI, analyze this case:

${JSON.stringify(profile, null, 2)}

Predict the approval probability and identify key factors. Return JSON:
{
  "approval": <0-100>,
  "rejection": <0-100>,
  "factors": [
    {"factor": "description", "impact": "positive"/"negative", "weight": <0-10>},
    ...
  ]
}`;

        const response = await ollamaClient.generate(prompt, {
            model: AI_CONFIG.ollama.models.advanced,
            temperature: 0.3,
        });

        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            console.error('Error parsing prediction:', e);
        }

        return {
            approval: 70,
            rejection: 30,
            factors: [
                { factor: 'Good education background', impact: 'positive', weight: 7 },
                { factor: 'Limited work experience', impact: 'negative', weight: 4 },
            ],
        };
    }

    /**
     * Build comprehensive analysis prompt
     */
    private buildAnalysisPrompt(profile: CaseProfile): string {
        return `You are an expert immigration case analyst with 20 years of experience. Analyze this case comprehensively:

APPLICANT PROFILE:
${JSON.stringify(profile, null, 2)}

Provide a detailed analysis in JSON format:
{
  "eligibilityScore": <0-100>,
  "strength": "very-weak|weak|moderate|strong|very-strong",
  "qualifyingFactors": ["factor 1", "factor 2", ...],
  "riskFactors": ["risk 1", "risk 2", ...],
  "missingDocuments": ["doc 1", "doc 2", ...],
  "recommendations": ["rec 1", "rec 2", ...],
  "timeline": {
    "preparation": "X weeks/months",
    "submission": "X weeks/months",
    "decision": "X weeks/months"
  },
  "successProbability": <0-100>
}

Be realistic, thorough, and specific to ${profile.visaType} visa for ${profile.targetCountry}.`;
    }

    /**
     * Normalize and validate analysis
     */
    private normalizeAnalysis(analysis: any): CaseAnalysis {
        return {
            eligibilityScore: Math.min(100, Math.max(0, analysis.eligibilityScore || 50)),
            strength: analysis.strength || 'moderate',
            qualifyingFactors: Array.isArray(analysis.qualifyingFactors) ? analysis.qualifyingFactors : [],
            riskFactors: Array.isArray(analysis.riskFactors) ? analysis.riskFactors : [],
            missingDocuments: Array.isArray(analysis.missingDocuments) ? analysis.missingDocuments : [],
            recommendations: Array.isArray(analysis.recommendations) ? analysis.recommendations : [],
            timeline: analysis.timeline || {
                preparation: '2-4 weeks',
                submission: '1-2 weeks',
                decision: '4-8 weeks',
            },
            successProbability: Math.min(100, Math.max(0, analysis.successProbability || 50)),
        };
    }

    /**
     * Generate fallback analysis if parsing fails
     */
    private generateFallbackAnalysis(profile: CaseProfile): CaseAnalysis {
        let score = 60; // Base score

        // Adjust based on profile
        if (profile.education.toLowerCase().includes('master') || profile.education.toLowerCase().includes('phd')) {
            score += 10;
        }
        if (profile.experience > 5) {
            score += 10;
        }
        if (profile.previousRejections && profile.previousRejections > 0) {
            score -= 15;
        }
        if (profile.criminalRecord) {
            score -= 30;
        }

        return {
            eligibilityScore: Math.min(100, Math.max(20, score)),
            strength: score > 75 ? 'strong' : score > 50 ? 'moderate' : 'weak',
            qualifyingFactors: ['Valid passport', 'Education background'],
            riskFactors: profile.previousRejections ? ['Previous visa rejections'] : [],
            missingDocuments: [],
            recommendations: ['Prepare all required documents', 'Strengthen financial proof'],
            timeline: {
                preparation: '2-4 weeks',
                submission: '1-2 weeks',
                decision: '4-8 weeks',
            },
            successProbability: score,
        };
    }
}

// Singleton instance
export const aiCaseAnalyzer = new AICaseAnalyzer();
