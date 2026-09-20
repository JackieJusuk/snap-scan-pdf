/** 카메라로 촬영한 한 페이지. dataUri는 Base64로 인코딩된 JPEG 원본 데이터다. */
export interface ScannedPage {
  id: string;
  dataUri: string;
}

/**
 * 앱인토스 환경에는 로컬 파일을 나중에 다시 읽어올 수 있는 API가 없어서(저장은
 * saveBase64Data로 기기에 내려주는 것으로 끝난다), 문서 목록에는 원본 이미지나 PDF
 * 파일 자체가 아니라 AI가 만든 요약/예상문제 텍스트만 영구 보관한다. PDF는 목록
 * 화면에서 "다시 PDF로 저장"을 누를 때마다 이 텍스트로 즉석에서 다시 만든다.
 */
export interface ScannedDocument {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  summary: string;
  /** 교과서/학습자료로 판단되어 예상문제가 생성된 경우에만 값이 있다. */
  questions: string | null;
}
