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

app = FastAPI(title="ImmigrationAI RAG Backend")

# Initialize Vector Store
client = chromadb.PersistentClient(path="./vector_store")
collection = client.get_or_create_collection(name="immigration_docs")

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
    # 1. Search for context
    context_results = await search_docs(SearchRequest(query=request.query, jurisdiction=request.jurisdiction))
    
    if not context_results:
        return {"answer": "I couldn't find any authoritative information on this topic.", "citations": []}

    context_str = "\n".join([f"[{i+1}] {r['content']} (Source: {r['metadata']['url']})" for i, r in enumerate(context_results)])
    
    # 2. Generate Answer
    prompt = f"<|system|>\nYou are an immigration expert. Use the following context to answer the question. Cite sources using [number].\nContext:\n{context_str}</s>\n<|user|>\n{request.query}</s>\n<|assistant|>\n"
    
    outputs = pipe(prompt, max_new_tokens=256, do_sample=True, temperature=0.7, top_k=50, top_p=0.95)
    answer = outputs[0]["generated_text"].split("<|assistant|>\n")[-1]
    
    log_audit("answer", {"query": request.query, "jurisdiction": request.jurisdiction, "num_citations": len(context_results)})
    
    return {
        "answer": answer,
        "citations": [r['metadata'] for r in context_results]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
