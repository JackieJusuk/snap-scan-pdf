import { ScannedPage } from "@/types";
import { getAnthropicApiKey } from "@/services/apiKeyStore";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const MODEL = "claude-opus-5";
// 요금/속도를 고려해 한 번 요약 요청에 보내는 OCR 텍스트 길이를 제한한다. 스캔 문서
// 몇 페이지 분량이면 충분히 넘치는 길이이고, 이보다 훨씬 긴 문서는 앞부분만으로도
// 무엇에 대한 문서인지 요약하기에 부족하지 않다.
const MAX_INPUT_CHARS = 20000;

const SUMMARY_INSTRUCTION =
  "이 문서의 핵심 내용을 한국어로 3~5문장으로 간결하게 요약해주세요. 요약문 외의 다른 말은 하지 마세요.";

export class MissingApiKeyError extends Error {
  constructor() {
    super("Anthropic API 키가 설정되어 있지 않습니다. 설정 화면에서 먼저 등록해주세요.");
    this.name = "MissingApiKeyError";
  }
}

type ContentBlock =
  | { type: "text"; text: string }
  | { type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string } };

async function callClaudeForSummary(content: ContentBlock[]): Promise<string> {
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
      max_tokens: 512,
      messages: [{ role: "user", content }],
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Claude API 요청 실패 (${response.status}): ${body.slice(0, 200)}`);
  }

  const data = await response.json();
  const summary = (data.content ?? [])
    .filter((block: { type: string }) => block.type === "text")
    .map((block: { text: string }) => block.text)
    .join("\n")
    .trim();

  if (!summary) {
    throw new Error("Claude API 응답에서 요약 텍스트를 찾지 못했습니다.");
  }

  return summary;
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
export async function summarizeDocumentWithAi(pages: ScannedPage[]): Promise<string> {
  const text = collectOcrText(pages);
  if (!text) {
    throw new Error("요약할 텍스트가 인식되지 않았습니다 (OCR 결과가 비어 있습니다).");
  }

  const truncated = text.slice(0, MAX_INPUT_CHARS);
  return callClaudeForSummary([
    { type: "text", text: `다음은 스캔한 문서에서 OCR로 인식한 텍스트입니다. ${SUMMARY_INSTRUCTION}\n\n---\n${truncated}` },
  ]);
}

/**
 * 이미 가지고 있는(카메라로 찍지 않은) PDF 파일을 통째로 Claude에 보내 요약을 받아온다.
 * Claude는 PDF를 네이티브로 읽을 수 있어서, 우리 쪽에서 별도로 텍스트를 추출/OCR할
 * 필요가 없다 — 스캔 이미지 PDF든 텍스트 PDF든 그대로 base64로 전달하면 된다.
 */
export async function summarizePdfDocumentWithAi(base64Pdf: string): Promise<string> {
  return callClaudeForSummary([
    { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64Pdf } },
    { type: "text", text: SUMMARY_INSTRUCTION },
  ]);
}
