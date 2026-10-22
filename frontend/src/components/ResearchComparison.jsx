import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, GitCompareArrows, X } from "lucide-react";

function safeUrl(value) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

function doiUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const doi = value.trim().replace(/^doi:/i, "");
  if (/^10\.\d{4,9}\//.test(doi)) return safeUrl(`https://doi.org/${doi}`);
  const url = safeUrl(doi);
  return url && new URL(url).hostname.toLowerCase() === "doi.org" ? url : null;
}

export default function ResearchComparison({ papers, onClose }) {
  const closeButton = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    function onKey(event) {
      if (event.key === "Escape") onCloseRef.current();
      if (event.key !== "Tab") return;
      const dialog = closeButton.current?.closest('[role="dialog"]');
      const focusable = [...(dialog?.querySelectorAll('button:not([disabled]), a[href]') || [])];
      if (!focusable.length) return;
      if (event.shiftKey && document.activeElement === focusable[0]) {
        event.preventDefault(); focusable[focusable.length - 1].focus();
      } else if (!event.shiftKey && document.activeElement === focusable[focusable.length - 1]) {
        event.preventDefault(); focusable[0].focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, []);

  const rows = [
    { label: "Authors", render: (p) => Array.isArray(p.authors) && p.authors.length ? p.authors.join(", ") : "Unavailable" },
    { label: "Year", render: (p) => p.year ?? "Unavailable" },
    { label: "Citations", render: (p) => p.citation_count ?? "Unavailable" },
    { label: "Publication", render: (p) => p.publication || "Unavailable" },
    { label: "Abstract", render: (p) => p.abstract?.trim() || "Abstract unavailable" },
    { label: "Links", render: (p) => {
      const publication = safeUrl(p.id);
      const doi = doiUrl(p.doi);
      return <div className="aegis-compare-links">
        {doi && <a href={doi} target="_blank" rel="noopener noreferrer">DOI <ArrowUpRight size={14} /></a>}
        {publication && <a href={publication} target="_blank" rel="noopener noreferrer">Publication <ArrowUpRight size={14} /></a>}
        {!doi && !publication && "Unavailable"}
      </div>;
    } },
  ];

  return createPortal(
    <div className="aegis-compare-overlay" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="aegis-compare-dialog" role="dialog" aria-modal="true" aria-labelledby="aegis-compare-title">
        <header className="aegis-compare-header">
          <div><span className="aegis-compare-eyebrow"><GitCompareArrows size={16} /> RESEARCH COMPARISON</span>
            <h2 id="aegis-compare-title">Compare {papers.length} papers</h2>
            <p>Compare publication metadata and abstracts side by side.</p>
          </div>
          <button ref={closeButton} type="button" className="aegis-compare-close" onClick={onClose} aria-label="Close comparison"><X size={20} /></button>
        </header>
        <div className="aegis-compare-scroll" tabIndex={0} aria-label="Scrollable comparison table">
          <table className="aegis-compare-table">
            <thead><tr><th scope="col">Attribute</th>{papers.map((p) => <th scope="col" key={p.id}>{p.title || "Untitled paper"}</th>)}</tr></thead>
            <tbody>{rows.map((row) => <tr key={row.label}><th scope="row">{row.label}</th>{papers.map((p) => <td key={p.id}>{row.render(p)}</td>)}</tr>)}</tbody>
          </table>
        </div>
        <footer className="aegis-compare-footer"><span>Information is taken from the retrieved paper records.</span><button type="button" onClick={onClose}>Done</button></footer>
      </section>
    </div>, document.body
  );
}
