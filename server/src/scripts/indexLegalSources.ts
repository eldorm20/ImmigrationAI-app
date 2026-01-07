// Script to index legal sources on startup
import { legalSourcesRAG } from '../ai/services/legalSourcesRAG';
import { ollamaClient } from '../ai/ollama/client';

async function indexLegalSources() {
    console.log('🚀 Starting legal sources indexing...\n');

    try {
        // Check Ollama availability
        console.log('Checking Ollama connection...');
        const models = await ollamaClient.listModels();
        console.log(`✅ Ollama connected. Available models: ${models.join(', ')}\n`);

        // Initialize RAG system
        console.log('Initializing legal sources RAG system...');
        await legalSourcesRAG.initialize();
        console.log('✅ RAG system initialized\n');

        // Index all legal sources
        console.log('Indexing legal sources from official websites...');
        console.log('  - lex.uz (Uzbekistan - PRIMARY)');
        console.log('  - gov.uk (UK - SECONDARY)');
        console.log('  - uscis.gov (US - SECONDARY)');
        console.log('  - canada.ca (Canada - SECONDARY)');
        console.log('  - germany.visa (Germany - SECONDARY)\n');

        await legalSourcesRAG.indexAllSources();

        console.log('\n✅ Legal sources indexed successfully!');
        console.log('📚 The AI can now provide cited answers from official sources\n');

    } catch (error) {
        console.error('❌ Error indexing legal sources:', error);
        process.exit(1);
    }
}

// Run if executed directly
if (require.main === module) {
    indexLegalSources()
        .then(() => {
            console.log('Indexing complete. Exiting...');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

export { indexLegalSources };
