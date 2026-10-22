
function escapeCSV(value) {
  const text = String(value ?? "");

  // Prevent spreadsheet formula injection.
  const safeText = /^[\s]*[=+\-@\t\r]/.test(text)
    ? `'${text}`
    : text;

  return `"${safeText.replace(/"/g, '""')}"`;
}

function getAuthors(paper) {
  if (!Array.isArray(paper.authors)) {
    return "";
  }

  return paper.authors
    .map((author) =>
      typeof author === "string"
        ? author
        : author?.name || author?.display_name || ""
    )
    .filter(Boolean)
    .join(", ");
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], {
    type: mimeType,
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

export function exportPapersCSV(papers) {
  if (!papers.length) return;

  const headers = [
    "Title",
    "Authors",
    "Year",
    "Publication",
    "Citations",
    "OpenAlex URL",
  ];

  const rows = papers.map((paper) => [
    paper.title || "",
    getAuthors(paper),
    paper.year ?? "",
    paper.publication || "",
    paper.citation_count ?? 0,
    paper.id || "",
  ]);

  const csv = [
    headers.map(escapeCSV).join(","),
    ...rows.map((row) =>
      row.map(escapeCSV).join(",")
    ),
  ].join("\r\n");

  downloadFile(
    "\uFEFF" + csv,
    "aegisai-saved-papers.csv",
    "text/csv;charset=utf-8"
  );
}

function escapeBibTeX(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/[{}]/g, "")
    .replace(/%/g, "\\%")
    .replace(/&/g, "\\&")
    .replace(/#/g, "\\#")
    .replace(/_/g, "\\_")
    .replace(/\$/g, "\\$")
    .replace(/\^/g, "\\^{}")
    .replace(/~/g, "\\~{}");
}

export function exportPapersBibTeX(papers) {
  if (!papers.length) return;

  const entries = papers.map((paper, index) => {
    const key = `aegisai${paper.year || "unknown"}_${index + 1}`;

    const fields = [
      `  title = {${escapeBibTeX(paper.title)}}`,
      `  author = {${escapeBibTeX(
        getAuthors(paper).replace(/, /g, " and ")
      )}}`,
      `  year = {${escapeBibTeX(paper.year)}}`,
      `  journal = {${escapeBibTeX(paper.publication)}}`,
      `  url = {${escapeBibTeX(paper.id)}}`,
    ];

    return `@article{${key},\n${fields.join(",\n")}\n}`;
  });

  downloadFile(
    entries.join("\n\n"),
    "aegisai-saved-papers.bib",
    "application/x-bibtex;charset=utf-8"
  );
}
