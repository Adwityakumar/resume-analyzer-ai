import os


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

    return max(_dot_product(source_embedding, target_embedding) for source_embedding in source_embeddings)


def get_embedding_load_error() -> str | None:
    return _load_error


def _get_model():
    global _model, _load_error

    if _model is not None or _load_error is not None:
        return _model

    try:
        from sentence_transformers import SentenceTransformer

        _model = SentenceTransformer(MODEL_NAME, local_files_only=True)
    except Exception as exc:
        _load_error = str(exc)
        _model = None

    return _model


def _dot_product(left, right) -> float:
    return float(sum(float(a) * float(b) for a, b in zip(left, right)))
