// Ollama Client - Interface to local LLM runtime
import { AI_CONFIG } from './config';

interface OllamaRequest {
    model: string;
    prompt: string;
    stream?: boolean;
    temperature?: number;
    max_tokens?: number;
    system?: string;
}

interface OllamaResponse {
    model: string;
    created_at: string;
    response: string;
    done: boolean;
    context?: number[];
    total_duration?: number;
    load_duration?: number;
    prompt_eval_duration?: number;
}

export class OllamaClient {
    private baseUrl: string;

    constructor(baseUrl?: string) {
        this.baseUrl = baseUrl || AI_CONFIG.ollama.baseUrl;
    }

    /**
     * Generate text completion
     */
    async generate(
        prompt: string,
        options: {
            model?: string;
            system?: string;
            temperature?: number;
            maxTokens?: number;
        } = {}
    ): Promise<string> {
        const model = options.model || AI_CONFIG.ollama.models.primary;

        const request: OllamaRequest = {
            model,
            prompt,
            stream: false,
            temperature: options.temperature ?? AI_CONFIG.ollama.defaultTemperature,
            max_tokens: options.maxTokens ?? AI_CONFIG.ollama.maxTokens,
        };

        if (options.system) {
            request.system = options.system;
        }

        const response = await fetch(`${this.baseUrl}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.statusText}`);
        }

        const data: OllamaResponse = await response.json();
        return data.response;
    }

    /**
     * Generate streaming completion (for chat interfaces)
     */
    async* generateStream(
        prompt: string,
        options: {
            model?: string;
            system?: string;
            temperature?: number;
        } = {}
    ): AsyncGenerator<string> {
        const model = options.model || AI_CONFIG.ollama.models.primary;

        const request: OllamaRequest = {
            model,
            prompt,
            stream: true,
            temperature: options.temperature ?? AI_CONFIG.ollama.defaultTemperature,
        };

        if (options.system) {
            request.system = options.system;
        }

        const response = await fetch(`${this.baseUrl}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error('No response body');
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const data: OllamaResponse = JSON.parse(line);
                    if (data.response) {
                        yield data.response;
                    }
                } catch (e) {
                    console.error('Error parsing stream:', e);
                }
            }
        }
    }

    /**
     * Chat completion with conversation history
     */
    async chat(
        messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
        options: {
            model?: string;
            temperature?: number;
        } = {}
    ): Promise<string> {
        const model = options.model || AI_CONFIG.ollama.models.primary;

        const response = await fetch(`${this.baseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                messages,
                stream: false,
                temperature: options.temperature ?? AI_CONFIG.ollama.defaultTemperature,
            }),
        });

        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.message?.content || '';
    }

    /**
     * Get embeddings for vector storage
     */
    async embeddings(text: string, model: string = 'nomic-embed-text'): Promise<number[]> {
        const response = await fetch(`${this.baseUrl}/api/embeddings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                prompt: text,
            }),
        });

        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.embedding;
    }

    /**
     * List available models
     */
    async listModels(): Promise<string[]> {
        const response = await fetch(`${this.baseUrl}/api/tags`);
        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.models?.map((m: any) => m.name) || [];
    }
}

// Singleton instance
export const ollamaClient = new OllamaClient();
