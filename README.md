# 스캔 PDF 요약 (앱인토스 미니앱)

사진을 찍으면 **AI 요약(+ 교과서로 판단되면 예상문제까지) PDF**를 만들어주는, 토스 앱
안에서 실행되는 미니앱(앱인토스, AppinToss)입니다. `@granite-js/react-native` +
`@apps-in-toss/framework` 기반으로 만들어졌습니다.

> 이 프로젝트는 원래 독립 실행형 Expo(React Native) 앱이었다가, 앱인토스 미니앱으로
> 재개발되었습니다. 재개발 배경과 기존 버전 대비 달라진(축소된) 기능은
> `요구사항명세서.md`의 "앱인토스 전환 현황"을 참고하세요. 이전 Expo 버전으로 되돌아가야
> 한다면 같은 문서의 "버전 관리(롤백 지점)" 항목의 커밋으로 체크아웃하면 됩니다.

## 주요 기능

- **촬영**: 앱인토스 `openCamera` API로 문서를 여러 장 연속 촬영합니다. (문서 경계
  자동 인식/원근 보정은 지원되지 않아 사진을 그대로 사용합니다.)
- **AI 요약 + 예상문제**: 촬영한 사진들로 PDF를 만들어 Claude API에 그대로 보내면,
  Claude가 PDF를 직접 읽고 핵심 내용을 요약합니다. 교과서/참고서/강의자료처럼
  학습용 문서로 판단되면 예상문제(정답 포함)도 함께 만들어 같은 PDF에 담습니다.
- **저장**: 완성된 PDF(원본 사진 PDF + AI 요약 PDF)는 `saveBase64Data`로 기기에
  저장됩니다.
- **작업 목록**: 만들어진 요약/예상문제 텍스트는 기기 로컬 저장소(`Storage`)에 남아,
  다음에 목록에서 다시 PDF로 저장할 수 있습니다.

## 기술 스택

- **Granite** (`@granite-js/react-native`) — 앱인토스의 React Native 프레임워크.
  파일 기반 라우팅(`pages/`), `granite dev`/`granite build` 툴체인을 제공합니다.
- **`@apps-in-toss/framework`** — 카메라(`openCamera`), 파일 저장(`saveBase64Data`),
  로컬 저장소(`Storage`), 외부 링크 열기(`openURL`) 등 앱인토스 SDK.
- **`pdf-lib` + `@pdf-lib/fontkit`** — 기기 안에서 직접 PDF를 생성합니다(네이티브 PDF
  생성 API가 없어서). 한글 렌더링을 위해 한글 서브셋 폰트(`assets/fonts/NotoSansKR-Regular.ttf`)를
  함께 심습니다.
- **Anthropic Messages API** (`fetch` 직접 호출) — 촬영한 문서 PDF를 요약/예상문제로
  변환합니다 (`src/services/summaryAi.ts`).

## 화면 구성 (파일 기반 라우팅)

| 경로 | 화면 |
| --- | --- |
| `pages/index.tsx` | 홈 — "촬영해서 요약" / "기존 작업내용" 메뉴 |
| `pages/scan.tsx` | 촬영 → AI 요약/예상문제 생성 → PDF 저장 |
| `pages/documents.tsx` | 저장된 요약/예상문제 목록, "다시 PDF로 저장", 삭제 |
| `pages/settings.tsx` | Anthropic API 키 등록/삭제 |
| `pages/_layout.tsx` | 모든 화면 공통 헤더(뒤로가기 · 설정 버튼) |

## 설치 및 실행

```bash
npm install

# 개발 서버 실행 (샌드박스 앱에서 QR/스킴으로 접속해 확인)
npm run dev

# 앱인토스 콘솔에 업로드할 .ait 번들 빌드
npm run build

# 타입 체크 / 린트
npm run typecheck
npm run lint
```

이 저장소는 `npx expo ...` 같은 Expo 명령이 아니라 **Granite CLI**(`granite dev` /
`granite build`, 위 스크립트에 이미 연결돼 있음)로 실행합니다. 앱인토스 콘솔에 앱을
등록하고 배포하는 방법은 앱인토스 개발자센터(https://developers-apps-in-toss.toss.im)를
참고하세요 — `granite.config.ts`의 `appName`은 콘솔에 등록한 앱 이름과 반드시
동일해야 합니다.

## 알려진 제한 사항

- **AI 요약은 클라이언트에서 Anthropic API를 직접 호출**합니다. API 키는 기기 로컬
  저장소(`Storage`)에 저장되며, `expo-secure-store` 같은 하드웨어 보안 저장소가
  아닙니다.
- **검색 가능한 원본 PDF가 아닙니다.** 온디바이스 OCR API가 없어서, 원본 PDF는 촬영한
  사진을 그대로 담은(텍스트 레이어 없는) PDF입니다.
- **문서 목록에서 원본 PDF는 다시 저장할 수 없습니다.** 앱인토스에는 저장한 파일을
  다시 읽어오는 API가 없어서, 목록에는 AI 요약/예상문제 텍스트만 남기고 그 텍스트로
  요약 PDF만 다시 만들 수 있습니다. 원본 PDF는 촬영 직후에만 저장할 수 있습니다.
- **기존 PDF를 가져와 요약하는 기능은 없습니다.** 이전 Expo 버전에는 있었지만, 앱인토스
  SDK에서 폴더/파일 선택 API가 확인되지 않아 이번 재개발 범위에서 제외했습니다.
- 자세한 배경과 기존 Expo 버전 대비 달라진 점은 `요구사항명세서.md`를 참고하세요.

## 프로젝트 구조

```
granite.config.ts     # 앱인토스 앱 설정(appName, 권한, 브랜드)
index.ts              # 엔트리 포인트
pages/                 # 파일 기반 라우팅 (각 파일이 화면 하나)
assets/fonts/          # PDF 렌더링용 한글 서브셋 폰트
src/
  types/               # ScannedPage, ScannedDocument
  services/
    pdfBuilder.ts       # pdf-lib로 원본/요약 PDF 생성, 기기 저장
    summaryAi.ts         # Claude API로 PDF 요약 + 예상문제 생성
    storage.ts            # 문서 목록 영속화 (앱인토스 Storage)
    apiKeyStore.ts         # Anthropic API 키 저장 (앱인토스 Storage)
  context/             # DocumentsContext (문서 목록 상태 관리)
  components/          # PageThumbnail
  utils/               # id.ts (문서 ID 생성)
```
