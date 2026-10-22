import { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "aegis-research-notes";
const ResearchNotesContext = createContext(null);

function loadNotes() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    if (!stored || typeof stored !== "object" || Array.isArray(stored)) return {};
    return Object.fromEntries(
      Object.entries(stored).filter(([id, value]) =>
        typeof id === "string" && typeof value === "string"
      )
    );
  } catch (error) {
    console.error("Unable to load research notes:", error);
    return {};
  }
}

export function ResearchNotesProvider({ children }) {
  const [notes, setNotes] = useState(loadNotes);
  const [storageError, setStorageError] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
      setStorageError(false);
    } catch (error) {
      console.error("Unable to save research notes:", error);
      setStorageError(true);
    }
  }, [notes]);

  function getNote(paperId) {
    return typeof paperId === "string" ? notes[paperId] || "" : "";
  }

  function saveNote(paperId, content) {
    if (typeof paperId !== "string" || !paperId || typeof content !== "string") return;
    setNotes((previous) => ({ ...previous, [paperId]: content }));
  }

  function deleteNote(paperId) {
    setNotes((previous) => {
      if (!Object.prototype.hasOwnProperty.call(previous, paperId)) return previous;
      const updated = { ...previous };
      delete updated[paperId];
      return updated;
    });
  }

  return (
    <ResearchNotesContext.Provider value={{ getNote, saveNote, deleteNote, storageError }}>
      {children}
    </ResearchNotesContext.Provider>
  );
}

export function useResearchNotes() {
  const context = useContext(ResearchNotesContext);
  if (!context) throw new Error("useResearchNotes must be used inside ResearchNotesProvider");
  return context;
}
