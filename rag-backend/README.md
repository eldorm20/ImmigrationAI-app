# ImmigrationAI RAG Backend

This microservice provides Retrieval-Augmented Generation capabilities for the ImmigrationAI platform. It is built with FastAPI and designed for CPU-only inference.

## Features
- **RAG Pipeline**: Scrapes authoritative sources, chunks text, generates embeddings, and stores them in a persistent vector store (ChromaDB).
- **Embedded LLM**: Uses `TinyLlama-1.1B` for answer generation, ensuring low memory footprint.
- **Citation Enforcement**: Every answer generated via `/answer` includes numbered citations linked to source URLs and metadata.
- **Audit Logging**: All ingestion and answering actions are logged to `audit_log.jsonl`.
- **Jurisdiction Filtering**: Search and Answer endpoints support jurisdiction-specific retrieval to prevent data cross-contamination.

## API Endpoints
- `POST /ingest`: Ingest a URL. Scrapes content, chunks it, and adds to vector store.
- `POST /search`: Perform a semantic search across stored documents.
- `POST /answer`: Generate a cited answer for a specific query.

## Deployment on Railway
1. Push this directory to your repository.
2. Link the project to Railway.
3. Add a **Persistent Volume** mounted at `/app/vector_store`.
4. The `Dockerfile` handles the installation of CPU-optimized PyTorch and relevant models.

## Ingestion Pipeline
1. **Scraper**: Uses `BeautifulSoup4` with custom headers to fetch authoritative content.
2. **Chunker**: Character-based chunking with 450-character windows and 50-character overlap.
3. **Embedder**: `sentence-transformers/all-MiniLM-L6-v2`.
4. **Storage**: ChromaDB for persistence.

## Agent Routing Logic
- **Eligibility Agent**: Uses `/search` with intent "eligibility" to find specific rules.
- **Checklist Agent**: Parses `/answer` results to extract list-formatted requirements.
- **Policy Navigator**: High-K retrieval for deep statute explanation.
