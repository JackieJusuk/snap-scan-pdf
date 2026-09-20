import { ScannedPage } from "@/types";
import { getAnthropicApiKey } from "@/services/apiKeyStore";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const MODEL = "claude-opus-5";
// 요금/속도를 고려해 한 번 요약 요청에 보내는 OCR 텍스트 길이를 제한한다. 스캔 문서
// 몇 페이지 분량이면 충분히 넘치는 길이이고, 이보다 훨씬 긴 문서는 앞부분만으로도
// 무엇에 대한 문서인지 요약하기에 부족하지 않다.
const MAX_INPUT_CHARS = 20000;

const SUMMARY_SECTION_MARKER = "[요약]";
const QUESTIONS_SECTION_MARKER = "[예상문제]";

const SUMMARY_INSTRUCTION = [
  "다음 문서를 분석해서 아래 형식 그대로 한국어로만 답변해주세요. 지시문 반복이나 서론,",
  "맺음말 등 형식 밖의 말은 절대 쓰지 마세요.",
  "",
  `${SUMMARY_SECTION_MARKER}`,
  "문서의 핵심 내용을 가독성 있게 항목별로 번호를 매겨서(1. 2. 3. ...) 작성하고, 각 항목은",
  "한두 문장으로 간결하게 써주세요. 3~6개 항목이면 충분합니다.",
  "",
  "이 문서가 교과서, 참고서, 강의자료처럼 학습을 목적으로 하는 문서라고 판단되는 경우에만,",
  `이어서 아래 섹션을 작성하세요. 학습용 문서가 아니라면 "${QUESTIONS_SECTION_MARKER}" 섹션은`,
  "통째로 생략하세요.",
  "",
  `${QUESTIONS_SECTION_MARKER}`,
  "문서 내용을 바탕으로 시험에 나올 법한 예상 문제를 번호를 매겨서(1. 2. 3. ...) 4~6개",
  '만드세요. 각 문제 바로 다음 줄에 "정답: ..." 형식으로 간단한 정답과 해설을 붙이세요.',
].join("\n");

export interface AiDocumentResult {
  summary: string;
  /** 교과서/학습자료로 판단되어 예상문제가 생성된 경우에만 값이 있다. */
  questions: string | null;
}

function parseAiResponse(raw: string): AiDocumentResult {
  const questionsIndex = raw.indexOf(QUESTIONS_SECTION_MARKER);
  const summaryIndex = raw.indexOf(SUMMARY_SECTION_MARKER);
  const summaryStart = summaryIndex >= 0 ? summaryIndex + SUMMARY_SECTION_MARKER.length : 0;
  const summaryEnd = questionsIndex >= 0 ? questionsIndex : raw.length;

  const summary = raw.slice(summaryStart, summaryEnd).trim();
  const questions =
    questionsIndex >= 0
      ? raw.slice(questionsIndex + QUESTIONS_SECTION_MARKER.length).trim()
      : "";

  return {
    summary: summary || raw.trim(),
    questions: questions || null,
  };
}

export class MissingApiKeyError extends Error {
  constructor() {
    super("Anthropic API 키가 설정되어 있지 않습니다. 설정 화면에서 먼저 등록해주세요.");
    this.name = "MissingApiKeyError";
  }
}

type ContentBlock =
  | { type: "text"; text: string }
  | { type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string } };

async function callClaudeForSummary(content: ContentBlock[]): Promise<AiDocumentResult> {
  const apiKey = await getAnthropicApiKey();
  if (!apiKey) {
    throw new MissingApiKeyError();
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: MODEL,
      // 예상문제까지 함께 생성될 수 있어 요약만 하던 때보다 여유 있게 잡는다.
      max_tokens: 1536,
      messages: [{ role: "user", content }],
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Claude API 요청 실패 (${response.status}): ${body.slice(0, 200)}`);
  }

  const data = await response.json();
  const rawText = (data.content ?? [])
    .filter((block: { type: string }) => block.type === "text")
    .map((block: { text: string }) => block.text)
    .join("\n")
    .trim();

  if (!rawText) {
    throw new Error("Claude API 응답에서 요약 텍스트를 찾지 못했습니다.");
  }

  return parseAiResponse(rawText);
}

function collectOcrText(pages: ScannedPage[]): string {
  return pages
    .map((page) => page.ocrText ?? "")
    .join("\n\n")
    .trim();
}

/**
 * 앱에서 직접 촬영/OCR한 문서의 텍스트를 Claude API로 보내 요약을 받아온다.
 */
export async function summarizeDocumentWithAi(pages: ScannedPage[]): Promise<AiDocumentResult> {
  const text = collectOcrText(pages);
  if (!text) {
    throw new Error("요약할 텍스트가 인식되지 않았습니다 (OCR 결과가 비어 있습니다).");
  }

  const truncated = text.slice(0, MAX_INPUT_CHARS);
  return callClaudeForSummary([
    {
      type: "text",
      text: `다음은 스캔한 문서에서 OCR로 인식한 텍스트입니다.\n\n${SUMMARY_INSTRUCTION}\n\n---\n${truncated}`,
    },
  ]);
}

/**
 * 이미 가지고 있는(카메라로 찍지 않은) PDF 파일을 통째로 Claude에 보내 요약을 받아온다.
 * Claude는 PDF를 네이티브로 읽을 수 있어서, 우리 쪽에서 별도로 텍스트를 추출/OCR할
 * 필요가 없다 — 스캔 이미지 PDF든 텍스트 PDF든 그대로 base64로 전달하면 된다.
 */
export async function summarizePdfDocumentWithAi(base64Pdf: string): Promise<AiDocumentResult> {
  return callClaudeForSummary([
    { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64Pdf } },
    { type: "text", text: SUMMARY_INSTRUCTION },
  ]);
}
