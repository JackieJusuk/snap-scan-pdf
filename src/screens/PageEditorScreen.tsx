import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootNavigator";
import { ScannedPage } from "@/types";
import { useDocuments } from "@/context/DocumentsContext";
import { recognizeAllPages } from "@/services/ocr";
import { buildSearchablePdf, buildSummaryPdf, persistPdf } from "@/services/pdfBuilder";
import { deriveDocumentTitle, summarizePagesForFileName } from "@/services/summarizer";
import { summarizeDocumentWithAi } from "@/services/summaryAi";
import PageThumbnail from "@/components/PageThumbnail";

type Props = NativeStackScreenProps<RootStackParamList, "PageEditor">;

export default function PageEditorScreen({ navigation, route }: Props) {
  const [pages, setPages] = useState<ScannedPage[]>(route.params.draftPages);
  const [processing, setProcessing] = useState(false);
  const { createDocument, updateDocument } = useDocuments();

  function movePage(index: number, direction: -1 | 1) {
    const next = [...pages];
    const target = index + direction;
    [next[index], next[target]] = [next[target], next[index]];
    setPages(next);
  }

  function deletePage(index: number) {
    setPages(pages.filter((_, i) => i !== index));
  }

  async function handleCreatePdf() {
    if (pages.length === 0) {
      Alert.alert("페이지 없음", "최소 한 페이지를 촬영해주세요.");
      return;
    }

    setProcessing(true);
    try {
      const pagesWithText = await recognizeAllPages(pages);
      const fallbackTitle = `문서 ${new Date().toLocaleString("ko-KR")}`;
      const title = deriveDocumentTitle(pagesWithText, fallbackTitle);
      const doc = await createDocument(title, pagesWithText);

      // 파일 이름 자체에서 내용을 짐작할 수 있도록 OCR 텍스트 앞부분을 힌트로 쓰고,
      // 동일한 힌트가 나올 수 있는 경우를 대비해 문서 ID 일부로 충돌을 방지한다.
      const nameHint = summarizePagesForFileName(pagesWithText, title);
      const idSuffix = doc.id.slice(0, 6);

      const tempPdfUri = await buildSearchablePdf(pagesWithText);
      const finalPdfUri = await persistPdf(tempPdfUri, `${nameHint}_${idSuffix}`);
      await updateDocument(doc.id, { pdfUri: finalPdfUri });

      // AI 요약 PDF는 별도 산출물이라 실패하더라도(키 미설정, 네트워크 오류 등) 원본
      // 스캔 PDF 생성 자체는 막지 않는다.
      try {
        const aiResult = await summarizeDocumentWithAi(pagesWithText);
        const tempSummaryPdfUri = await buildSummaryPdf(aiResult, title);
        const finalSummaryPdfUri = await persistPdf(
          tempSummaryPdfUri,
          `${nameHint}_summary_${idSuffix}`
        );
        await updateDocument(doc.id, { summaryPdfUri: finalSummaryPdfUri });
      } catch (summaryError) {
        const message =
          summaryError instanceof Error ? summaryError.message : String(summaryError);
        Alert.alert("AI 요약 PDF 생성 건너뜀", message);
      }

      navigation.reset({
        index: 1,
        routes: [{ name: "Home" }, { name: "PdfPreview", params: { documentId: doc.id } }],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert("PDF 생성 실패", message);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView horizontal style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {pages.map((page, index) => (
          <PageThumbnail
            key={page.id}
            page={page}
            index={index}
            onDelete={() => deletePage(index)}
            onMoveUp={index > 0 ? () => movePage(index, -1) : undefined}
            onMoveDown={index < pages.length - 1 ? () => movePage(index, 1) : undefined}
          />
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.button, styles.secondaryButton]}
          onPress={() => navigation.navigate("Scan", { draftPages: pages })}
          disabled={processing}
        >
          <Text style={styles.secondaryButtonText}>페이지 추가</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.primaryButton]}
          onPress={handleCreatePdf}
          disabled={processing}
        >
          {processing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>PDF 생성</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  footer: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e0e0e0",
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButton: {
    backgroundColor: "#2563eb",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  secondaryButton: {
    backgroundColor: "#f1f5f9",
  },
  secondaryButtonText: {
    color: "#334155",
    fontWeight: "600",
    fontSize: 15,
  },
});
