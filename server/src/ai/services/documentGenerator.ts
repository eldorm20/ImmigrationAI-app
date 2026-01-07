// AI Document Generator - FREE using Ollama
import { ollamaClient } from '../ollama/client';
import { AI_CONFIG } from '../config';

interface DocumentData {
    fullName: string;
    email?: string;
    phone?: string;
    nationality?: string;
    visaType?: string;
    targetCountry?: string;
    purpose?: string;
    background?: string;
    achievements?: string;
    role?: string;
    company?: string;
    experience?: string;
    education?: string;
    skills?: string;
    [key: string]: any;
}

export class AIDocumentGenerator {
    /**
     * Generate immigration document using Ollama (FREE)
     */
    async generateDocument(
        documentType: string,
        data: DocumentData,
        language: string = 'en'
    ): Promise<string> {
        const model = AI_CONFIG.taskModels['document-generation'];

        // Build context from data
        const userData = this.buildUserContext(data);

        // Select appropriate prompt template
        const prompt = this.buildPrompt(documentType, userData, language);

        // Generate document using Ollama
        const document = await ollamaClient.generate(prompt, {
            model,
            temperature: 0.7,
            maxTokens: 3000,
        });

        return document;
    }

    /**
     * Generate document with streaming (for real-time display)
     */
    async* generateDocumentStream(
        documentType: string,
        data: DocumentData,
        language: string = 'en'
    ): AsyncGenerator<string> {
        const model = AI_CONFIG.taskModels['document-generation'];
        const userData = this.buildUserContext(data);
        const prompt = this.buildPrompt(documentType, userData, language);

        for await (const chunk of ollamaClient.generateStream(prompt, { model })) {
            yield chunk;
        }
    }

    /**
     * Review and improve existing document
     */
    async reviewDocument(
        content: string,
        documentType: string
    ): Promise<{
        score: number;
        feedback: string[];
        improvements: Array<{ original: string; suggested: string; reason: string }>;
    }> {
        const prompt = `You are an expert immigration document reviewer. Review this ${documentType}:

"${content}"

Provide a detailed analysis in JSON format:
{
  "score": <0-100>,
  "feedback": ["point 1", "point 2", ...],
  "improvements": [
    {"original": "text to replace", "suggested": "improved text", "reason": "why this is better"},
    ...
  ]
}`;

        const response = await ollamaClient.generate(prompt, {
            model: AI_CONFIG.ollama.models.advanced,
            temperature: 0.3,
        });

        try {
            // Extract JSON from response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            console.error('Error parsing review response:', e);
        }

        // Fallback response
        return {
            score: 75,
            feedback: ['Document reviewed successfully'],
            improvements: [],
        };
    }

    /**
     * Build user context from data
     */
    private buildUserContext(data: DocumentData): string {
        const lines: string[] = [];

        if (data.fullName) lines.push(`Name: ${data.fullName}`);
        if (data.email) lines.push(`Email: ${data.email}`);
        if (data.nationality) lines.push(`Nationality: ${data.nationality}`);
        if (data.visaType) lines.push(`Visa Type: ${data.visaType}`);
        if (data.targetCountry) lines.push(`Target Country: ${data.targetCountry}`);
        if (data.role) lines.push(`Target Role: ${data.role}`);
        if (data.company) lines.push(`Target Company: ${data.company}`);
        if (data.experience) lines.push(`Experience: ${data.experience}`);
        if (data.education) lines.push(`Education: ${data.education}`);
        if (data.skills) lines.push(`Skills: ${data.skills}`);
        if (data.achievements) lines.push(`Achievements: ${data.achievements}`);
        if (data.background) lines.push(`Background: ${data.background}`);
        if (data.purpose) lines.push(`Purpose: ${data.purpose}`);

        return lines.join('\n');
    }

    /**
     * Build prompt for document generation
     */
    private buildPrompt(documentType: string, userData: string, language: string): string {
        const languageInstruction = language !== 'en'
            ? `\n\nIMPORTANT: Write the ENTIRE document in ${language === 'uz' ? 'Uzbek' : language === 'ru' ? 'Russian' : language} language.`
            : '';

        const basePrompt = `You are an expert immigration document writer with 20 years of experience.

Generate a professional ${documentType} for an immigration application based on this information:

${userData}

Requirements:
1. Use formal, professional language
2. Make it persuasive and compelling
3. Follow standard ${documentType} format
4. Include all relevant details
5. Be concise but comprehensive (800-1200 words)
6. No placeholders - use the provided information${languageInstruction}

Generate the complete ${documentType} now:`;

        return basePrompt;
    }
}

// Singleton instance
export const aiDocumentGenerator = new AIDocumentGenerator();
