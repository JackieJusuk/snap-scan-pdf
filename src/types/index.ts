export interface OcrBlock {
  text: string;
  /** Bounding box in pixel coordinates of the source page image. */
  frame: { x: number; y: number; width: number; height: number };
}

export interface ScannedPage {
  id: string;
  /** URI of the cropped/perspective-corrected page image. */
  imageUri: string;
  width: number;
  height: number;
  ocrText?: string;
  ocrBlocks?: OcrBlock[];
}

export interface ScannedDocument {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  pages: ScannedPage[];
  /** URI of the generated PDF, set once "PDF 생성" has run. */
  pdfUri?: string;
  /** URI of the Claude 기반 AI 요약 PDF. 요약 생성이 실패했다면 설정되지 않는다. */
  summaryPdfUri?: string;
}
