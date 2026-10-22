import { useEffect, useRef, useState } from "react";
import {
  Bookmark, BookmarkCheck, ArrowUpRight, ChevronDown, ChevronUp,
  Quote, BookOpen, X, FolderPlus, FileText, CalendarDays, Users,
  ExternalLink, Info, NotebookPen, Trash2, Pencil, Save, GitCompareArrows, Sparkles, RefreshCw, AlertCircle, MessageSquareText,
} from "lucide-react";
import { motion } from "motion/react";
import { createPortal } from "react-dom";
import { useBookmarks } from "../context/BookmarksContext";
import { useCollections } from "../context/CollectionsContext";
import { useResearchNotes } from "../context/ResearchNotesContext";
import "./ResearchNotes.css";
import "./ResearchPaperDetails.css";
import "./ResearchSummary.css";

function safeHttpUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function getDoiUrl(paper) {
  const raw = paper.doi;
  if (typeof raw !== "string" || !raw.trim()) return null;
  const value = raw.trim();
  if (value.toLowerCase().startsWith("doi:")) {
    return safeHttpUrl(`https://doi.org/${value.slice(4).trim()}`);
  }
  if (/^10\.\d{4,9}\//.test(value)) {
    return safeHttpUrl(`https://doi.org/${value}`);
  }
  const url = safeHttpUrl(value);
  return url && new URL(url).hostname.toLowerCase() === "doi.org" ? url : null;
}

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function PaperDetails({ paper, saved, onSave, onClose }) {
  const closeRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const { getNote, saveNote, deleteNote, storageError } = useResearchNotes();
  const note = getNote(paper.id);
  const [confirmDeleteNote, setConfirmDeleteNote] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [summary, setSummary] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const summaryControllerRef = useRef(null);

  async function generateSummary() {
    if (!abstract || summaryLoading) return;
    const controller = new AbortController();
    summaryControllerRef.current = controller;
    setSummaryLoading(true);
    setSummaryError("");
    try {
      const response = await fetch(`${API_URL}/api/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          title: paper.title || "Untitled paper",
          abstract,
          authors,
          year: paper.year ?? null,
          publication: paper.publication || null,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = data.detail;
        throw new Error(typeof detail === "string" ? detail : `Summary request failed (${response.status}).`);
      }
      if (typeof data.summary !== "string" || !data.summary.trim()) {
        throw new Error("The server returned an empty summary.");
      }
      if (!controller.signal.aborted) setSummary(data.summary.trim());
    } catch (error) {
      if (error.name !== "AbortError" && !controller.signal.aborted) {
        setSummaryError(error.message || "Unable to generate a summary. Check that FastAPI and Ollama are running.");
      }
    } finally {
      if (summaryControllerRef.current === controller) {
        summaryControllerRef.current = null;
        setSummaryLoading(false);
      }
    }
  }

  function beginNoteEdit() {
    setNoteDraft(note);
    setEditingNote(true);
    setConfirmDeleteNote(false);
  }

  function commitNote() {
    if (noteDraft.trim()) saveNote(paper.id, noteDraft.trim());
    else deleteNote(paper.id);
    setEditingNote(false);
  }
  const publicationUrl = safeHttpUrl(paper.id);
  const doiUrl = getDoiUrl(paper);
  const authors = Array.isArray(paper.authors) ? paper.authors.filter((name) => typeof name === "string" && name.trim()) : [];
  const abstract = typeof paper.abstract === "string" ? paper.abstract.trim() : "";

  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") onCloseRef.current();
      if (event.key !== "Tab") return;
      const dialog = closeRef.current?.closest('[role="dialog"]');
      const focusable = dialog?.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled])');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      summaryControllerRef.current?.abort();
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, []);

  return createPortal(
    <div className="paper-details-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="paper-details-dialog" role="dialog" aria-modal="true" aria-labelledby="paper-details-title">
        <header className="paper-details-header">
          <span className="paper-details-eyebrow"><FileText size={16} /> RESEARCH PAPER DETAILS</span>
          <button ref={closeRef} type="button" className="paper-details-icon-button" onClick={onClose} aria-label="Close paper details"><X size={20} /></button>
        </header>

        <div className="paper-details-content">
          <h2 id="paper-details-title">{paper.title || "Untitled paper"}</h2>
          <div className="paper-details-facts">
            <span><CalendarDays size={16} /> {paper.year ?? "Year unavailable"}</span>
            <span><Quote size={16} /> {paper.citation_count ?? 0} citations</span>
            <span><BookOpen size={16} /> {paper.publication || "Source unavailable"}</span>
          </div>

          <div className="paper-details-section">
            <h3><Users size={18} /> Authors</h3>
            <p>{authors.length ? authors.join(", ") : "Author information is not available."}</p>
          </div>

          <div className="paper-details-section">
            <h3><FileText size={18} /> Abstract</h3>
            {abstract ? <p className="paper-details-abstract">{abstract}</p> : (
              <p className="paper-details-unavailable"><Info size={16} /> An abstract was not provided for this paper.</p>
            )}
          </div>

          <div className="paper-details-section aegis-summary-section">
            <div className="aegis-summary-heading">
              <h3><Sparkles size={18} /> AI Research Summary</h3>
              <span className="aegis-summary-label">Qwen · Abstract-based</span>
            </div>
            <p className="aegis-summary-description">
              Summarizes the available abstract, not the full paper. Verify important claims against the publication.
            </p>
            {!abstract ? (
              <p className="aegis-summary-notice"><Info size={16} /> A summary cannot be generated because this paper has no abstract.</p>
            ) : (
              <>
                {summary && <div className="aegis-summary-result" aria-label="AI-generated paper summary">{summary}</div>}
                {summaryError && <p className="aegis-summary-error" role="alert"><AlertCircle size={16} /> {summaryError}</p>}
                {summaryLoading && <p className="aegis-summary-loading" role="status"><RefreshCw size={16} className="aegis-summary-spinner" /> Qwen is analyzing the abstract. This may take a moment...</p>}
                <button type="button" className="aegis-summary-button" onClick={generateSummary} disabled={summaryLoading}>
                  {summary ? <RefreshCw size={16} /> : <Sparkles size={16} />}
                  {summaryLoading ? "Generating summary..." : summary ? "Regenerate summary" : "Generate AI Summary"}
                </button>
              </>
            )}
          </div>

          <div className="paper-details-section aegis-paper-chat-section">
            <h3><MessageSquareText size={18} /> Discuss this paper</h3>
            <p className="aegis-summary-description">Ask Qwen questions grounded in the available abstract and metadata.</p>
            <button type="button" className="aegis-summary-button" onClick={() => {
              window.dispatchEvent(new CustomEvent("aegis:ask-paper", { detail: {
                title: paper.title || "Untitled paper", abstract,
                authors, year: paper.year ?? null,
                publication: paper.publication || null,
              } }));
              onClose();
            }}>
              <MessageSquareText size={16} /> Ask AegisAI about this paper
            </button>
          </div>

          <div className="paper-details-section paper-notes-section">
            <div className="paper-notes-heading">
              <h3><NotebookPen size={18} /> My Research Notes</h3>
              <span className="paper-notes-status" role="status">
                {storageError ? "Browser storage failed" : editingNote ? "Unsaved changes" : "Stored in this browser"}
              </span>
            </div>
            {editingNote ? (
              <div className="paper-notes-edit-mode">
                <label className="paper-notes-label" htmlFor="aegis-paper-notes">Your research note</label>
                <textarea
                  id="aegis-paper-notes"
                  className="paper-notes-editor"
                  value={noteDraft}
                  onChange={(event) => setNoteDraft(event.target.value)}
                  placeholder="Write key findings, questions, or ideas..."
                  rows={6}
                  maxLength={20000}
                />
                <div className="paper-notes-bottom">
                  <span>{noteDraft.length.toLocaleString()} / 20,000 characters</span>
                  <div className="paper-notes-actions">
                    <button type="button" className="paper-notes-secondary" onClick={() => setEditingNote(false)}>Cancel</button>
                    <button type="button" className="paper-notes-primary" onClick={commitNote} disabled={!noteDraft.trim()}><Save size={15} /> Save note</button>
                  </div>
                </div>
              </div>
            ) : note.trim() ? (
              <>
                <div className="paper-notes-read-view">{note}</div>
                <div className="paper-notes-bottom">
                  <span>{note.length.toLocaleString()} characters</span>
                  <div className="paper-notes-actions">
                    <button type="button" className="paper-notes-secondary" onClick={beginNoteEdit}><Pencil size={15} /> Edit</button>
                    <button type="button" className="paper-notes-delete" onClick={() => setConfirmDeleteNote(true)}><Trash2 size={15} /> Delete</button>
                  </div>
                </div>
              </>
            ) : (
              <div className="paper-notes-empty">
                <p>No notes for this paper yet. Keep important findings and questions in one place.</p>
                <button type="button" className="paper-notes-primary" onClick={beginNoteEdit}><NotebookPen size={15} /> Add a note</button>
              </div>
            )}
            {confirmDeleteNote && !editingNote && (
              <div className="paper-notes-confirm" role="group" aria-label="Confirm note deletion">
                <span>Delete this paper's note permanently?</span>
                <button type="button" onClick={() => setConfirmDeleteNote(false)}>Cancel</button>
                <button type="button" onClick={() => { deleteNote(paper.id); setConfirmDeleteNote(false); }}>Delete note</button>
              </div>
            )}
          </div>

          <div className="paper-details-section">
            <h3><ExternalLink size={18} /> Publication links</h3>
            <div className="paper-details-links">
              {doiUrl && <a href={doiUrl} target="_blank" rel="noopener noreferrer">Open DOI <ArrowUpRight size={16} /></a>}
              {publicationUrl && <a href={publicationUrl} target="_blank" rel="noopener noreferrer">Open publication <ArrowUpRight size={16} /></a>}
              {!doiUrl && !publicationUrl && <p>Publication links are unavailable.</p>}
            </div>
          </div>
        </div>

        <footer className="paper-details-footer">
          <button type="button" className={`compact-save-button ${saved ? "is-saved" : ""}`} onClick={onSave}>
            {saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
            {saved ? "Saved — remove bookmark" : "Save paper"}
          </button>
          <button type="button" className="paper-details-done" onClick={onClose}>Close</button>
        </footer>
      </section>
    </div>,
    document.body
  );
}

export default function ResearchPaperCard({ paper, index = 0, comparisonSelected = false, onToggleCompare }) {
  const [expanded, setExpanded] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [showCollections, setShowCollections] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const { toggleBookmark, isBookmarked } = useBookmarks();
  const { collections, addPaperToCollection, removePaperFromCollection } = useCollections();
  const saved = isBookmarked(paper.id);
  const authors = Array.isArray(paper.authors) ? paper.authors : [];
  const authorText = authors.length > 0
    ? authors.slice(0, 3).join(", ") + (authors.length > 3 ? " et al." : "")
    : "Authors unavailable";
  const abstract = typeof paper.abstract === "string" ? paper.abstract.trim() : "";
  const needsExpansion = abstract.length > 220;
  const publicationUrl = safeHttpUrl(paper.id);

  function handleBookmarkClick() {
    if (saved) setConfirmRemove(true);
    else toggleBookmark(paper);
  }

  function confirmRemoval() {
    toggleBookmark(paper);
    setConfirmRemove(false);
  }

  function closeDetails() { setShowDetails(false); }

  return (
    <motion.article
      className="research-paper compact-paper"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.25) }}
    >
      <div className="compact-paper-top">
        <span className="compact-paper-type"><BookOpen size={14} /> Research paper</span>
        <span className="compact-paper-year">{paper.year ?? "Year unknown"}</span>
      </div>
      <h3 className="compact-paper-title">{paper.title || "Untitled paper"}</h3>
      <p className="compact-paper-authors">{authorText}</p>
      <div className="compact-paper-metadata">
        <span><Quote size={14} /> {paper.citation_count ?? 0} citations</span>
        <span><BookOpen size={14} /> {paper.publication || "Unknown source"}</span>
      </div>
      {abstract && (
        <div className="compact-paper-abstract">
          <p className={needsExpansion && !expanded ? "compact-abstract-clamped" : ""}>{abstract}</p>
          {needsExpansion && (
            <button type="button" className="compact-abstract-button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>
              {expanded ? "Show less" : "Read abstract"}
              {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
          )}
        </div>
      )}
      {typeof onToggleCompare === "function" && (
        <label className="aegis-compare-selector">
          <input
            type="checkbox"
            checked={comparisonSelected}
            onChange={() => onToggleCompare(paper.id)}
            aria-label={`Select ${paper.title || "Untitled paper"} for comparison`}
          />
          <GitCompareArrows size={16} />
          {comparisonSelected ? "Selected for comparison" : "Select to compare"}
        </label>
      )}

      <div className="compact-paper-actions">
        <button type="button" className="paper-details-open-button" onClick={() => setShowDetails(true)}>
          <FileText size={16} /> View Details
        </button>
        <button type="button" className={`compact-save-button ${saved ? "is-saved" : ""}`} onClick={handleBookmarkClick}>
          {saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
          {saved ? "Saved" : "Save paper"}
        </button>
        {saved && (
          <button type="button" className="compact-collection-button" onClick={() => setShowCollections(!showCollections)} aria-expanded={showCollections}>
            <FolderPlus size={16} /> Add to Collection
          </button>
        )}
        {publicationUrl && (
          <a className="compact-publication-link" href={publicationUrl} target="_blank" rel="noopener noreferrer">
            View publication <ArrowUpRight size={16} />
          </a>
        )}
      </div>

      {showDetails && (
        <PaperDetails paper={paper} saved={saved} onSave={handleBookmarkClick} onClose={closeDetails} />
      )}

      {saved && showCollections && (
        <div className="collection-modal-overlay" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setShowCollections(false);
        }}>
          <div className="collection-modal" role="dialog" aria-modal="true" aria-labelledby="collection-modal-title">
            <div className="collection-modal-header">
              <h2 id="collection-modal-title">Add to Collection</h2>
              <button type="button" className="collection-modal-close" onClick={() => setShowCollections(false)} aria-label="Close dialog"><X size={20} /></button>
            </div>
            <p className="collection-modal-description">Choose which collections should contain this research paper.</p>
            {collections.length === 0 ? (
              <div className="collection-modal-empty">
                <FolderPlus size={24} />
                <p>You don't have any collections yet. Create one from the Collections page.</p>
              </div>
            ) : (
              <div className="collection-modal-list">
                {collections.map((collection) => {
                  const included = collection.paperIds.includes(paper.id);
                  return (
                    <label key={collection.id} className="collection-modal-option">
                      <input type="checkbox" checked={included} onChange={(event) => {
                        if (event.target.checked) addPaperToCollection(collection.id, paper.id);
                        else removePaperFromCollection(collection.id, paper.id);
                      }} />
                      <FolderPlus size={18} /><span>{collection.name}</span>
                    </label>
                  );
                })}
              </div>
            )}
            <div className="collection-modal-footer">
              <button type="button" className="collection-modal-done" onClick={() => setShowCollections(false)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {confirmRemove && (
        <div className="compact-confirm-overlay" onClick={() => setConfirmRemove(false)}>
          <div className="compact-confirm-dialog" role="alertdialog" aria-modal="true"
            aria-labelledby={`remove-title-${paper.id}`} aria-describedby={`remove-desc-${paper.id}`}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => { if (event.key === "Escape") setConfirmRemove(false); }}>
            <div className="compact-confirm-heading">
              <h3 id={`remove-title-${paper.id}`}>Remove saved paper?</h3>
              <button type="button" className="compact-confirm-close" onClick={() => setConfirmRemove(false)} aria-label="Close confirmation"><X size={18} /></button>
            </div>
            <p id={`remove-desc-${paper.id}`}>This paper will be removed from your saved library. You can save it again later.</p>
            <div className="compact-confirm-actions">
              <button type="button" className="compact-cancel-button" onClick={() => setConfirmRemove(false)}>Cancel</button>
              <button type="button" className="compact-remove-button" onClick={confirmRemoval}>Remove paper</button>
            </div>
          </div>
        </div>
      )}
    </motion.article>
  );
}
