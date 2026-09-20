import { ScannedPage } from "@/types";

const MAX_NAME_LENGTH = 24;

function sanitizeForFileName(text: string): string {
  return text
    .replace(/[\\/:*?"<>|]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, MAX_NAME_LENGTH)
    .replace(/^_+|_+$/g, "");
}

/**
 * OCR로 인식된 텍스트 앞부분을 파일 이름에 쓸 수 있는 짧은 요약으로 만든다. 네트워크
 * 호출 없이 기기 내에서만 동작해야 하므로, 실제 AI 요약이 아니라 문서를 훑어봤을 때
 * 내용을 짐작할 수 있는 정도의 "제목 힌트"를 앞부분 텍스트에서 추출하는 방식이다.
 */
export function summarizePagesForFileName(pages: ScannedPage[], fallbackTitle: string): string {
  const text = pages
    .map((page) => page.ocrText ?? "")
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return sanitizeForFileName(text) || sanitizeForFileName(fallbackTitle) || "문서";
}

const MAX_TITLE_LENGTH = 24;

/**
 * OCR로 인식된 텍스트에서 사람이 읽는 문서 제목(화면에 그대로 노출되는 title 필드)을
 * 뽑아낸다. 첫 페이지의 첫 번째 의미 있는 줄을 "이 문서를 대표하는 키워드/문구"로
 * 간주한다 — 네트워크 호출 없이 즉시 동작해야 문서 생성이 지연되지 않는다.
 */
export function deriveDocumentTitle(pages: ScannedPage[], fallbackTitle: string): string {
  for (const page of pages) {
    const lines = (page.ocrText ?? "").split("\n").map((line) => line.trim());
    const firstMeaningfulLine = lines.find((line) => line.length >= 2);
    if (firstMeaningfulLine) {
      return firstMeaningfulLine.length > MAX_TITLE_LENGTH
        ? `${firstMeaningfulLine.slice(0, MAX_TITLE_LENGTH)}…`
        : firstMeaningfulLine;
    }
  }
  return fallbackTitle;
}
