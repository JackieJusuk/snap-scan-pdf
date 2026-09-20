import { Image } from "react-native";
import { PDFDocument, PDFFont, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { saveBase64Data } from "@apps-in-toss/framework";
import { ScannedPage } from "@/types";
import { AiDocumentResult } from "@/services/summaryAi";

const PAGE_WIDTH = 595; // A4 @ 72dpi
const PAGE_HEIGHT = 842;
const MARGIN = 48;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const TITLE_SIZE = 18;
const BADGE_SIZE = 10;
const HEADING_SIZE = 14;
const BODY_SIZE = 12;
const ANSWER_SIZE = 11;
const NUMBER_COLUMN_WIDTH = 22;

const COLOR_TEXT = rgb(0x11 / 255, 0x11 / 255, 0x11 / 255);
const COLOR_BRAND = rgb(0x25 / 255, 0x63 / 255, 0xeb / 255);
const COLOR_MUTED = rgb(0x64 / 255, 0x74 / 255, 0x8b / 255);

let cachedFontBytes: ArrayBuffer | null = null;

// 앱인토스(Granite) 환경에는 로컬 파일을 읽는 API가 없어서, 번들에 포함된 폰트 자산을
// RN의 표준 방식(require + resolveAssetSource)으로 URI를 얻은 뒤 fetch로 바이트를
// 받아온다. 한글은 pdf-lib 내장 표준 폰트(Helvetica 등)로는 그려지지 않기 때문에,
// 한글 글리프가 포함된 폰트(전체 한글 음절 + 기본 라틴/문장부호로 서브셋)를 함께
// 번들링해 embedFont로 심어준다. (assets/fonts/NotoSansKR-Regular.ttf)
async function loadKoreanFontBytes(): Promise<ArrayBuffer> {
  if (cachedFontBytes) return cachedFontBytes;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const asset = Image.resolveAssetSource(require("../../assets/fonts/NotoSansKR-Regular.ttf"));
  const response = await fetch(asset.uri);
  cachedFontBytes = await response.arrayBuffer();
  return cachedFontBytes;
}

/**
 * 촬영한 페이지 이미지를 그대로 한 장씩 담은 PDF를 만든다. 앱인토스 환경에는 온디바이스
 * OCR이 없어서 텍스트 레이어를 심을 수 없다 — 즉 이 PDF는 이전 Expo 버전과 달리
 * "검색 가능한 PDF"가 아니라 사진을 모아둔 PDF다.
 */
export async function buildScanPdfBase64(pages: ScannedPage[]): Promise<string> {
  if (pages.length === 0) {
    throw new Error("PDF를 만들려면 최소 한 장은 촬영해야 합니다.");
  }

  const pdfDoc = await PDFDocument.create();
  for (const page of pages) {
    const jpgImage = await pdfDoc.embedJpg(page.dataUri);
    const { width, height } = jpgImage.scaleToFit(CONTENT_WIDTH + MARGIN, PAGE_HEIGHT - MARGIN);
    const pdfPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pdfPage.drawImage(jpgImage, {
      x: (PAGE_WIDTH - width) / 2,
      y: (PAGE_HEIGHT - height) / 2,
      width,
      height,
    });
  }

  return pdfDoc.saveAsBase64();
}

// 문자 단위로 줄바꿈한다 — 한글은 라틴 문자와 달리 단어 사이 공백 기준 줄바꿈이
// 필수가 아니라서, 지정한 최대 너비를 넘기기 직전까지 한 글자씩 채우는 방식으로
// 충분하다.
function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  if (!text) return [""];
  const lines: string[] = [];
  let current = "";
  for (const ch of Array.from(text)) {
    const candidate = current + ch;
    if (current && font.widthOfTextAtSize(candidate, size) > maxWidth) {
      lines.push(current);
      current = ch;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

const NUMBERED_LINE = /^(\d+)[.)]\s*(.*)$/;
const ANSWER_LINE = /^정답\s*[:：]\s*(.*)$/;

class PdfWriter {
  private doc: PDFDocument;
  private font: PDFFont;
  private page: ReturnType<PDFDocument["addPage"]>;
  private cursorY = PAGE_HEIGHT - MARGIN;

  constructor(doc: PDFDocument, font: PDFFont) {
    this.doc = doc;
    this.font = font;
    this.page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  }

  private ensureSpace(height: number) {
    if (this.cursorY - height < MARGIN) {
      this.page = this.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      this.cursorY = PAGE_HEIGHT - MARGIN;
    }
  }

  drawLine(text: string, options: { x?: number; size?: number; color?: ReturnType<typeof rgb>; gap?: number }) {
    const { x = MARGIN, size = BODY_SIZE, color = COLOR_TEXT, gap = size * 1.6 } = options;
    this.ensureSpace(gap);
    this.page.drawText(text, { x, y: this.cursorY - size, size, font: this.font, color });
    this.cursorY -= gap;
  }

  drawWrapped(text: string, options: { x?: number; maxWidth?: number; size?: number; color?: ReturnType<typeof rgb> }) {
    const { x = MARGIN, maxWidth = CONTENT_WIDTH, size = BODY_SIZE, color = COLOR_TEXT } = options;
    const lines = wrapText(text, this.font, size, maxWidth);
    for (const line of lines) {
      this.drawLine(line, { x, size, color });
    }
  }

  drawNumberedSection(text: string) {
    for (const rawLine of text.split("\n")) {
      const line = rawLine.trim();
      if (!line) continue;

      const numbered = line.match(NUMBERED_LINE);
      if (numbered) {
        const [, number, rest] = numbered;
        const lines = wrapText(rest, this.font, BODY_SIZE, CONTENT_WIDTH - NUMBER_COLUMN_WIDTH);
        lines.forEach((wrapped, i) => {
          this.drawLine(i === 0 ? `${number}.` : "", { x: MARGIN, size: BODY_SIZE, color: COLOR_BRAND });
          this.cursorY += BODY_SIZE * 1.6; // 번호와 같은 줄에 본문을 겹쳐 그리기 위해 되돌린다.
          this.drawLine(wrapped, { x: MARGIN + NUMBER_COLUMN_WIDTH, size: BODY_SIZE, color: COLOR_TEXT });
        });
        continue;
      }

      const answer = line.match(ANSWER_LINE);
      if (answer) {
        this.drawWrapped(`정답: ${answer[1]}`, {
          x: MARGIN + NUMBER_COLUMN_WIDTH,
          maxWidth: CONTENT_WIDTH - NUMBER_COLUMN_WIDTH,
          size: ANSWER_SIZE,
          color: COLOR_MUTED,
        });
        continue;
      }

      this.drawWrapped(line, { size: BODY_SIZE });
    }
  }

  async toBase64(): Promise<string> {
    return this.doc.saveAsBase64();
  }
}

/**
 * Claude가 만든 요약(및 교과서로 판단된 경우 예상문제) 텍스트만 담은 PDF를 만든다.
 */
export async function buildSummaryPdfBase64(result: AiDocumentResult, title: string): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const fontBytes = await loadKoreanFontBytes();
  const font = await pdfDoc.embedFont(fontBytes, { subset: true });

  const writer = new PdfWriter(pdfDoc, font);
  writer.drawLine("AI 요약 (Claude)", { size: BADGE_SIZE, color: COLOR_BRAND, gap: BADGE_SIZE * 2.2 });
  writer.drawWrapped(title, { size: TITLE_SIZE });
  writer.drawNumberedSection(result.summary);

  if (result.questions) {
    writer.drawLine("예상 문제", { size: HEADING_SIZE, gap: HEADING_SIZE * 2.4 });
    writer.drawNumberedSection(result.questions);
  }

  return writer.toBase64();
}

/**
 * 생성된 PDF를 기기에 파일로 저장한다. 앱인토스 SDK에는(적어도 현재 배포된 버전에는)
 * PDF를 앱 안에서 바로 열어 보여주는 뷰어 API가 없어서, saveBase64Data로 기기에
 * 내려주는 것으로 끝난다 — 실제 파일은 기기의 다운로드 위치에서 열어봐야 한다.
 */
export async function savePdfToDevice(base64Pdf: string, fileName: string): Promise<void> {
  await saveBase64Data({ data: base64Pdf, fileName, mimeType: "application/pdf" });
}
