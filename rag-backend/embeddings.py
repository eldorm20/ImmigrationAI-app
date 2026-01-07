from sentence_transformers import SentenceTransformer
import torch

class EmbeddingEngine:
    def __init__(self, model_name="all-MiniLM-L6-v2"):
        # Use CPU only for low memory footprint
        self.model = SentenceTransformer(model_name, device="cpu")

    def encode(self, texts):
        if isinstance(texts, str):
            texts = [texts]
        embeddings = self.model.encode(texts, convert_to_tensor=True)
        return embeddings.tolist()

embedding_engine = EmbeddingEngine()
