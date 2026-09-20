import { Storage } from "@apps-in-toss/framework";
import { ScannedDocument } from "@/types";

const STORAGE_KEY = "snap-scan-pdf/documents";

// 앱인토스 환경에서는 AsyncStorage를 쓸 수 없다(화면이 하얗게 표시되는 문제가 생길 수
// 있다고 공식 문서에 명시돼 있음) — 대신 앱인토스 SDK의 Storage 도메인 API를 쓴다.
export async function loadDocuments(): Promise<ScannedDocument[]> {
  const raw = await Storage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ScannedDocument[];
  } catch {
    return [];
  }
}

export async function saveDocuments(documents: ScannedDocument[]): Promise<void> {
  await Storage.setItem(STORAGE_KEY, JSON.stringify(documents));
}
