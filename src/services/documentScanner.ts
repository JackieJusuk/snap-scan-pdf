import { Image } from "react-native";
import DocumentScanner from "react-native-document-scanner-plugin";
import { generateId } from "@/utils/id";
import { ScannedPage } from "@/types";
import { enhanceDocumentImage } from "@/services/imageEnhancer";

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (error) => reject(error)
    );
  });
}

/**
 * Opens the native document scanner UI (edge detection + perspective
 * correction happens on-device via the platform scanner). The user can
 * capture multiple pages in one session before closing the scanner.
 */
export async function scanPages(): Promise<ScannedPage[]> {
  const { scannedImages, status } = await DocumentScanner.scanDocument({
    croppedImageQuality: 90,
  });

  if (status !== "success" || !scannedImages || scannedImages.length === 0) {
    return [];
  }

  const pages = await Promise.all(
    scannedImages.map(async (rawImageUri): Promise<ScannedPage> => {
      // 종이 그림자/구겨짐 얼룩을 줄이고 글씨 가독성을 높이는 문서 스캔 모드 필터를
      // 적용한다. 이후 미리보기·OCR·PDF 삽입이 모두 이 보정된 이미지를 사용한다.
      const imageUri = await enhanceDocumentImage(rawImageUri);
      const { width, height } = await getImageSize(imageUri);
      return { id: generateId(), imageUri, width, height };
    })
  );

  return pages;
}
