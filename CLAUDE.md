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

사진을 찍으면 AI 요약(+ 교과서로 판단되면 예상문제까지) PDF를 만들어주는, 토스 앱 안에서
실행되는 앱인토스(AppinToss) 미니앱입니다. Granite 프레임워크(`@granite-js/react-native`)
기반이며, 원래는 독립 Expo 앱이었다가 재개발되었습니다. 기능/화면 구성/기술 스택은
`README.md`를, 재개발 배경과 기존 Expo 버전 대비 달라진(축소된) 기능·롤백 지점은
`요구사항명세서.md`를 먼저 참고하세요.

## 코드베이스 구조

```
granite.config.ts    # 앱인토스 앱 설정(appName, 권한, 브랜드) — appName은 콘솔 등록값과 동일해야 함
pages/                # 파일 기반 라우팅. 파일 하나 = 화면 하나 (_layout.tsx는 공통 헤더)
assets/fonts/          # PDF 렌더링용 한글 서브셋 폰트 (NotoSansKR-Regular.ttf)
src/
  types/            # ScannedPage, ScannedDocument 등 타입
  services/
    pdfBuilder.ts         # pdf-lib로 원본(사진)/요약 PDF 생성 + 기기 저장(saveBase64Data)
    summaryAi.ts          # Claude API에 PDF를 직접 보내 요약 + 교과서 판단 시 예상문제 생성
    storage.ts             # 문서 목록 영속화 (앱인토스 Storage API, AsyncStorage 아님)
    apiKeyStore.ts        # Anthropic API 키 저장 (앱인토스 Storage API)
  context/            # DocumentsContext (문서 목록 상태 관리)
  components/          # PageThumbnail
  utils/               # id.ts
```

## 개발 시 참고사항

- 이 프로젝트는 Expo가 아니라 **Granite CLI**로 실행한다: `npm run dev`(`granite dev`),
  `npm run build`(`granite build`, 앱인토스 콘솔에 올릴 `.ait` 번들 생성).
- 타입 체크: `npm run typecheck` (tsc --noEmit) · 린트: `npm run lint`
- **앱인토스 SDK에는 온디바이스 OCR, 네이티브 PDF 생성, 파일 재읽기 API가 없다.**
  그래서 원본 PDF는 텍스트 레이어 없는 사진 PDF이고, AI 요약은 OCR 텍스트가 아니라
  촬영한 사진들로 만든 PDF를 Claude에 통째로 보내서 받는다(`summaryAi.ts`). 새로운
  앱인토스 API를 쓰기 전에는 반드시 실제로 설치된 패키지의 타입 정의로 존재 여부를
  확인할 것 — 개발자센터 문서가 아직 배포되지 않은 기능을 먼저 설명하는 경우가 있다
  (예: 문서에 있던 `openPDFViewer`가 실제 배포 패키지에는 없었다).
- AI 요약/예상문제 생성은 클라이언트에서 Anthropic API를 직접 호출합니다
  (`src/services/summaryAi.ts`). API 키가 없으면 `MissingApiKeyError`를 던진다.
- PDF에 한글을 그릴 때는 반드시 `assets/fonts/NotoSansKR-Regular.ttf`를 심은 폰트를
  써야 한다 — pdf-lib 내장 표준 폰트는 한글 글리프가 없다.
