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

  // 갱신 전 배열을 파라미터로 직접 받으면(예: persist(next)), 같은 핸들러 안에서
  // createDocument → updateDocument처럼 연달아 호출할 때 뒤의 호출이 여전히 오래된
  // documents 클로저를 참조해 방금 만든 문서를 잃어버릴 수 있다(React state는 그
  // 사이 setDocuments가 이미 반영됐어도 이 함수의 클로저 안에서는 그대로다).
  // setDocuments의 함수형 업데이트로 "가장 최신" 상태를 넘겨받아 계산하면 이 문제가 없다.
  const persist = useCallback(
    async (updater: (prev: ScannedDocument[]) => ScannedDocument[]) => {
      let next: ScannedDocument[] = [];
      setDocuments((prev) => {
        next = updater(prev);
        return next;
      });
      await saveDocuments(next);
    },
    []
  );

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
      await persist((prev) => [doc, ...prev]);
      return doc;
    },
    [persist]
  );

  const updateDocument = useCallback(
    async (id: string, patch: Partial<ScannedDocument>) => {
      await persist((prev) =>
        prev.map((doc) => (doc.id === id ? { ...doc, ...patch, updatedAt: Date.now() } : doc))
      );
    },
    [persist]
  );

  const deleteDocument = useCallback(
    async (id: string) => {
      await persist((prev) => prev.filter((doc) => doc.id !== id));
    },
    [persist]
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
