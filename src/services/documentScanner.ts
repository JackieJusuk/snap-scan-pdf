import { Image } from "react-native";
import DocumentScanner from "react-native-document-scanner-plugin";
import { generateId } from "@/utils/id";
import { ScannedPage } from "@/types";

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
    scannedImages.map(async (imageUri): Promise<ScannedPage> => {
      const { width, height } = await getImageSize(imageUri);
      return { id: generateId(), imageUri, width, height };
    })
  );

  return pages;
}
