# retriever.py

from pathlib import Path
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


def load_documents():
    documents = []

    for path in sorted(Path("documents").glob("*.txt")):
        text = path.read_text(encoding="utf-8")

        documents.append({
            "source": path.name,
            "text": text
        })

    return documents


def search_documents(question, documents, top_k=3):
    if not documents:
        return []

    texts = [doc["text"] for doc in documents]

    vectorizer = TfidfVectorizer(stop_words="english")

    document_vectors = vectorizer.fit_transform(texts)
    question_vector = vectorizer.transform([question])

    scores = cosine_similarity(
        question_vector,
        document_vectors
    )[0]

    ranked_indices = scores.argsort()[::-1][:top_k]

    results = []

    for index in ranked_indices:
        if scores[index] <= 0:
            continue

        results.append({
            "source": documents[index]["source"],
            "text": documents[index]["text"],
            "score": float(scores[index])
        })

    return results


if __name__ == "__main__":
    documents = load_documents()

    question = "How much does the system cost?"

    results = search_documents(question, documents,top_k=1)

    for result in results:
        print("Source:", result["source"])
        print("Similarity:", round(result["score"], 3))
        print("Evidence:", result["text"])
        print("-" * 40)