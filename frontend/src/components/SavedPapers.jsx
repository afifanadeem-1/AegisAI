
import { useMemo, useState } from "react";

import {
  Bookmark,
  Search,
  SlidersHorizontal,
  X,
  Download,
} from "lucide-react";

import { useBookmarks } from "../context/BookmarksContext";
import ResearchPaperCard from "./ResearchPaperCard";

import {
  exportPapersCSV,
  exportPapersBibTeX,
} from "../utils/exportPapers";

export default function SavedPapers() {
  const { bookmarks } = useBookmarks();

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");
  const [selectedYear, setSelectedYear] = useState("all");

  // Extract available publication years
  const availableYears = useMemo(() => {
    const years = bookmarks
      .map((paper) => paper.year)
      .filter(
        (year) =>
          Number.isInteger(year) && year > 0
      );

    return [...new Set(years)].sort(
      (a, b) => b - a
    );
  }, [bookmarks]);

  // Search, filter and sort saved papers
  const filteredPapers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    let results = bookmarks.filter((paper) => {
      const title = paper.title || "";
      const publication = paper.publication || "";

      const authors = Array.isArray(paper.authors)
        ? paper.authors
            .map((author) =>
              typeof author === "string"
                ? author
                : author?.name ||
                  author?.display_name ||
                  ""
            )
            .join(" ")
        : "";

      const searchableText = [
        title,
        publication,
        authors,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        searchableText.includes(query);

      const matchesYear =
        selectedYear === "all" ||
        String(paper.year) === selectedYear;

      return matchesSearch && matchesYear;
    });

    // Sort without modifying original bookmarks
    results = [...results].sort((a, b) => {
      if (sortOrder === "oldest") {
        return (a.year ?? 0) - (b.year ?? 0);
      }

      if (sortOrder === "most-cited") {
        return (
          (b.citation_count ?? 0) -
          (a.citation_count ?? 0)
        );
      }

      if (sortOrder === "least-cited") {
        return (
          (a.citation_count ?? 0) -
          (b.citation_count ?? 0)
        );
      }

      // Default: newest first
      return (b.year ?? 0) - (a.year ?? 0);
    });

    return results;
  }, [
    bookmarks,
    searchQuery,
    sortOrder,
    selectedYear,
  ]);

  // Check whether any filters are active
  const filtersActive =
    searchQuery.trim() !== "" ||
    selectedYear !== "all" ||
    sortOrder !== "newest";

  // Reset all filters
  function clearFilters() {
    setSearchQuery("");
    setSelectedYear("all");
    setSortOrder("newest");
  }

  // Export all saved papers as CSV
  function handleExportCSV() {
    if (bookmarks.length === 0) return;

    exportPapersCSV(bookmarks);
  }

  // Export all saved papers as BibTeX
  function handleExportBibTeX() {
    if (bookmarks.length === 0) return;

    exportPapersBibTeX(bookmarks);
  }

  return (
    <section className="saved-papers">

      {/* Page heading */}
      <div className="page-heading">
        <h1>Saved Papers</h1>

        <p>
          Search, filter, organize, and export your
          research library.
        </p>
      </div>

      {/* Library count */}
      <p className="research-count">
        {bookmarks.length}{" "}
        {bookmarks.length === 1
          ? "saved paper"
          : "saved papers"}
      </p>

      {/* Export actions */}
      <div className="library-export-actions">

        <button
          type="button"
          className="library-export-button"
          onClick={handleExportCSV}
          disabled={bookmarks.length === 0}
          title="Export all saved papers to CSV"
        >
          <Download size={17} />
          Export CSV
        </button>

        <button
          type="button"
          className="library-export-button secondary"
          onClick={handleExportBibTeX}
          disabled={bookmarks.length === 0}
          title="Export all saved papers to BibTeX"
        >
          <Download size={17} />
          Export BibTeX
        </button>

      </div>

      {/* Search and filters */}
      {bookmarks.length > 0 && (
        <div className="library-toolbar">

          {/* Search input */}
          <div className="library-search">
            <Search size={18} />

            <input
              type="search"
              value={searchQuery}
              onChange={(event) =>
                setSearchQuery(event.target.value)
              }
              placeholder="Search saved papers..."
              aria-label="Search saved papers"
            />
          </div>

          {/* Sort and year filters */}
          <div className="library-filter-row">

            <div className="library-filter">
              <SlidersHorizontal size={16} />

              <select
                value={sortOrder}
                onChange={(event) =>
                  setSortOrder(event.target.value)
                }
                aria-label="Sort saved papers"
              >
                <option value="newest">
                  Newest first
                </option>

                <option value="oldest">
                  Oldest first
                </option>

                <option value="most-cited">
                  Most cited
                </option>

                <option value="least-cited">
                  Least cited
                </option>
              </select>
            </div>

            <div className="library-filter">
              <select
                value={selectedYear}
                onChange={(event) =>
                  setSelectedYear(event.target.value)
                }
                aria-label="Filter by publication year"
              >
                <option value="all">
                  All years
                </option>

                {availableYears.map((year) => (
                  <option
                    key={year}
                    value={String(year)}
                  >
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear active filters */}
            {filtersActive && (
              <button
                type="button"
                className="library-clear"
                onClick={clearFilters}
              >
                <X size={15} />
                Clear filters
              </button>
            )}

          </div>
        </div>
      )}

      {/* Empty library */}
      {bookmarks.length === 0 ? (
        <div className="research-empty">
          <Bookmark size={36} />

          <h3>Your library is empty</h3>

          <p>
            Save papers from Research Explorer
            to see them here.
          </p>
        </div>

      ) : filteredPapers.length === 0 ? (
        /* No papers match current filters */
        <div className="research-empty">
          <Search size={36} />

          <h3>No matching papers</h3>

          <p>
            Try changing your search or filters.
          </p>

          <button
            type="button"
            className="library-clear"
            onClick={clearFilters}
          >
            Clear filters
          </button>
        </div>

      ) : (
        /* Display saved research papers */
        <>
          <p className="research-count">
            Showing {filteredPapers.length} of{" "}
            {bookmarks.length} saved papers
          </p>

          <div className="research-results">
            {filteredPapers.map((paper, index) => (
              <ResearchPaperCard
                key={paper.id}
                paper={paper}
                index={index}
              />
            ))}
          </div>
        </>
      )}

    </section>
  );
}
