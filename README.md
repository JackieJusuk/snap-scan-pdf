# SnapScan PDF

사진을 찍으면 **문서 경계 자동 인식 → 원근 보정 → OCR 텍스트 인식**을 거쳐 검색 가능한
PDF로 만들어주는 React Native(Expo) 모바일 앱입니다. iOS/Android 공용 코드베이스입니다.

## 주요 기능

- **촬영/스캔**: 네이티브 문서 스캐너(`react-native-document-scanner-plugin`)로 촬영하면
  문서 경계를 자동 인식하고 각도(원근)를 보정해 반듯한 이미지로 잘라줍니다. 필요하면 자르기
  영역을 수동으로 조정할 수 있습니다.
- **여러 장 촬영 → 한 PDF**: 한 세션에서 여러 페이지를 연속 촬영하고, 편집 화면에서 순서
  변경/삭제 후 하나의 다중 페이지 PDF로 합칩니다.
- **OCR 텍스트 레이어**: 온디바이스 OCR(Google ML Kit, `@react-native-ml-kit/text-recognition`)로
  각 페이지의 텍스트를 인식하고, 인식된 텍스트를 이미지 위 정확한 위치에 투명하게 겹쳐
  PDF에 삽입합니다 — 사진처럼 보이지만 PDF 뷰어에서 **텍스트 선택/검색/복사**가 됩니다.
- **저장/공유**: 생성된 PDF는 기기에 저장되며, 카카오톡/이메일/파일 앱 등으로 바로 공유할 수
  있습니다.

## 기술 스택

- Expo (React Native, TypeScript)
- `react-native-document-scanner-plugin` — 문서 경계 인식 + 원근 보정 (iOS: VisionKit,
  Android: OpenCV 기반)
- `@react-native-ml-kit/text-recognition` — 온디바이스 OCR
- `expo-print` — HTML → PDF 렌더링(페이지별 이미지 + 투명 텍스트 레이어 오버레이)
- `expo-sharing`, `expo-file-system` — 저장 및 공유
- `@react-navigation` — 화면 전환
- `@react-native-async-storage/async-storage` — 문서 목록 로컬 저장

## 화면 구성

1. **내 문서(Home)** — 저장된 문서 목록, "+ 새로 촬영" 버튼
2. **촬영(Scan)** — 네이티브 스캐너 실행, 촬영 즉시 편집 화면으로 이동
3. **페이지 편집(PageEditor)** — 페이지 순서 변경/삭제/추가, "PDF 생성" 실행(OCR → PDF 빌드)
4. **PDF(PdfPreview)** — 제목 수정, 공유/저장, 삭제

## 설치 및 실행

이 앱은 카메라·OCR용 네이티브 모듈을 사용하므로 **Expo Go로는 실행할 수 없습니다.**
Expo Dev Client(prebuild) 또는 EAS Build를 사용하세요.

```bash
npm install

# 네이티브 프로젝트 생성 (android/, ios/ 폴더 생성)
npx expo prebuild

# 로컬 기기/에뮬레이터에서 실행
npx expo run:android
npx expo run:ios   # macOS + Xcode 필요
```

또는 클라우드 빌드(EAS)를 사용하는 경우:

```bash
npm install -g eas-cli
eas build --profile development --platform android
```

`app.config.ts`의 `extra.eas.projectId`는 실제 EAS 프로젝트 생성 후 값으로 교체하세요.

## 알려진 제한 사항

- **밝기/대비 자동 보정은 스캐너 플러그인의 기본 처리에 의존**합니다. 별도의 색상 보정
  파이프라인(예: 그레이스케일/대비 강화 필터)은 포함되어 있지 않으며, 추가하려면
  `expo-gl` 또는 `@shopify/react-native-skia` 기반 이미지 필터 구현이 필요합니다
  (`src/services/` 에 필터 서비스를 추가하는 방식을 권장).
- OCR은 기기 내(온디바이스) 처리이며 언어 인식 정확도는 ML Kit의 기본 Latin 스크립트
  모델을 사용합니다. 한글 인식률이 낮다면 `@react-native-ml-kit/text-recognition`의
  스크립트 옵션(Korean 등)을 확인하세요.
- `assets/` 아래 아이콘/스플래시 이미지는 자리표시용 단색 PNG입니다. 실제 배포 전
  디자인 리소스로 교체하세요.

## 프로젝트 구조

```
src/
  types/            # ScannedPage, ScannedDocument 등 타입
  services/
    documentScanner.ts  # 네이티브 스캐너 호출
    ocr.ts               # ML Kit OCR 호출
    pdfBuilder.ts         # HTML → PDF (이미지 + 투명 텍스트 레이어)
    storage.ts             # AsyncStorage 영속화
  context/            # DocumentsContext (문서 목록 상태 관리)
  navigation/          # RootNavigator (Home/Scan/PageEditor/PdfPreview)
  screens/             # 4개 화면
  components/          # DocumentCard, PageThumbnail
```
