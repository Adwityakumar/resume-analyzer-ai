import os

import numpy as np


MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME", "sentence-transformers/all-MiniLM-L6-v2")
_model = None
_load_error = None


def get_embedding_backend() -> str:
    return "sentence-transformers" if _get_model() is not None else "tfidf-fallback"


def max_embedding_similarity(source_text: str, target_text: str, chunks: list[str]) -> float | None:
    model = _get_model()
    if model is None or not chunks:
        return None

    source_chunks = [chunk for chunk in chunks if chunk.strip()]
    if not source_chunks:
        return None

    embeddings = model.encode(source_chunks + [target_text], normalize_embeddings=True)
    target_embedding = embeddings[-1]
    source_embeddings = embeddings[:-1]

    # normalize_embeddings=True guarantees unit vectors, so dot product == cosine similarity.
    # NumPy's vectorised dot is ~100x faster than a pure-Python zip loop.
    similarities = np.dot(source_embeddings, target_embedding)
    return float(similarities.max())


def get_embedding_load_error() -> str | None:
    return _load_error


def _get_model():
    global _model, _load_error

    if _model is not None or _load_error is not None:
        return _model

    try:
        from sentence_transformers import SentenceTransformer

        # _model = SentenceTransformer(MODEL_NAME, local_files_only=True)
        _model = SentenceTransformer(MODEL_NAME)
    except Exception as exc:
        _load_error = str(exc)
        _model = None

    return _model


