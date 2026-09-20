# CLAUDE.md

이 저장소에서 작업하는 Claude Code(또는 다른 AI 코딩 어시스턴트)를 위한 가이드입니다.

## 커뮤니케이션 규칙

- **AI가 실행한 작업에 대한 설명은 한글로 작성한다.** 사용자에게 보고하는 답변, 진행 상황
  안내, 커밋/PR 요약 등 사람이 읽는 설명은 모두 한국어를 사용한다. (코드 자체의 변수명,
  함수명 등은 기존 관례대로 영어를 유지해도 무방하다.)
- **답변에 쓰는 영어 약자나 합성어는 풀어서 설명한다.** 예를 들어 "ESLint"를 그냥 쓰지
  말고 "ESLint(ECMAScript + Lint, 자바스크립트 코드 검사 도구)"처럼 무엇의 줄임말/합성인지
  함께 설명한다. PDF, OCR 같은 이미 널리 쓰이는 약자도 처음 언급할 때 한 번은 풀어준다.
- 자세한 배경은 `요구사항명세서.md` 참고.

## 프로젝트 개요

사진을 찍으면 문서 경계 자동 인식 → 원근 보정 → OCR → 검색 가능한 PDF로 만들어주는
React Native(Expo) 앱입니다. 기능/화면 구성/기술 스택 등 전체적인 내용은 `README.md`를
먼저 참고하세요.

## 코드베이스 구조

```
src/
  types/            # ScannedPage, ScannedDocument 등 타입
  services/
    documentScanner.ts  # 네이티브 스캐너 호출
    imageEnhancer.ts     # Skia 기반 적응형 이진화 보정
    ocr.ts               # ML Kit OCR 호출
    pdfBuilder.ts         # HTML → PDF (원본 스캔 / AI 요약), 폴더 선택 저장
    summarizer.ts         # 파일 이름용 OCR 텍스트 힌트 추출 (네트워크 호출 없음)
    summaryAi.ts          # Claude API로 실제 내용 요약 + 교과서 판단 시 예상문제 생성
    pdfImport.ts           # 기존 PDF 폴더 탐색/같은 폴더에 요약 저장 (Android SAF)
    apiKeyStore.ts        # Anthropic API 키 SecureStore 저장
    storage.ts             # AsyncStorage 영속화
  context/            # DocumentsContext (문서 목록 상태 관리)
  navigation/          # RootNavigator
  screens/             # 화면 컴포넌트
  components/          # DocumentCard, PageThumbnail
```

## 개발 시 참고사항

- 이 앱은 카메라·OCR용 네이티브 모듈을 사용하므로 **Expo Go로는 실행할 수 없습니다.**
  `npx expo prebuild` 후 `npx expo run:android`/`run:ios`로 실행합니다.
- 타입 체크: `npm run typecheck` (tsc --noEmit)
- 린트: `npm run lint` (eslint-config-expo 기반)
- AI 요약/예상문제 생성은 클라이언트에서 Anthropic API를 직접 호출합니다
  (`src/services/summaryAi.ts`). API 키가 없으면 `MissingApiKeyError`를 던지며, 이 실패는
  원본 스캔 PDF 생성 자체를 막지 않도록 항상 별도로 try/catch 처리되어 있습니다.
