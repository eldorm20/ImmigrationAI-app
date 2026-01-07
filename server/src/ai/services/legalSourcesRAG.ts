// Legal Sources RAG (Retrieval Augmented Generation)
// Scrapes and indexes official immigration law sources with citations

import { ollamaClient } from '../ollama/client';
import { ChromaClient, Collection } from 'chromadb';

interface LegalSource {
    url: string;
    title: string;
    content: string;
    lastUpdated: string;
    authority: 'primary' | 'secondary';
    country: string;
    category: string;
}

interface CitedAnswer {
    answer: string;
    citations: Array<{
        source: string;
        url: string;
        authority: 'primary' | 'secondary';
        relevance: number;
        excerpt: string;
    }>;
    confidence: number;
}

// Official sources to scrape
const LEGAL_SOURCES = {
    primary: [
        // Uzbekistan primary sources
        {
            url: 'https://lex.uz',
            name: 'Lex.uz - Uzbekistan Legal Database',
            country: 'UZ',
            categories: ['immigration', 'visa', 'citizenship', 'residency'],
        },
    ],
    secondary: [
        // International government sources
        {
            url: 'https://www.gov.uk/browse/visas-immigration',
            name: 'UK Government - Immigration',
            country: 'UK',
        },
        {
            url: 'https://www.uscis.gov',
            name: 'US Citizenship and Immigration Services',
            country: 'US',
        },
        {
            url: 'https://www.canada.ca/en/immigration-refugees-citizenship.html',
            name: 'Immigration, Refugees and Citizenship Canada',
            country: 'CA',
        },
        {
            url: 'https://www.germany.visa/immigration-residence-permit',
            name: 'Germany Immigration Portal',
            country: 'DE',
        },
    ],
};

export class LegalSourcesRAG {
    private chromaClient: ChromaClient;
    private collection: Collection | null = null;

    constructor() {
        this.chromaClient = new ChromaClient({
            path: process.env.CHROMA_URL || 'http://localhost:8000',
        });
    }

    /**
     * Initialize vector database collection
     */
    async initialize(): Promise<void> {
        try {
            this.collection = await this.chromaClient.getOrCreateCollection({
                name: 'legal_sources',
                metadata: { description: 'Official immigration law sources' },
            });
            console.log('Legal sources collection initialized');
        } catch (error) {
            console.error('Error initializing legal sources:', error);
            throw error;
        }
    }

    /**
     * Scrape and index legal source
     */
    async indexLegalSource(source: LegalSource): Promise<void> {
        if (!this.collection) await this.initialize();

        try {
            // Split content into chunks for better retrieval
            const chunks = this.splitIntoChunks(source.content, 500);

            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];

                // Generate embedding using Ollama
                const embedding = await ollamaClient.embeddings(chunk);

                // Store in ChromaDB
                await this.collection!.add({
                    ids: [`${source.url}-chunk-${i}`],
                    embeddings: [embedding],
                    documents: [chunk],
                    metadatas: [{
                        url: source.url,
                        title: source.title,
                        authority: source.authority,
                        country: source.country,
                        category: source.category,
                        lastUpdated: source.lastUpdated,
                        chunkIndex: i,
                    }],
                });
            }

            console.log(`Indexed ${chunks.length} chunks from ${source.url}`);
        } catch (error) {
            console.error(`Error indexing ${source.url}:`, error);
        }
    }

    /**
     * Query legal sources with citations
     */
    async queryWithCitations(
        question: string,
        country?: string,
        topK: number = 5
    ): Promise<CitedAnswer> {
        if (!this.collection) await this.initialize();

        try {
            // Generate query embedding
            const queryEmbedding = await ollamaClient.embeddings(question);

            // Search vector database
            const results = await this.collection!.query({
                queryEmbeddings: [queryEmbedding],
                nResults: topK,
                where: country ? { country } : undefined,
            });

            // Build context from retrieved documents
            const context = this.buildContext(results);

            // Generate answer with citations using Ollama
            const answer = await this.generateCitedAnswer(question, context);

            return answer;
        } catch (error) {
            console.error('Error querying legal sources:', error);
            return {
                answer: 'Unable to retrieve legal information at this time.',
                citations: [],
                confidence: 0,
            };
        }
    }

    /**
     * Generate answer with proper citations
     */
    private async generateCitedAnswer(
        question: string,
        context: Array<{ content: string; metadata: any; distance: number }>
    ): Promise<CitedAnswer> {
        // Build prompt with context and citation requirements
        const contextText = context
            .map((c, i) => `[Source ${i + 1}] ${c.metadata.title} (${c.metadata.url}):\n${c.content}`)
            .join('\n\n');

        const prompt = `You are a legal immigration expert. Answer the following question using ONLY the provided official sources. You MUST cite your sources.

QUESTION: ${question}

OFFICIAL SOURCES:
${contextText}

INSTRUCTIONS:
1. Answer the question accurately based ONLY on the provided sources
2. Cite sources using [Source X] notation
3. If the sources don't contain the answer, say "The provided sources do not contain information about this topic"
4. Be precise and quote relevant passages
5. Maintain a professional, legal tone

ANSWER:`;

        const response = await ollamaClient.generate(prompt, {
            model: 'mixtral:8x7b', // Use advanced model for legal analysis
            temperature: 0.2, // Low temperature for factual accuracy
        });

        // Extract citations from answer
        const citations = context.map((c, i) => ({
            source: c.metadata.title,
            url: c.metadata.url,
            authority: c.metadata.authority as 'primary' | 'secondary',
            relevance: 1 - c.distance, // Convert distance to relevance score
            excerpt: c.content.substring(0, 200) + '...',
        }));

        // Calculate confidence based on source authority and relevance
        const confidence = this.calculateConfidence(citations);

        return {
            answer: response.trim(),
            citations,
            confidence,
        };
    }

    /**
     * Scrape content from URL (simplified - would use proper scraper in production)
     */
    async scrapeUrl(url: string): Promise<string> {
        try {
            const response = await fetch(url);
            const html = await response.text();

            // Basic HTML to text conversion
            // In production, use a proper HTML parser like cheerio
            const text = html
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();

            return text;
        } catch (error) {
            console.error(`Error scraping ${url}:`, error);
            return '';
        }
    }

    /**
     * Index all official sources
     */
    async indexAllSources(): Promise<void> {
        console.log('Starting to index all legal sources...');

        // Index primary sources (lex.uz)
        for (const source of LEGAL_SOURCES.primary) {
            const content = await this.scrapeUrl(source.url);
            if (content) {
                await this.indexLegalSource({
                    url: source.url,
                    title: source.name,
                    content,
                    lastUpdated: new Date().toISOString(),
                    authority: 'primary',
                    country: source.country,
                    category: 'immigration',
                });
            }
        }

        // Index secondary sources (gov websites)
        for (const source of LEGAL_SOURCES.secondary) {
            const content = await this.scrapeUrl(source.url);
            if (content) {
                await this.indexLegalSource({
                    url: source.url,
                    title: source.name,
                    content,
                    lastUpdated: new Date().toISOString(),
                    authority: 'secondary',
                    country: source.country,
                    category: 'immigration',
                });
            }
        }

        console.log('Finished indexing all legal sources');
    }

    /**
     * Split text into chunks
     */
    private splitIntoChunks(text: string, chunkSize: number): string[] {
        const words = text.split(/\s+/);
        const chunks: string[] = [];

        for (let i = 0; i < words.length; i += chunkSize) {
            chunks.push(words.slice(i, i + chunkSize).join(' '));
        }

        return chunks;
    }

    /**
     * Build context from search results
     */
    private buildContext(results: any): Array<{ content: string; metadata: any; distance: number }> {
        const documents = results.documents[0] || [];
        const metadatas = results.metadatas[0] || [];
        const distances = results.distances[0] || [];

        return documents.map((doc: string, i: number) => ({
            content: doc,
            metadata: metadatas[i],
            distance: distances[i],
        }));
    }

    /**
     * Calculate confidence score
     */
    private calculateConfidence(citations: Array<{ authority: string; relevance: number }>): number {
        if (citations.length === 0) return 0;

        const scores = citations.map(c => {
            const authorityWeight = c.authority === 'primary' ? 1.0 : 0.7;
            return c.relevance * authorityWeight;
        });

        return scores.reduce((a, b) => a + b, 0) / scores.length;
    }
}

// Singleton instance
export const legalSourcesRAG = new LegalSourcesRAG();
