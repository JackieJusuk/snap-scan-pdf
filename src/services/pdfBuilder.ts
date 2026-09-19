import * as FileSystem from "expo-file-system";
import * as Print from "expo-print";
import { ScannedPage } from "@/types";

const PAGE_WIDTH_PT = 595; // A4 @ 72dpi
const PAGE_HEIGHT_PT = 842;

async function toDataUri(imageUri: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(imageUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const ext = imageUri.split(".").pop()?.toLowerCase();
  const mime = ext === "png" ? "image/png" : "image/jpeg";
  return `data:${mime};base64,${base64}`;
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
