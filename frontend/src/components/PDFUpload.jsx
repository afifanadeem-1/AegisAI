import { useRef, useState } from "react";
import { FileUp, FileText, LoaderCircle, AlertCircle, X, Send, CheckCircle2 } from "lucide-react";
import "./PDFUpload.css";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const MAX_SIZE = 10 * 1024 * 1024;

export default function PDFUpload() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState("");
  const [answers, setAnswers] = useState([]);
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState("");
  const inputRef = useRef(null);
  const abortRef = useRef(null);
  const askAbortRef = useRef(null);

  function reset() {
    abortRef.current?.abort();
    askAbortRef.current?.abort();
    setFile(null); setResult(null); setError(""); setLoading(false);
    setQuestion(""); setAnswers([]); setAsking(false); setAskError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  function chooseFile(event) {
    const selected = event.target.files?.[0] || null;
    askAbortRef.current?.abort();
    setResult(null); setError(""); setFile(null);
    setQuestion(""); setAnswers([]); setAskError(""); setAsking(false);
    if (!selected) return;
    if (!selected.name.toLowerCase().endsWith(".pdf")) {
      setError("Please select a PDF file."); event.target.value = ""; return;
    }
    if (selected.size > MAX_SIZE) {
      setError("PDF must be 10 MB or smaller."); event.target.value = ""; return;
    }
    setFile(selected);
  }

  async function upload(event) {
    event.preventDefault();
    if (!file || loading) return;
    setError(""); setResult(null); setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch(`${API_URL}/api/pdf/upload`, {
        method: "POST", body: form, signal: controller.signal,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : `Upload failed (${response.status})`);
      if (!Array.isArray(data.pages) || !data.pages.length) throw new Error("The server did not return extracted PDF pages. Restart the updated FastAPI backend.");
      if (!controller.signal.aborted) setResult(data);
    } catch (err) {
      if (err.name !== "AbortError") setError(err.message || "Unable to upload PDF.");
    } finally {
      if (abortRef.current === controller) { abortRef.current = null; setLoading(false); }
    }
  }

  async function askPDF(event) {
    event.preventDefault();
    const text = question.trim();
    if (!result || !text || asking) return;
    setAsking(true); setAskError("");
    const controller = new AbortController();
    askAbortRef.current = controller;
    try {
      const response = await fetch(`${API_URL}/api/pdf/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: result.filename, question: text, pages: result.pages }),
        signal: controller.signal,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : `Question failed (${response.status})`);
      if (typeof data.answer !== "string" || !data.answer.trim()) throw new Error("AI returned an empty answer.");
      if (!controller.signal.aborted) {
        setAnswers((old) => [...old, { question: text, answer: data.answer, pages: data.pages_used || [] }]);
        setQuestion("");
      }
    } catch (err) {
      if (err.name !== "AbortError") setAskError(err.message || "Unable to ask about PDF.");
    } finally {
      if (askAbortRef.current === controller) { askAbortRef.current = null; setAsking(false); }
    }
  }

  return (
    <section className="aegis-pdf-upload" aria-labelledby="pdf-upload-title">
      <div className="pdf-upload-header">
        <div className="pdf-upload-heading">
          <div className="pdf-upload-icon"><FileUp size={23} /></div>
          <div><h2 id="pdf-upload-title">Analyze your research paper</h2><p>Upload a text-based PDF · Maximum 10 MB · First 40 pages</p></div>
        </div>
      </div>
      <form onSubmit={upload}>
        <div className="pdf-upload-dropzone">
          <input ref={inputRef} type="file" accept=".pdf,application/pdf" aria-label="Select a research PDF" disabled={loading || asking} onChange={chooseFile} />
        </div>
        {file && <div className="pdf-upload-selected"><FileText size={20} /><div className="pdf-upload-file-info"><strong>{file.name}</strong><span>{(file.size / 1024 / 1024).toFixed(2)} MB</span></div><CheckCircle2 size={19} /></div>}
        <div className="pdf-upload-actions">
          <button type="submit" disabled={!file || loading || asking}>{loading ? <LoaderCircle size={17} className="spin" /> : <FileUp size={17} />}{loading ? "Extracting..." : "Upload and extract"}</button>
          {(file || result) && <button type="button" className="pdf-upload-clear" disabled={loading || asking} onClick={reset}><X size={17} /> Clear</button>}
        </div>
      </form>
      {error && <div className="pdf-upload-error" role="alert"><AlertCircle size={18} /> {error}</div>}
      {result && <div className="pdf-upload-result">
        <div className="pdf-upload-success"><CheckCircle2 size={21} /><div><strong>PDF extracted successfully</strong><p>{result.filename}</p></div></div>
        <div className="pdf-upload-stats">
          <div><strong>{result.pages_processed}/{result.page_count}</strong><span>Pages processed</span></div>
          <div><strong>{result.word_count.toLocaleString()}</strong><span>Words</span></div>
          <div><strong>{result.character_count.toLocaleString()}</strong><span>Characters</span></div>
        </div>
        {result.truncated && <p className="pdf-upload-warning">Only part of this PDF was extracted. Answers cannot cover omitted content.</p>}
        <details className="pdf-upload-preview"><summary>View extracted text preview</summary><pre>{result.preview}</pre></details>
        <div className="pdf-qa">
          <h3>Ask AegisAI about this PDF</h3>
          <p>Answers use relevant extracted excerpts and show supporting page numbers where available.</p>
          {answers.map((entry, index) => <div className="pdf-qa-answer" key={index}>
            <strong>You: {entry.question}</strong>
            <p className="pdf-qa-response">{entry.answer}</p>
            <small>Retrieved PDF pages: {entry.pages.length ? entry.pages.join(", ") : "not available"}. Verify claims against the original PDF.</small>
          </div>)}
          <form className="pdf-qa-form" onSubmit={askPDF}>
            <textarea aria-label="Ask a question about the PDF" placeholder="What methodology did the researchers use?" value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={2000} rows={2} disabled={asking} />
            <button type="submit" disabled={!question.trim() || asking}>{asking ? <LoaderCircle size={17} className="spin" /> : <Send size={17} />}{asking ? "Thinking..." : "Ask PDF"}</button>
          </form>
          {askError && <div className="pdf-upload-error" role="alert"><AlertCircle size={17} /> {askError}</div>}
        </div>
        <p className="pdf-upload-note">Extracted text stays in this browser session and is sent to your local FastAPI backend when you ask a question. The backend does not persist the PDF.</p>
      </div>}
    </section>
  );
}
