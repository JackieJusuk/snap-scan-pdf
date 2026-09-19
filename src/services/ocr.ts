import TextRecognition, { TextRecognitionScript } from "@react-native-ml-kit/text-recognition";
import { OcrBlock, ScannedPage } from "@/types";

/**
 * Runs on-device OCR (Google ML Kit) over a page image and returns both the
 * full recognized text and per-line bounding boxes, so a searchable text
 * layer can later be overlaid on the PDF page at the right position. Uses
 * the Korean script model since this app targets Korean-language documents.
 */
export async function recognizeText(
  page: ScannedPage
): Promise<Pick<ScannedPage, "ocrText" | "ocrBlocks">> {
  const result = await TextRecognition.recognize(page.imageUri, TextRecognitionScript.KOREAN);

  const ocrBlocks: OcrBlock[] = result.blocks.flatMap((block) =>
    block.lines
      .filter((line) => line.frame)
      .map((line) => ({
        text: line.text,
        frame: {
          x: line.frame!.left,
          y: line.frame!.top,
          width: line.frame!.width,
          height: line.frame!.height,
        },
      }))
  );

  return { ocrText: result.text, ocrBlocks };
}

export async function recognizeAllPages(pages: ScannedPage[]): Promise<ScannedPage[]> {
  const withText: ScannedPage[] = [];
  for (const page of pages) {
    try {
      const { ocrText, ocrBlocks } = await recognizeText(page);
      withText.push({ ...page, ocrText, ocrBlocks });
    } catch {
      // OCR failing on a single page shouldn't block PDF generation —
      // that page simply won't have a searchable text layer.
      withText.push(page);
    }
  }
  return withText;
}
