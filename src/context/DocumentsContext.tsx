import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { ScannedDocument } from "@/types";
import { loadDocuments, saveDocuments } from "@/services/storage";
import { generateId } from "@/utils/id";

interface DocumentsContextValue {
  documents: ScannedDocument[];
  loading: boolean;
  createDocument: (title: string, pages: ScannedDocument["pages"]) => Promise<ScannedDocument>;
  updateDocument: (id: string, patch: Partial<ScannedDocument>) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
}

const DocumentsContext = createContext<DocumentsContextValue | undefined>(undefined);

export function DocumentsProvider({ children }: { children: React.ReactNode }) {
  const [documents, setDocuments] = useState<ScannedDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDocuments()
      .then(setDocuments)
      .finally(() => setLoading(false));
  }, []);

  const persist = useCallback(async (next: ScannedDocument[]) => {
    setDocuments(next);
    await saveDocuments(next);
  }, []);

  const createDocument = useCallback(
    async (title: string, pages: ScannedDocument["pages"]) => {
      const now = Date.now();
      const doc: ScannedDocument = {
        id: generateId(),
        title,
        pages,
        createdAt: now,
        updatedAt: now,
      };
      await persist([doc, ...documents]);
      return doc;
    },
    [documents, persist]
  );

  const updateDocument = useCallback(
    async (id: string, patch: Partial<ScannedDocument>) => {
      const next = documents.map((doc) =>
        doc.id === id ? { ...doc, ...patch, updatedAt: Date.now() } : doc
      );
      await persist(next);
    },
    [documents, persist]
  );

  const deleteDocument = useCallback(
    async (id: string) => {
      await persist(documents.filter((doc) => doc.id !== id));
    },
    [documents, persist]
  );

  const value = useMemo(
    () => ({ documents, loading, createDocument, updateDocument, deleteDocument }),
    [documents, loading, createDocument, updateDocument, deleteDocument]
  );

  return <DocumentsContext.Provider value={value}>{children}</DocumentsContext.Provider>;
}

export function useDocuments(): DocumentsContextValue {
  const ctx = useContext(DocumentsContext);
  if (!ctx) throw new Error("useDocuments must be used within a DocumentsProvider");
  return ctx;
}
