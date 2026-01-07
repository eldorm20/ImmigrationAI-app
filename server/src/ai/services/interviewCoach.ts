// AI Interview Coach - FREE Multi-Agent System
import { ollamaClient } from '../ollama/client';
import { AI_CONFIG } from '../config';

interface InterviewQuestion {
    id: string;
    category: string;
    question: string;
    difficulty: 'easy' | 'medium' | 'hard';
    expectedPoints: string[];
}

interface EvaluationResult {
    score: number;
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
    detailedFeedback: string;
}

export class AIInterviewCoach {
    /**
     * Generate interview questions based on visa type and country
     */
    async generateQuestions(
        visaType: string,
        targetCountry: string,
        count: number = 10
    ): Promise<InterviewQuestion[]> {
        const prompt = `You are an immigration interview expert. Generate ${count} realistic interview questions for a ${visaType} visa application to ${targetCountry}.

For each question, provide:
1. Category (background, purpose, financial, ties, etc.)
2. The question
3. Difficulty level (easy/medium/hard)
4. Expected key points in a good answer

Return as JSON array:
[
  {
    "category": "...",
    "question": "...",
    "difficulty": "...",
    "expectedPoints": ["point 1", "point 2", ...]
  },
  ...
]`;

        const response = await ollamaClient.generate(prompt, {
            model: AI_CONFIG.ollama.models.advanced,
            temperature: 0.8,
        });

        try {
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const questions = JSON.parse(jsonMatch[0]);
                return questions.map((q: any, idx: number) => ({
                    id: `q-${idx + 1}`,
                    category: q.category || 'General',
                    question: q.question,
                    difficulty: q.difficulty || 'medium',
                    expectedPoints: q.expectedPoints || [],
                }));
            }
        } catch (e) {
            console.error('Error parsing questions:', e);
        }

        // Fallback questions
        return this.getDefaultQuestions(visaType);
    }

    /**
     * Evaluate user's answer using AI
     */
    async evaluateAnswer(
        question: string,
        answer: string,
        expectedPoints: string[] = []
    ): Promise<EvaluationResult> {
        const expectedPointsText = expectedPoints.length > 0
            ? `\n\nExpected key points:\n${expectedPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}`
            : '';

        const prompt = `You are an experienced immigration interview evaluator. Evaluate this answer:

QUESTION: ${question}
ANSWER: ${answer}${expectedPointsText}

Provide evaluation in JSON format:
{
  "score": <0-10>,
  "strengths": ["strength 1", "strength 2", ...],
  "weaknesses": ["weakness 1", "weakness 2", ...],
  "suggestions": ["suggestion 1", "suggestion 2", ...],
  "detailedFeedback": "overall feedback paragraph"
}

Be constructive and specific. Focus on clarity, completeness, and persuasiveness.`;

        const response = await ollamaClient.generate(prompt, {
            model: AI_CONFIG.ollama.models.advanced,
            temperature: 0.4,
        });

        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            console.error('Error parsing evaluation:', e);
        }

        // Fallback evaluation
        return {
            score: 7,
            strengths: ['Clear response'],
            weaknesses: ['Could be more detailed'],
            suggestions: ['Provide specific examples'],
            detailedFeedback: 'Good answer overall. Consider adding more personal examples.'
        };
    }

    /**
     * Get model answer for reference
     */
    async generateModelAnswer(
        question: string,
        context: {
            visaType?: string;
            background?: string;
            purpose?: string;
        } = {}
    ): Promise<string> {
        const prompt = `You are preparing for an immigration interview. Generate a strong, persuasive answer to this question:

QUESTION: ${question}

${context.visaType ? `Visa Type: ${context.visaType}` : ''}
${context.background ? `Your Background: ${context.background}` : ''}
${context.purpose ? `Purpose: ${context.purpose}` : ''}

Provide a model answer that is:
- Honest and sincere
- Well-structured and clear
- Includes specific examples
- Addresses potential concerns
- About 100-150 words

Model Answer:`;

        return await ollamaClient.generate(prompt, {
            model: AI_CONFIG.ollama.models.primary,
            temperature: 0.7,
        });
    }

    /**
     * Practice session with AI interviewer (conversational)
     */
    async conductPracticeSession(
        conversationHistory: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
        visaType: string
    ): Promise<string> {
        // Add system context if first message
        if (conversationHistory.length === 0) {
            conversationHistory.unshift({
                role: 'system',
                content: `You are a friendly but professional immigration officer conducting a ${visaType} visa interview. Ask relevant questions, follow up based on answers, and maintain a conversational flow. Be realistic but supportive.`
            });
        }

        return await ollamaClient.chat(conversationHistory, {
            model: AI_CONFIG.ollama.models.primary,
        });
    }

    /**
     * Get default fallback questions
     */
    private getDefaultQuestions(visaType: string): InterviewQuestion[] {
        const common: InterviewQuestion[] = [
            {
                id: 'q-1',
                category: 'Purpose',
                question: `Why do you want to apply for a ${visaType} visa?`,
                difficulty: 'easy',
                expectedPoints: ['Clear purpose', 'Specific goals', 'Timeline'],
            },
            {
                id: 'q-2',
                category: 'Background',
                question: 'Tell me about your current situation and background.',
                difficulty: 'easy',
                expectedPoints: ['Current occupation', 'Family status', 'Qualifications'],
            },
            {
                id: 'q-3',
                category: 'Ties',
                question: 'What ties do you have to your home country?',
                difficulty: 'medium',
                expectedPoints: ['Family', 'Property', 'Employment', 'Intent to return'],
            },
            {
                id: 'q-4',
                category: 'Financial',
                question: 'How will you support yourself financially?',
                difficulty: 'medium',
                expectedPoints: ['Income sources', 'Savings', 'Sponsor details'],
            },
            {
                id: 'q-5',
                category: 'Plans',
                question: 'What are your plans after arriving in the destination country?',
                difficulty: 'medium',
                expectedPoints: ['Specific plans', 'Timeline', 'Preparation'],
            },
        ];

        return common;
    }
}

// Singleton instance
export const aiInterviewCoach = new AIInterviewCoach();
