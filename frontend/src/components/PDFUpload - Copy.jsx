
import { useRef, useState } from "react";
import {
  FileUp,
  FileText,
  LoaderCircle,
  AlertCircle,
  X,
  CheckCircle2,
  FileCheck2,
} from "lucide-react";
import "./PDFUpload.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const MAX_SIZE = 10 * 1024 * 1024;

export default function PDFUpload() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const inputRef = useRef(null);
  const abortRef = useRef(null);

  function chooseFile(event) {
    const selected = event.target.files?.[0] || null;

    setResult(null);
    setError("");
    setFile(null);

    if (!selected) return;

    if (!selected.name.toLowerCase().endsWith(".pdf")) {
      setError("Please select a valid PDF file.");
      event.target.value = "";
      return;
    }

    if (selected.size > MAX_SIZE) {
      setError("PDF must be 10 MB or smaller.");
      event.target.value = "";
      return;
    }

    setFile(selected);
  }

  async function upload(event) {
    event.preventDefault();

    if (!file || loading) return;

    setError("");
    setResult(null);
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const form = new FormData();
      form.append("file", file);

      const response = await fetch(
        `${API_URL}/api/pdf/upload`,
        {
          method: "POST",
          body: form,
          signal: controller.signal,
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : `Upload failed (HTTP ${response.status})`
        );
      }

      if (
        typeof data.preview !== "string" ||
        typeof data.word_count !== "number"
      ) {
        throw new Error("Invalid response from the PDF API.");
      }

      if (!controller.signal.aborted) {
        setResult(data);
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        setError(
          err.message || "Unable to upload the PDF."
        );
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setLoading(false);
      }
    }
  }

  function clearUpload() {
    abortRef.current?.abort();
    abortRef.current = null;

    setFile(null);
    setResult(null);
    setError("");
    setLoading(false);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function formatSize(bytes) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  return (
    <section
      className="aegis-pdf-upload"
      aria-labelledby="pdf-upload-title"
    >
      <div className="pdf-upload-header">
        <div className="pdf-upload-heading">
          <div className="pdf-upload-icon">
            <FileUp size={23} />
          </div>

          <div>
            <h2 id="pdf-upload-title">
              Upload Research Paper
            </h2>
            <p>
              Import a PDF to extract and analyze
              its content.
            </p>
          </div>
        </div>

        <span className="pdf-upload-badge">
          PDF IMPORT
        </span>
      </div>

      <form onSubmit={upload}>
        <div className="pdf-upload-dropzone">
          <div className="pdf-upload-cloud">
            <FileUp size={30} />
          </div>

          <h3>Choose a research paper</h3>

          <p>
            Select a text-based PDF from your computer.
          </p>

          <input
            ref={inputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={chooseFile}
            disabled={loading}
            aria-label="Select a research PDF"
          />

          <span className="pdf-upload-hint">
            PDF only · Maximum 10 MB · First 40 pages
          </span>
        </div>

        {file && (
          <div className="pdf-upload-selected">
            <FileText size={22} />

            <div className="pdf-upload-file-info">
              <strong>{file.name}</strong>
              <span>{formatSize(file.size)}</span>
            </div>

            <CheckCircle2 size={20} />
          </div>
        )}

        <div className="pdf-upload-actions">
          <button
            type="submit"
            disabled={!file || loading}
          >
            {loading ? (
              <LoaderCircle
                size={18}
                className="spin"
              />
            ) : (
              <FileUp size={18} />
            )}

            {loading
              ? "Extracting text..."
              : "Upload and Extract"}
          </button>

          {(file || result) && (
            <button
              type="button"
              className="pdf-upload-clear"
              onClick={clearUpload}
            >
              <X size={17} />
              Clear
            </button>
          )}
        </div>
      </form>

      {error && (
        <div
          className="pdf-upload-error"
          role="alert"
        >
          <AlertCircle size={19} />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="pdf-upload-result">
          <div className="pdf-upload-success">
            <FileCheck2 size={22} />

            <div>
              <strong>
                Text extracted successfully
              </strong>
              <p>{result.filename}</p>
            </div>
          </div>

          <div className="pdf-upload-stats">
            <div>
              <strong>
                {result.pages_processed}
                /{result.page_count}
              </strong>
              <span>Pages</span>
            </div>

            <div>
              <strong>
                {result.word_count.toLocaleString()}
              </strong>
              <span>Words</span>
            </div>

            <div>
              <strong>
                {result.character_count.toLocaleString()}
              </strong>
              <span>Characters</span>
            </div>
          </div>

          {result.truncated && (
            <p className="pdf-upload-warning">
              Only the first {result.pages_processed}
              {" "}pages and{" "}
              {result.character_count.toLocaleString()}
              {" "}characters were retained.
            </p>
          )}

          <div className="pdf-upload-preview">
            <h3>
              <FileText size={19} />
              Extracted Text Preview
            </h3>

            <pre>{result.preview}</pre>
          </div>

          <p className="pdf-upload-note">
            Extraction happens in memory.
            The backend does not save your uploaded
            PDF. Keep the original for Lesson 37.
          </p>
        </div>
      )}
    </section>
  );
}
