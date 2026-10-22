
import { useState } from "react";

import {
  Folder,
  FolderPlus,
  Trash2,
  AlertCircle,
  Pencil,
  ArrowLeft,
  X,
} from "lucide-react";

import { useCollections } from "../context/CollectionsContext";
import { useBookmarks } from "../context/BookmarksContext";
import ResearchPaperCard from "./ResearchPaperCard";

export default function ResearchCollections() {
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");

  const [selectedId, setSelectedId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const [renameId, setRenameId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState("");

  const [removePaperId, setRemovePaperId] = useState(null);

  const {
    collections,
    createCollection,
    renameCollection,
    deleteCollection,
    removePaperFromCollection,
  } = useCollections();

  const { bookmarks } = useBookmarks();

  const selectedCollection = collections.find(
    (collection) => collection.id === selectedId
  );

  const collectionPapers = selectedCollection
    ? bookmarks.filter((paper) =>
        selectedCollection.paperIds.includes(paper.id)
      )
    : [];

  const collectionToRename = collections.find(
    (collection) => collection.id === renameId
  );

  const collectionToDelete = collections.find(
    (collection) => collection.id === deleteId
  );

  const paperToRemove = bookmarks.find(
    (paper) => paper.id === removePaperId
  );

  // Create collection
  function handleCreate(event) {
    event.preventDefault();

    const collectionName = name.trim();

    if (!collectionName) {
      setNameError(
        "Please enter a collection name first."
      );
      return;
    }

    const duplicateExists = collections.some(
      (collection) =>
        collection.name.trim().toLowerCase() ===
        collectionName.toLowerCase()
    );

    if (duplicateExists) {
      setNameError(
        `A collection named "${collectionName}" already exists. Please choose a different name.`
      );
      return;
    }

    createCollection(collectionName);

    setName("");
    setNameError("");
  }

  // Open rename dialog
  function openRenameDialog(collection) {
    setRenameId(collection.id);
    setRenameValue(collection.name);
    setRenameError("");
  }

  // Close rename dialog
  function closeRenameDialog() {
    setRenameId(null);
    setRenameValue("");
    setRenameError("");
  }

  // Save renamed collection
  function handleRename(event) {
    event.preventDefault();

    if (!collectionToRename) return;

    const newName = renameValue.trim();

    if (!newName) {
      setRenameError(
        "Collection name cannot be empty."
      );
      return;
    }

    const duplicateExists = collections.some(
      (collection) =>
        collection.id !== renameId &&
        collection.name.trim().toLowerCase() ===
          newName.toLowerCase()
    );

    if (duplicateExists) {
      setRenameError(
        "Another collection already uses this name."
      );
      return;
    }

    renameCollection(renameId, newName);
    closeRenameDialog();
  }

  // Delete selected collection
  function handleDelete() {
    if (!deleteId) return;

    deleteCollection(deleteId);

    if (selectedId === deleteId) {
      setSelectedId(null);
    }

    setDeleteId(null);
  }

  // Remove a paper from the current collection
  function handleRemovePaper() {
    if (!selectedCollection || !removePaperId) return;

    removePaperFromCollection(
      selectedCollection.id,
      removePaperId
    );

    setRemovePaperId(null);
  }

  // Return to collection grid
  function goBackToCollections() {
    setSelectedId(null);
    setRemovePaperId(null);
  }

  return (
    <section className="research-collections">

      {/* Page heading */}
      <div className="page-heading">
        <h1>Research Collections</h1>

        <p>
          Organize saved papers into custom collections.
        </p>
      </div>

      {/* COLLECTION LIST */}
      {!selectedCollection && (
        <>
          {/* Create collection */}
          <form
            className="collection-create-form"
            onSubmit={handleCreate}
          >
            <input
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setNameError("");
              }}
              placeholder="e.g. Agentic AI, Cybersecurity"
              aria-label="Collection name"
              aria-invalid={Boolean(nameError)}
              aria-describedby="collection-name-help"
            />

            {nameError ? (
              <div
                className="collection-warning"
                role="alert"
                id="collection-name-help"
              >
                <AlertCircle size={23} />

                <div>
                  <strong>
                    {name.trim()
                      ? "Collection already exists"
                      : "Collection name required"}
                  </strong>

                  <p>{nameError}</p>
                </div>
              </div>
            ) : (
              <p
                className="collection-help"
                id="collection-name-help"
              >
                Give your collection a unique name,
                such as Agentic AI or Cybersecurity.
              </p>
            )}

            <button type="submit">
              <FolderPlus size={18} />
              Create collection
            </button>
          </form>

          {/* Empty collection list */}
          {collections.length === 0 ? (
            <div className="research-empty">
              <Folder size={36} />

              <h3>No collections yet</h3>

              <p>
                Create your first collection to
                organize your research.
              </p>
            </div>
          ) : (
            <div className="collection-grid">
              {collections.map((collection) => {
                const count = bookmarks.filter(
                  (paper) =>
                    collection.paperIds.includes(paper.id)
                ).length;

                return (
                  <div
                    key={collection.id}
                    className="collection-card"
                  >
                    <button
                      type="button"
                      className="collection-open"
                      onClick={() =>
                        setSelectedId(collection.id)
                      }
                    >
                      <Folder size={24} />

                      <strong>
                        {collection.name}
                      </strong>

                      <span>
                        {count}{" "}
                        {count === 1
                          ? "saved paper"
                          : "saved papers"}
                      </span>
                    </button>

                    <div className="collection-card-actions">
                      <button
                        type="button"
                        className="collection-edit"
                        onClick={() =>
                          openRenameDialog(collection)
                        }
                        aria-label={`Rename ${collection.name}`}
                        title="Rename collection"
                      >
                        <Pencil size={17} />
                      </button>

                      <button
                        type="button"
                        className="collection-delete"
                        onClick={() =>
                          setDeleteId(collection.id)
                        }
                        aria-label={`Delete ${collection.name}`}
                        title="Delete collection"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* COLLECTION DETAIL */}
      {selectedCollection && (
        <div className="collection-detail">

          <button
            type="button"
            className="collection-back-button"
            onClick={goBackToCollections}
          >
            <ArrowLeft size={18} />
            Back to Collections
          </button>

          <div className="collection-detail-heading">
            <div>
              <h2>{selectedCollection.name}</h2>

              <p className="research-count">
                {collectionPapers.length}{" "}
                {collectionPapers.length === 1
                  ? "saved paper"
                  : "saved papers"}
              </p>
            </div>

            <button
              type="button"
              className="collection-rename-button"
              onClick={() =>
                openRenameDialog(selectedCollection)
              }
            >
              <Pencil size={17} />
              Rename
            </button>
          </div>

          {collectionPapers.length === 0 ? (
            <div className="research-empty">
              <Folder size={34} />

              <h3>This collection is empty</h3>

              <p>
                Add bookmarked papers to this
                collection from your research library.
              </p>
            </div>
          ) : (
            <div className="collection-paper-list">
              {collectionPapers.map((paper, index) => (
                <div
                  key={paper.id}
                  className="collection-paper-item"
                >
                  <ResearchPaperCard
                    paper={paper}
                    index={index}
                  />

                  <button
                    type="button"
                    className="collection-remove-paper"
                    onClick={() =>
                      setRemovePaperId(paper.id)
                    }
                  >
                    <X size={16} />
                    Remove from collection
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* RENAME CONFIRMATION */}
      {renameId && (
        <div className="compact-confirm-overlay">
          <form
            className="compact-confirm-dialog collection-rename-dialog"
            onSubmit={handleRename}
            role="dialog"
            aria-modal="true"
            aria-labelledby="rename-collection-title"
          >
            <h3 id="rename-collection-title">
              Rename collection
            </h3>

            <p>
              Change the name without affecting
              the papers inside it.
            </p>

            <input
              type="text"
              className="collection-rename-input"
              value={renameValue}
              onChange={(event) => {
                setRenameValue(event.target.value);
                setRenameError("");
              }}
              aria-label="New collection name"
              aria-invalid={Boolean(renameError)}
              autoFocus
            />

            {renameError && (
              <p
                className="collection-inline-error"
                role="alert"
              >
                <AlertCircle size={16} />
                {renameError}
              </p>
            )}

            <div className="compact-confirm-actions">
              <button
                type="button"
                className="compact-cancel-button"
                onClick={closeRenameDialog}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="collection-save-button"
              >
                Save changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DELETE COLLECTION CONFIRMATION */}
      {collectionToDelete && (
        <div className="compact-confirm-overlay">
          <div
            className="compact-confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-collection-title"
          >
            <h3 id="delete-collection-title">
              Delete collection?
            </h3>

            <p>
              Delete "{collectionToDelete.name}"?
              Your bookmarked papers will remain
              in Saved Papers.
            </p>

            <div className="compact-confirm-actions">
              <button
                type="button"
                className="compact-cancel-button"
                onClick={() => setDeleteId(null)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="compact-remove-button"
                onClick={handleDelete}
              >
                Delete collection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REMOVE PAPER CONFIRMATION */}
      {removePaperId && selectedCollection && (
        <div className="compact-confirm-overlay">
          <div
            className="compact-confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="remove-paper-title"
          >
            <h3 id="remove-paper-title">
              Remove paper?
            </h3>

            <p>
              Remove "
              {paperToRemove?.title || "this paper"}
              " from "{selectedCollection.name}"?
              It will remain in Saved Papers.
            </p>

            <div className="compact-confirm-actions">
              <button
                type="button"
                className="compact-cancel-button"
                onClick={() =>
                  setRemovePaperId(null)
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="compact-remove-button"
                onClick={handleRemovePaper}
              >
                Remove paper
              </button>
            </div>
          </div>
        </div>
      )}

    </section>
  );
}
