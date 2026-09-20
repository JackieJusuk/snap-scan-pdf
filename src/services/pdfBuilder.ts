import { Platform } from "react-native";
import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import * as Print from "expo-print";
import { ScannedPage } from "@/types";
import { AiDocumentResult } from "@/services/summaryAi";

const PAGE_WIDTH_PT = 595; // A4 @ 72dpi
const PAGE_HEIGHT_PT = 842;
// Full-resolution scans (often 8-15MB) blow up ~33% as base64 and can make
// the print WebView hang or OOM once multiple pages are embedded in one
// HTML string, so downscale/compress before embedding.
const MAX_EMBED_WIDTH = 2200;

async function toDataUri(imageUri: string): Promise<string> {
  const resized = await ImageManipulator.manipulateAsync(
    imageUri,
    [{ resize: { width: MAX_EMBED_WIDTH } }],
    { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
  );
  const base64 = await FileSystem.readAsStringAsync(resized.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return `data:image/jpeg;base64,${base64}`;
}

/**
 * Renders one page as a full-bleed image with an invisible text layer
 * positioned over each OCR'd line, so the resulting PDF page looks like the
 * photo but its text is selectable/searchable — the standard "scanner app"
 * trick, since expo-print/WebView can't otherwise burn a text layer into
 * an image-based PDF.
 */
function buildPageHtml(page: ScannedPage, imageDataUri: string): string {
  const scaleX = PAGE_WIDTH_PT / page.width;
  const scaleY = PAGE_HEIGHT_PT / page.height;

  const textLayer = (page.ocrBlocks ?? [])
    .map((block) => {
      const left = block.frame.x * scaleX;
      const top = block.frame.y * scaleY;
      const width = block.frame.width * scaleX;
      const height = block.frame.height * scaleY;
      const fontSize = Math.max(height * 0.9, 1);
      const escaped = block.text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      return `<span style="position:absolute;left:${left}pt;top:${top}pt;width:${width}pt;height:${height}pt;font-size:${fontSize}pt;line-height:${height}pt;color:transparent;white-space:nowrap;overflow:hidden;">${escaped}</span>`;
    })
    .join("");

  return `
    <div class="page">
      <img src="${imageDataUri}" class="page-image" />
      ${textLayer}
    </div>
  `;
}

export async function buildSearchablePdf(pages: ScannedPage[]): Promise<string> {
  if (pages.length === 0) {
    throw new Error("PDF를 생성하려면 최소 한 페이지가 필요합니다.");
  }

  const pagesHtml = await Promise.all(
    pages.map(async (page) => buildPageHtml(page, await toDataUri(page.imageUri)))
  );

  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          @page { size: A4; margin: 0; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { width: ${PAGE_WIDTH_PT}pt; }
          .page {
            position: relative;
            width: ${PAGE_WIDTH_PT}pt;
            height: ${PAGE_HEIGHT_PT}pt;
            page-break-after: always;
            overflow: hidden;
          }
          .page:last-child { page-break-after: auto; }
          .page-image {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: contain;
          }
        </style>
      </head>
      <body>
        ${pagesHtml.join("\n")}
      </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  return uri;
}

export async function persistPdf(tempUri: string, fileName: string): Promise<string> {
  const dir = `${FileSystem.documentDirectory}pdfs/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => undefined);
  const destination = `${dir}${fileName}.pdf`;
  await FileSystem.copyAsync({ from: tempUri, to: destination });
  return destination;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Claude에게 "1. 2. 3. ..." 형식으로 번호를 매겨 요약/예상문제를 만들도록 요청하므로
// (summaryAi.ts의 SUMMARY_INSTRUCTION), 그 번호를 텍스트 그대로 두지 않고 번호/본문을
// 나눠 정렬된 목록처럼 렌더링해 가독성을 높인다. 혹시 모델이 번호 없이 응답하면 일반
// 문단으로 그대로 표시된다.
const NUMBERED_LINE = /^(\d+)[.)]\s*(.*)$/;
// 예상문제 각 항목 다음 줄의 "정답: ..." 은 문제와 구분되도록 별도 스타일로 표시한다.
const ANSWER_LINE = /^정답\s*[:：]\s*(.*)$/;

function renderSummaryLine(rawLine: string): string {
  const numberedMatch = rawLine.match(NUMBERED_LINE);
  if (numberedMatch) {
    const [, number, rest] = numberedMatch;
    return `<div class="item"><span class="item-number">${number}.</span><span class="item-text">${
      escapeHtml(rest) || "&nbsp;"
    }</span></div>`;
  }
  const answerMatch = rawLine.match(ANSWER_LINE);
  if (answerMatch) {
    return `<p class="answer">정답: ${escapeHtml(answerMatch[1])}</p>`;
  }
  return `<p>${escapeHtml(rawLine)}</p>`;
}

function renderNumberedSection(text: string): string {
  return text
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map(renderSummaryLine)
    .join("\n");
}

/**
 * 스캔 이미지가 아니라, Claude가 만든 요약(및 교과서로 판단된 경우 예상문제) 텍스트만
 * 담은 별도의 PDF를 만든다. 원본 스캔 PDF(buildSearchablePdf)와는 독립된 파일이다.
 */
export async function buildSummaryPdf(result: AiDocumentResult, title: string): Promise<string> {
  const escapedTitle = escapeHtml(title);
  const summaryHtml = renderNumberedSection(result.summary);
  const questionsHtml = result.questions ? renderNumberedSection(result.questions) : null;

  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          @page { size: A4; margin: 48pt; }
          body { font-family: -apple-system, "Malgun Gothic", sans-serif; }
          h1 { font-size: 18pt; margin-bottom: 4pt; }
          h2 { font-size: 14pt; margin-top: 28pt; margin-bottom: 12pt; color: #111; }
          .badge { color: #2563eb; font-size: 10pt; font-weight: 700; margin-bottom: 16pt; }
          p { font-size: 12pt; line-height: 1.6; color: #111; margin-bottom: 10pt; }
          .item { display: flex; margin-bottom: 10pt; }
          .item-number { width: 22pt; flex-shrink: 0; font-size: 12pt; font-weight: 700; color: #2563eb; }
          .item-text { flex: 1; font-size: 12pt; line-height: 1.6; color: #111; }
          .answer { margin-top: -4pt; margin-left: 22pt; font-size: 11pt; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="badge">AI 요약 (Claude)</div>
        <h1>${escapedTitle}</h1>
        ${summaryHtml}
        ${questionsHtml ? `<h2>예상 문제</h2>${questionsHtml}` : ""}
      </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  return uri;
}

export type SaveToDirectoryResult = "saved" | "cancelled" | "unsupported";

export class FolderNotWritableError extends Error {
  constructor() {
    super('이 폴더는 지원 안 됨, 이전 메뉴 "공유/저장"을 이용하세요.');
    this.name = "FolderNotWritableError";
  }
}

/**
 * 사용자가 직접 고른 폴더(Android의 Storage Access Framework 폴더 선택 다이얼로그)에
 * PDF를 복사해 넣는다. iOS는 Expo가 이에 대응하는 폴더 선택 API를 제공하지 않으므로
 * "unsupported"를 돌려주고, 호출 측에서 기존 공유 시트("파일 앱에 저장")로 안내한다.
 */
export async function saveToChosenDirectory(pdfUri: string): Promise<SaveToDirectoryResult> {
  if (Platform.OS !== "android") {
    return "unsupported";
  }

  const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!permissions.granted) {
    return "cancelled";
  }

  const baseName = (pdfUri.split("/").pop() ?? "document.pdf").replace(/\.pdf$/i, "");
  const base64 = await FileSystem.readAsStringAsync(pdfUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  try {
    const destinationUri = await FileSystem.StorageAccessFramework.createFileAsync(
      permissions.directoryUri,
      baseName,
      "application/pdf"
    );
    await FileSystem.writeAsStringAsync(destinationUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } catch {
    // Google Drive 등 일부 클라우드 폴더는 SAF로 조회는 되지만 새 파일 쓰기는 막혀
    // 있어서 여기서 원인불명의 java.io.IOException이 올라온다. 사용자에게는 원본
    // 예외 대신 다음 행동을 알려준다.
    throw new FolderNotWritableError();
  }

  return "saved";
}
