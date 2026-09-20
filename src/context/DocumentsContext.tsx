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
  createDocument: (
    title: string,
    summary: string,
    questions: string | null
  ) => Promise<ScannedDocument>;
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
  // createDocument를 연달아 호출할 때 뒤의 호출이 여전히 오래된 documents 클로저를
  // 참조해 방금 만든 문서를 잃어버릴 수 있다. setDocuments의 함수형 업데이트로
  // "가장 최신" 상태를 넘겨받아 계산하면 이 문제가 없다.
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
    async (title: string, summary: string, questions: string | null) => {
      const now = Date.now();
      const doc: ScannedDocument = {
        id: generateId(),
        title,
        summary,
        questions,
        createdAt: now,
        updatedAt: now,
      };
      await persist((prev) => [doc, ...prev]);
      return doc;
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
    () => ({ documents, loading, createDocument, deleteDocument }),
    [documents, loading, createDocument, deleteDocument]
  );

  return <DocumentsContext.Provider value={value}>{children}</DocumentsContext.Provider>;
}

export function useDocuments(): DocumentsContextValue {
  const ctx = useContext(DocumentsContext);
  if (!ctx) throw new Error("useDocuments must be used within a DocumentsProvider");
  return ctx;
}
