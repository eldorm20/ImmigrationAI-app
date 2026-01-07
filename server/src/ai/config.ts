// AI Configuration - Ollama + LangChain Integration
// Zero-cost, unlimited AI powered by open-source models

export const AI_CONFIG = {
    // Ollama Configuration (Local LLM Runtime)
    ollama: {
        baseUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
        models: {
            // Primary model for general tasks
            primary: 'llama3:8b',
            // Fast model for quick responses
            fast: 'mistral:7b',
            // Large model for complex reasoning
            advanced: 'mixtral:8x7b',
            // Multilingual model
            multilingual: 'aya:8b',
        },
        defaultTemperature: 0.7,
        maxTokens: 2048,
    },

    // LangChain Configuration
    langchain: {
        // Vector store for RAG (Retrieval Augmented Generation)
        vectorStore: {
            type: 'chroma',
            path: './data/vectors',
            collectionName: 'immigration_docs',
        },
        // Memory for conversational context
        memory: {
            type: 'buffer',
            maxMessages: 10,
        },
    },

    // Model Selection by Task
    taskModels: {
        'document-generation': 'llama3:8b',
        'interview-eval': 'mixtral:8x7b',
        'translation': 'aya:8b',
        'chat': 'mistral:7b',
        'case-analysis': 'mixtral:8x7b',
        'eligibility-check': 'llama3:8b',
    },

    // Prompt Templates
    prompts: {
        documentGeneration: `You are an expert immigration document writer. Generate a professional {documentType} based on the following information:\n\n{userData}\n\nEnsure the document is:\n- Professionally formatted\n- Legally compliant\n- Persuasive and well-structured\n- Free of errors`,

        interviewEval: `You are an immigration interview evaluator. Assess the following answer:\n\nQuestion: {question}\nAnswer: {answer}\n\nProvide:\n1. Score (0-10)\n2. Strengths\n3. Weaknesses\n4. Improvement suggestions`,

        eligibilityCheck: `You are an immigration eligibility expert. Analyze this profile:\n\n{profileData}\n\nDetermine:\n1. Eligibility score (0-100)\n2. Qualifying factors\n3. Risk factors\n4. Recommendations`,

        caseAnalysis: `You are an immigration case analyst. Review this case:\n\n{caseData}\n\nProvide:\n1. Case strength assessment\n2. Missing documents\n3. Next steps\n4. Timeline estimate`,
    },
};

// Model availability check
export async function checkOllamaAvailability(): Promise<boolean> {
    try {
        const response = await fetch(`${AI_CONFIG.ollama.baseUrl}/api/tags`);
        return response.ok;
    } catch {
        return false;
    }
}

// Get available models
export async function getAvailableModels(): Promise<string[]> {
    try {
        const response = await fetch(`${AI_CONFIG.ollama.baseUrl}/api/tags`);
        const data = await response.json();
        return data.models?.map((m: any) => m.name) || [];
    } catch {
        return [];
    }
}

// Pull model if not available
export async function ensureModel(modelName: string): Promise<void> {
    const available = await getAvailableModels();
    if (!available.includes(modelName)) {
        console.log(`Pulling model: ${modelName}...`);
        await fetch(`${AI_CONFIG.ollama.baseUrl}/api/pull`, {
            method: 'POST',
            body: JSON.stringify({ name: modelName }),
        });
    }
}
