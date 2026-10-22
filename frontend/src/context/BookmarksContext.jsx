
import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

const BookmarksContext = createContext(null);

export function BookmarksProvider({ children }) {
  const [bookmarks, setBookmarks] = useState(() => {
    try {
      const stored = localStorage.getItem("aegis-bookmarks");
      const parsed = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(
      "aegis-bookmarks",
      JSON.stringify(bookmarks)
    );
  }, [bookmarks]);

  function toggleBookmark(paper) {
    setBookmarks((previous) => {
      const exists = previous.some(
        (item) => item.id === paper.id
      );

      if (exists) {
        return previous.filter(
          (item) => item.id !== paper.id
        );
      }

      return [...previous, paper];
    });
  }

  function isBookmarked(id) {
    return bookmarks.some((paper) => paper.id === id);
  }

  return (
    <BookmarksContext.Provider
      value={{ bookmarks, toggleBookmark, isBookmarked }}
    >
      {children}
    </BookmarksContext.Provider>
  );
}

export function useBookmarks() {
  const context = useContext(BookmarksContext);

  if (!context) {
    throw new Error(
      "useBookmarks must be used inside BookmarksProvider"
    );
  }

  return context;
}
