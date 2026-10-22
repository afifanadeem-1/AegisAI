"""AegisAI Lesson 38: isolated API tests. Run from project root with pytest."""
import io
import requests
import pytest
from fastapi.testclient import TestClient
from pypdf import PdfWriter
import main

client = TestClient(main.app)

PAPER = {"title": "Test Paper", "abstract": "This paper investigates agentic AI in healthcare.", "authors": ["Researcher A"], "year": 2025, "id": "https://openalex.org/W1234567890"}


def test_home():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "running"


def test_research_rejects_invalid_inputs():
    assert client.get("/api/research", params={"topic": "  "}).status_code == 400
    assert client.get("/api/research", params={"topic": "AI", "limit": 21}).status_code == 400


def test_research_success_without_network(monkeypatch):
    monkeypatch.setattr(main, "search_research", lambda topic, limit: [PAPER])
    response = client.get("/api/research", params={"topic": "AI", "limit": 5})
    assert response.status_code == 200
    assert response.json()["count"] == 1


def test_chat_requires_user_last_message():
    response = client.post("/api/chat", json={"messages": [{"role": "assistant", "content": "Hi"}]})
    assert response.status_code == 400


def test_chat_validates_paper_contexts():
    response = client.post("/api/chat", json={"messages": [{"role": "user", "content": "Compare"}], "paper_context": PAPER, "paper_contexts": [PAPER, PAPER]})
    assert response.status_code == 400


def test_chat_success_and_sources(monkeypatch):
    monkeypatch.setattr(main, "ask_llm", lambda messages: "The abstract discusses agentic AI.")
    response = client.post("/api/chat", json={"messages": [{"role": "user", "content": "What is this about?"}], "paper_context": PAPER})
    assert response.status_code == 200
    assert response.json()["basis"] == "abstract"
    assert response.json()["sources"][0]["url"] == PAPER["id"]


def test_chat_ollama_unavailable(monkeypatch):
    def offline(messages):
        raise requests.exceptions.ConnectionError("simulated offline")
    monkeypatch.setattr(main, "ask_llm", offline)
    response = client.post("/api/chat", json={"messages": [{"role": "user", "content": "Hello"}]})
    assert response.status_code == 503


def test_summarize_success(monkeypatch):
    monkeypatch.setattr(main, "ask_llm", lambda messages: "Main Idea: Testing")
    response = client.post("/api/summarize", json={"title": "Paper", "abstract": "Some research abstract."})
    assert response.status_code == 200
    assert "Testing" in response.json()["summary"]


def test_report_requires_two_papers():
    response = client.post("/api/report", json={"topic": "AI", "papers": [PAPER]})
    assert response.status_code == 422


def test_report_success(monkeypatch):
    monkeypatch.setattr(main, "ask_llm", lambda messages: "# Research Report\n## Conclusion\nTest")
    response = client.post("/api/report", json={"topic": "AI", "papers": [PAPER, PAPER]})
    assert response.status_code == 200
    assert response.json()["basis"] == "abstract"


def test_pdf_rejects_non_pdf():
    response = client.post("/api/pdf/upload", files={"file": ("note.txt", b"not a pdf", "text/plain")})
    assert response.status_code == 400


def test_pdf_rejects_invalid_signature():
    response = client.post("/api/pdf/upload", files={"file": ("fake.pdf", b"not a pdf", "application/pdf")})
    assert response.status_code == 400


def test_pdf_rejects_oversized_file():
    content = b"%PDF-" + b"x" * (main.MAX_PDF_BYTES + 1)
    response = client.post("/api/pdf/upload", files={"file": ("large.pdf", content, "application/pdf")})
    assert response.status_code == 413


def test_pdf_rejects_image_or_blank_only_pdf():
    writer = PdfWriter()
    writer.add_blank_page(width=300, height=300)
    data = io.BytesIO()
    writer.write(data)
    response = client.post("/api/pdf/upload", files={"file": ("blank.pdf", data.getvalue(), "application/pdf")})
    assert response.status_code == 422


def test_pdf_question_answer_success(monkeypatch):
    monkeypatch.setattr(main, "ask_llm", lambda messages: "The answer is on page 2 [p. 2].")
    response = client.post("/api/pdf/ask", json={"filename": "test.pdf", "question": "What does the paper say about neural networks?", "pages": [{"page": 2, "text": "The paper describes neural networks for classification."}]})
    assert response.status_code == 200
    assert response.json()["pages_used"] == [2]


def test_pdf_question_rejects_missing_pages():
    response = client.post("/api/pdf/ask", json={"filename": "test.pdf", "question": "What is the conclusion?", "pages": []})
    assert response.status_code == 422


def test_pdf_question_handles_ollama_failure(monkeypatch):
    def offline(messages):
        raise requests.exceptions.ConnectionError("simulated offline")
    monkeypatch.setattr(main, "ask_llm", offline)
    response = client.post("/api/pdf/ask", json={"filename": "test.pdf", "question": "What is the conclusion?", "pages": [{"page": 1, "text": "The conclusion is positive."}]})
    assert response.status_code == 503
