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
- **저장/공유**: 생성된 PDF는 기기에 저장되며, 카카오톡/이메일/파일 앱 등으로 바로 공유하거나
  (Android) 폴더 선택 다이얼로그로 원하는 위치에 직접 저장할 수 있습니다.
- **AI 요약 PDF**: 스캔 직후 OCR 텍스트를 Claude API로 보내 핵심 내용을 요약한 별도의 PDF를
  함께 생성합니다(원본 스캔 PDF와는 독립된 파일). 설정 화면에서 Anthropic API 키를 등록해야
  동작하며, 키가 없거나 요청이 실패해도 원본 스캔 PDF 생성 자체는 계속 진행됩니다.
- **기존 PDF 요약(가져오기)**: 카메라로 찍지 않고 이미 가지고 있는 PDF도 요약할 수 있습니다.
  Android는 폴더를 선택하면 그 안의 PDF 목록을 보여주고, 고른 파일을 Claude에 그대로
  보내(별도 텍스트 추출 없이 PDF 자체를 이해) 요약한 뒤 **원본과 같은 폴더**에
  `파일명_summary.pdf`로 저장합니다. iOS는 폴더 접근 API가 없어 파일 선택 후 공유
  시트로 저장 위치를 직접 고르도록 안내합니다.

## 기술 스택

- Expo (React Native, TypeScript)
- `react-native-document-scanner-plugin` — 문서 경계 인식 + 원근 보정 (iOS: VisionKit,
  Android: OpenCV 기반)
- `@react-native-ml-kit/text-recognition` — 온디바이스 OCR
- `expo-print` — HTML → PDF 렌더링(페이지별 이미지 + 투명 텍스트 레이어 오버레이)
- `expo-sharing`, `expo-file-system` — 저장 및 공유 (Android는 Storage Access Framework로
  폴더 선택 저장도 지원)
- `expo-secure-store` — Anthropic API 키를 기기에 안전하게 저장
- `expo-document-picker` — (iOS) 기존 PDF 파일 선택
- `@react-navigation` — 화면 전환
- `@react-native-async-storage/async-storage` — 문서 목록 로컬 저장
- Anthropic Messages API (`fetch` 직접 호출) — OCR 텍스트를 요약해 별도 PDF 생성

## 화면 구성

1. **홈(Home)** — 화면 제목 "Scan-PDF-Summary". 3개 메뉴만 제공: "① 기존 PDF 요약",
   "② 촬영해서 PDF+요약 만들기", "③ 기존 작업내용". 우측 상단 "설정"(API 키 등록)
2. **촬영(Scan)** — 네이티브 스캐너 실행, 촬영 즉시 편집 화면으로 이동
3. **페이지 편집(PageEditor)** — 페이지 순서 변경/삭제/추가, "PDF 생성" 실행(OCR → PDF 빌드,
   OCR 텍스트 첫 줄로 문서 제목 자동 생성)
4. **PDF(PdfPreview)** — 제목 수정, 원본/AI 요약 PDF 각각 공유·폴더 저장, 삭제
5. **설정(Settings)** — Anthropic API 키 등록/삭제
6. **기존 PDF 요약(ImportSummary)** — 카메라 없이 기존 PDF를 골라 AI 요약 PDF 생성
   (로컬 폴더 탐색 또는 Google Drive 등 클라우드 파일 선택)
7. **기존 작업내용(MyDocuments)** — 지금까지 촬영/생성한 문서 목록 (예전 홈 화면의 목록)

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

- **문서 스캔 모드 보정**: `@shopify/react-native-skia` 기반의 `src/services/imageEnhancer.ts`가
  흑백 변환 후 지역 평균(블러) 대비 밝기를 비교하는 적응형 이진화 방식으로 종이
  그림자·구겨짐 얼룩을 줄이고 글씨 가독성을 높입니다. `GAIN`/`BLUR_RADIUS_RATIO`
  상수는 실제 스캔본을 보면서 조정이 필요할 수 있습니다.
- OCR은 기기 내(온디바이스) 처리이며 언어 인식 정확도는 ML Kit의 기본 Latin 스크립트
  모델을 사용합니다. 한글 인식률이 낮다면 `@react-native-ml-kit/text-recognition`의
  스크립트 옵션(Korean 등)을 확인하세요.
- `assets/` 아래 아이콘/스플래시 이미지는 자리표시용 단색 PNG입니다. 실제 배포 전
  디자인 리소스로 교체하세요.
- **AI 요약은 클라이언트에서 Anthropic API를 직접 호출**합니다. 별도 백엔드 프록시가
  없으므로, 앱을 여러 사람에게 배포할 계획이라면 API 키가 클라이언트에 저장된다는 점을
  감안해 프록시 서버를 두는 구조로 바꾸는 것을 권장합니다(개인 사용 목적에서는 기기별
  `expo-secure-store` 저장으로 충분합니다).

## 프로젝트 구조

```
src/
  types/            # ScannedPage, ScannedDocument 등 타입
  services/
    documentScanner.ts  # 네이티브 스캐너 호출
    imageEnhancer.ts     # Skia 기반 적응형 이진화 보정
    ocr.ts               # ML Kit OCR 호출
    pdfBuilder.ts         # HTML → PDF (원본 스캔 / AI 요약), 폴더 선택 저장
    summarizer.ts         # 파일 이름용 OCR 텍스트 힌트 추출
    summaryAi.ts          # Claude API로 실제 내용 요약 (텍스트/PDF 문서 둘 다 지원)
    pdfImport.ts           # 기존 PDF 폴더 탐색/같은 폴더에 요약 저장 (Android SAF)
    apiKeyStore.ts        # Anthropic API 키 SecureStore 저장
    storage.ts             # AsyncStorage 영속화
  context/            # DocumentsContext (문서 목록 상태 관리)
  navigation/          # RootNavigator (Home/Scan/PageEditor/PdfPreview/Settings/ImportSummary/MyDocuments)
  screens/             # 7개 화면
  components/          # DocumentCard, PageThumbnail
```
