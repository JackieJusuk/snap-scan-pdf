import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "SnapScan PDF",
  slug: "snap-scan-pdf",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "automatic",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  assetBundlePatterns: ["**/*"],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.snapscanpdf.app",
    infoPlist: {
      NSCameraUsageDescription:
        "문서를 촬영해 PDF로 변환하려면 카메라 접근 권한이 필요합니다.",
      NSPhotoLibraryAddUsageDescription:
        "생성된 PDF와 스캔 이미지를 사진 라이브러리에 저장할 수 있습니다.",
    },
  },
  android: {
    package: "com.snapscanpdf.app",
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#2563eb",
    },
    permissions: ["CAMERA", "READ_EXTERNAL_STORAGE", "WRITE_EXTERNAL_STORAGE"],
  },
  extra: {
    eas: {
      projectId: "273db8e8-2506-4faf-96bb-551bab48dc9a",
    },
  },
});
