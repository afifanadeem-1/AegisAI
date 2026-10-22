
import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

const CollectionsContext = createContext(null);

const STORAGE_KEY = "aegis-collections";

function loadCollections() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) return [];

    const parsed = JSON.parse(saved);

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to load collections:", error);
    return [];
  }
}

export function CollectionsProvider({ children }) {
  const [collections, setCollections] = useState(
    loadCollections
  );

  // Save collections whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(collections)
      );
    } catch (error) {
      console.error("Failed to save collections:", error);
    }
  }, [collections]);

  // Create a new collection
  function createCollection(name) {
    const trimmedName = name.trim();

    if (!trimmedName) return;

    const newCollection = {
      id: crypto.randomUUID(),
      name: trimmedName,
      paperIds: [],
      createdAt: new Date().toISOString(),
    };

    setCollections((previous) => [
      ...previous,
      newCollection,
    ]);
  }

  // Rename an existing collection
  function renameCollection(collectionId, newName) {
    const trimmedName = newName.trim();

    if (!trimmedName) return;

    setCollections((previous) =>
      previous.map((collection) =>
        collection.id === collectionId
          ? {
              ...collection,
              name: trimmedName,
            }
          : collection
      )
    );
  }

  // Delete a collection, not its saved papers
  function deleteCollection(collectionId) {
    setCollections((previous) =>
      previous.filter(
        (collection) => collection.id !== collectionId
      )
    );
  }

  // Add a paper to a collection
  function addPaperToCollection(collectionId, paperId) {
    setCollections((previous) =>
      previous.map((collection) => {
        if (collection.id !== collectionId) {
          return collection;
        }

        if (collection.paperIds.includes(paperId)) {
          return collection;
        }

        return {
          ...collection,
          paperIds: [...collection.paperIds, paperId],
        };
      })
    );
  }

  // Remove a paper from a collection
  // The original bookmark remains untouched
  function removePaperFromCollection(collectionId, paperId) {
    setCollections((previous) =>
      previous.map((collection) =>
        collection.id === collectionId
          ? {
              ...collection,
              paperIds: collection.paperIds.filter(
                (id) => id !== paperId
              ),
            }
          : collection
      )
    );
  }

  return (
    <CollectionsContext.Provider
      value={{
        collections,
        createCollection,
        renameCollection,
        deleteCollection,
        addPaperToCollection,
        removePaperFromCollection,
      }}
    >
      {children}
    </CollectionsContext.Provider>
  );
}

export function useCollections() {
  const context = useContext(CollectionsContext);

  if (!context) {
    throw new Error(
      "useCollections must be used inside CollectionsProvider"
    );
  }

  return context;
}
