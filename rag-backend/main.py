"""
RAG Backend - FastAPI Microservice for Retrieval-Augmented Generation
Deployed on Railway - Last updated: 2025-12-23
"""
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional
import chromadb
from chromadb.config import Settings
import os
from embeddings import embedding_engine
from ingest import ingest_pipeline
from transformers import pipeline
import torch
import datetime
import json
import time
from collections import OrderedDict

# Simple LRU Cache
class LRUCache:
    def __init__(self, capacity: int = 100):
        self.cache = OrderedDict()
        self.capacity = capacity

    def get(self, key: str):
        if key not in self.cache:
            return None
        self.cache.move_to_end(key)
        return self.cache[key]

    def put(self, key: str, value: any):
        self.cache[key] = value
        self.cache.move_to_end(key)
        if len(self.cache) > self.capacity:
            self.cache.popitem(last=False)

response_cache = LRUCache(100)

app = FastAPI(title="ImmigrationAI RAG Backend")

# Initialize Vector Store
client = chromadb.PersistentClient(path="./vector_store")
collection = client.get_or_create_collection(name="immigration_docs")

@app.get("/")
async def root():
    return {"message": "ImmigrationAI RAG Backend is running", "status": "healthy"}


# Initialize LLM for Answer Generation
# Note: Using a small model for CPU-only inference
device = -1 # CPU
model_id = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"
pipe = pipeline("text-generation", model=model_id, torch_dtype=torch.bfloat16, device_map="auto")

class IngestRequest(BaseModel):
    url: str
    jurisdiction: str
    section_title: str
    effective_date: Optional[str] = None

class SearchRequest(BaseModel):
    query: str
    jurisdiction: Optional[str] = None
    top_k: int = 5

class AnswerRequest(BaseModel):
    query: str
    jurisdiction: Optional[str] = None

@app.post("/ingest")
async def ingest_doc(request: IngestRequest, background_tasks: BackgroundTasks):
    content = ingest_pipeline.scrape_url(request.url)
    if not content:
        raise HTTPException(status_code=400, detail="Failed to scrape content from URL")
    
    chunks = ingest_pipeline.chunk_text(content)
    
    for i, chunk in enumerate(chunks):
        doc_id = f"{request.jurisdiction}_{request.section_title}_{i}".lower().replace(" ", "_")
        collection.add(

            documents=[chunk],
            metadatas=[{
                "url": request.url,
                "jurisdiction": request.jurisdiction,
                "title": request.section_title,
                "date": request.effective_date or "Unknown",
                "last_verified": datetime.datetime.now().isoformat()
            }],
            ids=[doc_id]
        )
    
    log_audit("ingest", {"url": request.url, "jurisdiction": request.jurisdiction, "chunks": len(chunks)})
    return {"status": "success", "chunks_ingested": len(chunks)}

def log_audit(action: str, details: dict):
    log_entry = {
        "timestamp": datetime.datetime.now().isoformat(),
        "action": action,
        "details": details
    }
    with open("audit_log.jsonl", "a") as f:
        f.write(json.dumps(log_entry) + "\n")

@app.post("/search")
async def search_docs(request: SearchRequest):
    where_clause = {}
    if request.jurisdiction:
        where_clause["jurisdiction"] = request.jurisdiction

    results = collection.query(
        query_texts=[request.query],
        n_results=request.top_k,
        where=where_clause
    )
    
    formatted_results = []
    for i in range(len(results['documents'][0])):
        formatted_results.append({
            "content": results['documents'][0][i],
            "metadata": results['metadatas'][0][i],
            "distance": results['distances'][0][i]
        })
    
    return formatted_results

@app.post("/answer")
async def get_answer(request: AnswerRequest):
    # Check cache
    cache_key = f"{request.jurisdiction}:{request.query}"
    cached = response_cache.get(cache_key)
    if cached:
        return cached

    # 1. Search for context
    context_results = await search_docs(SearchRequest(query=request.query, jurisdiction=request.jurisdiction))
    
    if not context_results:
        return {"answer": "I couldn't find any authoritative information on this topic.", "citations": []}

    context_str = "\n".join([f"[{i+1}] {r['content']} (Source: {r['metadata']['url']})" for i, r in enumerate(context_results)])
    
    # 2. Generate Answer
    prompt = f"<|system|>\nYou are an experienced immigration lawyer assistant for Uzbekistan, UK, and USA.\nAnswer the user's question based strictly on the provided context.\nIf the answer is not in the context, state that you do not have enough specific information. Do not hallucinate rules.\nCitations: Always refer to the source number [x] when making a claim.\n\nContext:\n{context_str}</s>\n<|user|>\n{request.query}</s>\n<|assistant|>\n"
    
    outputs = pipe(prompt, max_new_tokens=256, do_sample=True, temperature=0.7, top_k=50, top_p=0.95)
    answer = outputs[0]["generated_text"].split("<|assistant|>\n")[-1]
    
    log_audit("answer", {"query": request.query, "jurisdiction": request.jurisdiction, "num_citations": len(context_results)})
    
    result = {
        "answer": answer,
        "citations": [r['metadata'] for r in context_results]
    }
    
    # Cache result
    response_cache.put(cache_key, result)
    
    return result

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
