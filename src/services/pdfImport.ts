import * as FileSystem from "expo-file-system";

export interface PickedPdfFile {
  uri: string;
  name: string;
}

// SAF(Storage Access Framework) content URI는 documentId 부분이 URL-encode 되어 있고,
// 실제 파일명은 그 documentId의 마지막 "/" 뒤 구간이다. 예:
// content://.../document/primary%3ADownload%2FSub%2FMyFile.pdf
// -> decode -> .../primary:Download/Sub/MyFile.pdf -> 마지막 segment: MyFile.pdf
function extractFileNameFromSafUri(uri: string): string {
  const decoded = decodeURIComponent(uri);
  const segments = decoded.split("/");
  return segments[segments.length - 1] || decoded;
}

/** Android 전용: 사용자가 폴더를 고르면, 그 폴더에 대한 읽기/쓰기 권한이 담긴 URI를 돌려준다. */
export async function pickPdfDirectory(): Promise<string | null> {
  const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
  return permissions.granted ? permissions.directoryUri : null;
}

/** 선택한 폴더 안에서 .pdf 파일만 걸러 이름과 함께 돌려준다. */
export async function listPdfFilesInDirectory(directoryUri: string): Promise<PickedPdfFile[]> {
  const uris = await FileSystem.StorageAccessFramework.readDirectoryAsync(directoryUri);
  return uris
    .map((uri) => ({ uri, name: extractFileNameFromSafUri(uri) }))
    .filter((file) => file.name.toLowerCase().endsWith(".pdf"));
}

/**
 * 방금 만든 AI 요약 PDF를 원본 PDF와 같은 폴더(directoryUri) 안에 저장한다.
 * 사용자가 "원본이 있는 곳에 저장해달라"고 명시적으로 요청했기 때문에, 앱 내부
 * 저장소가 아니라 반드시 이 directoryUri 안에 파일을 만든다.
 */
export async function saveSummaryNextToOriginal(
  directoryUri: string,
  originalFileName: string,
  tempSummaryPdfUri: string
): Promise<string> {
  const baseName = originalFileName.replace(/\.pdf$/i, "");
  const base64 = await FileSystem.readAsStringAsync(tempSummaryPdfUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const destinationUri = await FileSystem.StorageAccessFramework.createFileAsync(
    directoryUri,
    `${baseName}_summary`,
    "application/pdf"
  );
  await FileSystem.writeAsStringAsync(destinationUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return destinationUri;
}
