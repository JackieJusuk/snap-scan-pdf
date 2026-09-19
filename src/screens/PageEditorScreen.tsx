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
import { buildSearchablePdf, persistPdf } from "@/services/pdfBuilder";
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
      const title = `문서 ${new Date().toLocaleString("ko-KR")}`;
      const doc = await createDocument(title, pagesWithText);

      const tempPdfUri = await buildSearchablePdf(pagesWithText);
      const finalPdfUri = await persistPdf(tempPdfUri, doc.id);
      await updateDocument(doc.id, { pdfUri: finalPdfUri });

      navigation.reset({
        index: 1,
        routes: [{ name: "Home" }, { name: "PdfPreview", params: { documentId: doc.id } }],
      });
    } catch (error) {
      Alert.alert("PDF 생성 실패", "문서를 만드는 중 오류가 발생했습니다. 다시 시도해주세요.");
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
