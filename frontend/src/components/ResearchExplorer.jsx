
import { useEffect, useMemo, useRef, useState } from "react";

import {
  Search,
  BookOpen,
  LoaderCircle,
  AlertCircle,
  RefreshCw,
  Clock3,
  GitCompareArrows,
  MessageSquareText,
  FileDown,
  X,
} from "lucide-react";

import ResearchPaperCard from "./ResearchPaperCard";
import ResearchComparison from "./ResearchComparison";
import PDFUpload from "./PDFUpload";
import "./ResearchComparison.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const STORAGE_KEY = "aegis-research-session";

const suggestedTopics = [
  "Agentic AI",
  "Cybersecurity",
  "Machine Learning",
  "Cloud Computing",
];

// Default research session
const defaultSession = {
  topic: "",
  searchedTopic: "",
  limit: 5,
  sortOrder: "newest",
  papers: [],
  hasSearched: false,
  lastFetched: null,
};

// Restore previously saved research data
function loadResearchSession() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return { ...defaultSession };
    }

    const parsed = JSON.parse(saved);

    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      return { ...defaultSession };
    }

    return {
      topic:
        typeof parsed.topic === "string"
          ? parsed.topic
          : "",

      searchedTopic:
        typeof parsed.searchedTopic === "string"
          ? parsed.searchedTopic
          : typeof parsed.topic === "string"
            ? parsed.topic
            : "",

      limit: [5, 10, 20].includes(parsed.limit)
        ? parsed.limit
        : 5,

      sortOrder: ["newest", "oldest"].includes(
        parsed.sortOrder
      )
        ? parsed.sortOrder
        : "newest",

      papers: Array.isArray(parsed.papers)
        ? parsed.papers
        : [],

      hasSearched: parsed.hasSearched === true,

      lastFetched:
        typeof parsed.lastFetched === "string" &&
        !Number.isNaN(Date.parse(parsed.lastFetched))
          ? parsed.lastFetched
          : null,
    };
  } catch (error) {
    console.error(
      "Failed to load research session:",
      error
    );

    return { ...defaultSession };
  }
}

export default function ResearchExplorer({
  onSearchComplete,
}) {
  // Restore saved research session
  const [research, setResearch] = useState(
    loadResearchSession
  );

  // Temporary interface states
  const [loading, setLoading] = useState(false);
  const [requestType, setRequestType] = useState(null);
  const [error, setError] = useState("");
  const [comparisonIds, setComparisonIds] = useState([]);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState("");
  const [reportData, setReportData] = useState(null);
  const reportController = useRef(null);

  useEffect(() => () => reportController.current?.abort(), []);

  function closeReport() {
    reportController.current?.abort();
    reportController.current = null;
    setReportLoading(false);
    setReportOpen(false);
  }

  async function createReport() {
    if (selectedPapers.length < 2 || selectedPapers.length > 3 || reportLoading) return;
    const missing = selectedPapers.find((paper) => !paper.abstract?.trim());
    if (missing) {
      setError("All selected papers must have abstracts to generate a report.");
      return;
    }
    setReportOpen(true);
    setReportLoading(true);
    setReportError("");
    setReportData(null);
    const controller = new AbortController();
    reportController.current = controller;
    try {
      const response = await fetch(`${API_URL}/api/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          topic: searchedTopic || "Research comparison",
          papers: selectedPapers.map((paper) => ({
            title: paper.title,
            abstract: paper.abstract,
            authors: Array.isArray(paper.authors) ? paper.authors : [],
            year: paper.year ?? null,
            publication: paper.publication ?? null,
            doi: paper.doi ?? null,
            id: paper.id ?? null,
          })),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : `HTTP ${response.status}`);
      if (typeof data.report !== "string" || !data.report.trim()) throw new Error("The model returned an empty report.");
      if (!controller.signal.aborted) setReportData(data);
    } catch (err) {
      if (err.name !== "AbortError" && !controller.signal.aborted) setReportError(err.message || "Could not generate report.");
    } finally {
      if (reportController.current === controller) {
        reportController.current = null;
        setReportLoading(false);
      }
    }
  }

  function downloadReport() {
    if (!reportData?.report) return;
    const sourceAppendix = (reportData.sources || []).flatMap((source) => [
      `### [${source.paper}] ${source.title}`,
      ...(source.links || []).map((link) => `- ${link.label}: ${link.url}`),
      "",
    ]).join("\n");
    const content = `${reportData.report}\n\n## Source Links (OpenAlex metadata)\n\n${sourceAppendix}`;
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "AegisAI-research-report.md";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // Prevent overlapping API requests
  const requestInProgress = useRef(false);

  // Extract research properties
  const {
    topic,
    searchedTopic,
    limit,
    sortOrder,
    papers,
    hasSearched,
    lastFetched,
  } = research;

  // Save research state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(research)
      );
    } catch (error) {
      console.error(
        "Failed to save research session:",
        error
      );
    }
  }, [research]);

  // Safely update research properties
  function updateResearch(changes) {
    setResearch((previous) => ({
      ...previous,
      ...changes,
    }));
  }

  // Only select papers that still exist in the current results.
  const selectedPapers = papers.filter((paper) => comparisonIds.includes(paper.id));

  function discussSelectedPapers() {
    if (selectedPapers.length < 2 || selectedPapers.length > 3) return;
    const eligible = selectedPapers.filter((paper) => typeof paper.abstract === "string" && paper.abstract.trim());
    if (eligible.length !== selectedPapers.length) {
      setError("Each selected paper needs an abstract before you can discuss them with AI.");
      return;
    }
    setError("");
    window.dispatchEvent(new CustomEvent("aegis:ask-paper", {
      detail: {
        papers: selectedPapers.map((paper) => ({
          title: paper.title || "Untitled paper",
          abstract: paper.abstract.trim(),
          authors: Array.isArray(paper.authors) ? paper.authors.filter((a) => typeof a === "string").slice(0, 20) : [],
          year: paper.year ?? null,
          publication: paper.publication || null,
          doi: paper.doi || null,
          id: paper.id || null,
        })),
      },
    }));
  }

  function toggleCompare(paperId) {
    setComparisonIds((previous) => {
      if (previous.includes(paperId)) return previous.filter((id) => id !== paperId);
      return previous.length < 3 ? [...previous, paperId] : previous;
    });
  }

  // Sort papers by publication year
  const sortedPapers = useMemo(() => {
    return [...papers].sort((a, b) => {
      const yearA = a.year ?? 0;
      const yearB = b.year ?? 0;

      return sortOrder === "newest"
        ? yearB - yearA
        : yearA - yearB;
    });
  }, [papers, sortOrder]);

  // Shared API function for searching and refreshing
  async function fetchResearch(
    query,
    requestedLimit,
    type = "search"
  ) {
    if (requestInProgress.current) {
      return null;
    }

    requestInProgress.current = true;

    setLoading(true);
    setRequestType(type);
    setError("");

    try {
      const params = new URLSearchParams({
        topic: query,
        limit: String(requestedLimit),
      });

      const response = await fetch(
        `${API_URL}/api/research?${params}`,
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(
          `Research request failed (HTTP ${response.status})`
        );
      }

      const data = await response.json();

      if (!Array.isArray(data.results)) {
        throw new Error(
          "Invalid research response from API."
        );
      }

      // A new result set invalidates the previous comparison selection.
      setComparisonIds([]);
      setComparisonOpen(false);
      closeReport();

      // Update results only after a successful response
      updateResearch({
        searchedTopic: query,
        papers: data.results,
        hasSearched: true,
        lastFetched: new Date().toISOString(),
      });

      return data.results;
    } catch (err) {
      setError(
        err.message ||
          "Unable to retrieve research papers."
      );

      // Keep previously loaded papers
      return null;
    } finally {
      requestInProgress.current = false;
      setLoading(false);
      setRequestType(null);
    }
  }

  // Search for a new research topic
  async function searchPapers(event) {
    event.preventDefault();

    const query = topic.trim();

    if (!query || requestInProgress.current) {
      return;
    }

    const results = await fetchResearch(
      query,
      limit,
      "search"
    );

    // Add only successful new searches to history
    if (results !== null) {
      onSearchComplete?.({
        topic: query,
        count: results.length,
      });
    }
  }

  // Refresh existing research results
  async function refreshPapers() {
    if (
      !searchedTopic ||
      requestInProgress.current
    ) {
      return;
    }

    await fetchResearch(
      searchedTopic,
      limit,
      "refresh"
    );
  }

  // Format the last-updated timestamp
  function formatLastFetched(value) {
    if (!value) {
      return "Saved results — refresh to update";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Update time unavailable";
    }

    return `Last updated: ${date.toLocaleString()}`;
  }

  return (
    <section className="research-explorer">

      {/* Page heading */}
      <div className="page-heading">
        <h1>Research Explorer</h1>

        <p>
          Discover academic knowledge from OpenAlex.
        </p>
      </div>

      <PDFUpload />

      {/* Search form */}
      <form
        className="research-search"
        onSubmit={searchPapers}
      >
        <div className="research-input-wrap">
          <Search size={20} />

          <input
            value={topic}
            onChange={(event) =>
              updateResearch({
                topic: event.target.value,
              })
            }
            placeholder="Search academic topics..."
            aria-label="Research topic"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !topic.trim()}
        >
          {loading && requestType === "search" ? (
            <LoaderCircle
              className="spin"
              size={20}
            />
          ) : (
            <Search size={18} />
          )}

          {loading && requestType === "search"
            ? "Searching..."
            : "Search"}
        </button>
      </form>

      {/* Suggested research topics */}
      <div className="suggestions">
        <span>Try searching:</span>

        {suggestedTopics.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() =>
              updateResearch({
                topic: suggestion,
              })
            }
          >
            {suggestion}
          </button>
        ))}
      </div>

      {/* Research controls */}
      <div className="research-controls">
        <label>
          Results

          <select
            value={limit}
            disabled={loading}
            onChange={(event) =>
              updateResearch({
                limit: Number(event.target.value),
              })
            }
          >
            <option value={5}>5 papers</option>
            <option value={10}>10 papers</option>
            <option value={20}>20 papers</option>
          </select>
        </label>

        <label>
          Sort by

          <select
            value={sortOrder}
            onChange={(event) =>
              updateResearch({
                sortOrder: event.target.value,
              })
            }
          >
            <option value="newest">
              Newest first
            </option>

            <option value="oldest">
              Oldest first
            </option>
          </select>
        </label>
      </div>

      {/* Refresh toolbar */}
      {hasSearched && (
        <div className="research-refresh-toolbar">
          <div className="research-refresh-info">
            <strong>
              Results for "{searchedTopic}"
            </strong>

            <span>
              <Clock3 size={15} />
              {formatLastFetched(lastFetched)}
            </span>
          </div>

          <button
            type="button"
            className="research-refresh-button"
            onClick={refreshPapers}
            disabled={loading || !searchedTopic}
          >
            <RefreshCw
              size={17}
              className={
                loading && requestType === "refresh"
                  ? "refresh-spinning"
                  : ""
              }
            />

            {loading && requestType === "refresh"
              ? "Refreshing..."
              : "Refresh results"}
          </button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div
          className="research-error"
          role="alert"
        >
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Initial loading state */}
      {loading && papers.length === 0 && (
        <div className="research-empty">
          <LoaderCircle
            className="spin"
            size={32}
          />

          <h3>
            Searching academic publications...
          </h3>

          <p>
            Retrieving research papers from OpenAlex.
          </p>
        </div>
      )}

      {/* Results count */}
      {hasSearched && (
        <p className="research-count">
          {papers.length} papers found
          {searchedTopic &&
            ` for "${searchedTopic}"`}
        </p>
      )}

      {/* Paper comparison toolbar */}
      {papers.length > 0 && (
        <div className="aegis-compare-toolbar">
          <div className="aegis-compare-toolbar-label">
            <GitCompareArrows size={18} />
            <span><strong>Compare papers</strong><small>{selectedPapers.length} of 3 selected · Choose 2 or 3 papers</small></span>
          </div>
          <div className="aegis-compare-toolbar-actions">
            {selectedPapers.length > 0 && (
              <button type="button" className="aegis-compare-clear" onClick={() => setComparisonIds([])}>
                <X size={15} /> Clear
              </button>
            )}
            <button type="button" className="aegis-compare-launch" disabled={selectedPapers.length < 2 || reportLoading} onClick={createReport}>
              <FileDown size={17} /> Generate Report
            </button>
            <button type="button" className="aegis-compare-launch" disabled={selectedPapers.length < 2} onClick={discussSelectedPapers}>
              <MessageSquareText size={17} /> Discuss with AI
            </button>
            <button type="button" className="aegis-compare-launch" disabled={selectedPapers.length < 2} onClick={() => setComparisonOpen(true)}>
              <GitCompareArrows size={17} /> Compare {selectedPapers.length > 0 ? `(${selectedPapers.length})` : ""}
            </button>
          </div>
        </div>
      )}

      {/* Display existing results even while refreshing */}
      {papers.length > 0 && (
        <div
          className="research-results"
          aria-busy={loading}
        >
          {sortedPapers.map((paper, index) => (
            <ResearchPaperCard
              key={paper.id}
              paper={paper}
              index={index}
              comparisonSelected={comparisonIds.includes(paper.id)}
              onToggleCompare={toggleCompare}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading &&
        papers.length === 0 && (
          <div className="research-empty">
            <BookOpen size={36} />

            <h3>
              {hasSearched
                ? "No papers found"
                : "Your next discovery starts here"}
            </h3>

            <p>
              {hasSearched
                ? "Try a different research topic."
                : "Search for a topic to explore academic publications."}
            </p>
          </div>
        )}

      {reportOpen && (
        <div role="presentation" style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,.65)", display: "grid", placeItems: "center", padding: 16 }} onMouseDown={(event) => { if (event.target === event.currentTarget) closeReport(); }}>
          <section role="dialog" aria-modal="true" aria-label="Research report" style={{ background: "var(--card-bg, #182132)", color: "var(--text-primary, #fff)", border: "1px solid #64748b", borderRadius: 16, padding: 22, width: "min(850px, 100%)", maxHeight: "85dvh", display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <h2 style={{ margin: 0 }}>Research Report</h2>
              <button type="button" onClick={closeReport} aria-label="Close report"><X size={20} /></button>
            </div>
            <p style={{ margin: 0 }}>Generated from {selectedPapers.length} selected abstracts — verify claims against original papers before citing.</p>
            {reportLoading && <p role="status"><LoaderCircle size={16} className="spin" /> Generating with Qwen…</p>}
            {reportError && <p role="alert" style={{ color: "#fca5a5" }}>{reportError}</p>}
            {reportData && (
              <>
                <pre style={{ whiteSpace: "pre-wrap", overflowY: "auto", flex: 1, minHeight: 120, fontFamily: "inherit", lineHeight: 1.6, margin: 0 }}>{reportData.report}</pre>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                  <button type="button" onClick={downloadReport}><FileDown size={16} /> Download Markdown</button>
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {comparisonOpen && selectedPapers.length >= 2 && (
        <ResearchComparison papers={selectedPapers} onClose={() => setComparisonOpen(false)} />
      )}
    </section>
  );
}
