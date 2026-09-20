import React, { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { createRoute, useNavigation } from "@granite-js/react-native";
import { openCamera, OpenCameraPermissionError } from "@apps-in-toss/framework";
import { ScannedPage } from "@/types";
import { generateId } from "@/utils/id";
import { useDocuments } from "@/context/DocumentsContext";
import { buildScanPdfBase64, buildSummaryPdfBase64, savePdfToDevice } from "@/services/pdfBuilder";
import { MissingApiKeyError, summarizePdfDocumentWithAi } from "@/services/summaryAi";
import PageThumbnail from "@/components/PageThumbnail";

export const Route = createRoute("/scan", {
  validateParams: (params) => params,
  component: ScanPage,
});

function defaultTitle(): string {
  const now = new Date();
  return `스캔 문서 ${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function ScanPage() {
  const navigation = useNavigation();
  const { createDocument } = useDocuments();
  const [pages, setPages] = useState<ScannedPage[]>([]);
  const [title, setTitle] = useState(defaultTitle());
  const [busy, setBusy] = useState(false);

  async function handleCapture() {
    try {
      const response = await openCamera({ base64: true, maxWidth: 1600 });
      setPages((prev) => [...prev, { id: generateId(), dataUri: response.dataUri }]);
    } catch (error) {
      if (error instanceof OpenCameraPermissionError) {
        Alert.alert("카메라 권한 필요", "설정에서 카메라 권한을 허용해주세요.");
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert("촬영 실패", message);
    }
  }

  function handleRemovePage(id: string) {
    setPages((prev) => prev.filter((page) => page.id !== id));
  }

  async function handleCreateSummary() {
    if (pages.length === 0) return;
    setBusy(true);
    try {
      const scanPdfBase64 = await buildScanPdfBase64(pages);
      const result = await summarizePdfDocumentWithAi(scanPdfBase64);
      const summaryPdfBase64 = await buildSummaryPdfBase64(result, title);

      const fileBaseName = title.trim() || defaultTitle();
      await savePdfToDevice(scanPdfBase64, `${fileBaseName}_원본.pdf`);
      await savePdfToDevice(summaryPdfBase64, `${fileBaseName}_요약.pdf`);
      await createDocument(fileBaseName, result.summary, result.questions);

      Alert.alert(
        "완료",
        `기기에 PDF 2개를 저장했어요.${result.questions ? "\n(교과서로 판단되어 예상문제 포함)" : ""}`,
        [{ text: "확인", onPress: () => navigation.navigate("/documents") }]
      );
    } catch (error) {
      if (error instanceof MissingApiKeyError) {
        Alert.alert("API 키 필요", error.message, [
          { text: "취소", style: "cancel" },
          { text: "설정으로 이동", onPress: () => navigation.navigate("/settings") },
        ]);
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert("요약 실패", message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {busy && (
        <View style={styles.progressBanner}>
          <ActivityIndicator />
          <Text style={styles.progressText}>AI 요약을 만드는 중…</Text>
        </View>
      )}

      <Text style={styles.label}>문서 제목</Text>
      <TextInput style={styles.titleInput} value={title} onChangeText={setTitle} editable={!busy} />

      <Pressable style={[styles.button, styles.primaryButton]} onPress={handleCapture} disabled={busy}>
        <Text style={styles.primaryButtonText}>{pages.length === 0 ? "촬영하기" : "한 장 더 촬영하기"}</Text>
      </Pressable>

      {pages.length > 0 && (
        <ScrollView horizontal style={styles.thumbnailRow} showsHorizontalScrollIndicator={false}>
          {pages.map((page, index) => (
            <PageThumbnail key={page.id} page={page} index={index} onDelete={() => handleRemovePage(page.id)} />
          ))}
        </ScrollView>
      )}

      <Pressable
        style={[styles.button, styles.secondaryButton, (pages.length === 0 || busy) && styles.buttonDisabled]}
        onPress={handleCreateSummary}
        disabled={pages.length === 0 || busy}
      >
        <Text style={styles.secondaryButtonText}>AI 요약 PDF 만들기 ({pages.length}장)</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    padding: 20,
  },
  progressBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#eff6ff",
    marginBottom: 16,
  },
  progressText: {
    color: "#1d4ed8",
    fontWeight: "600",
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555",
    marginBottom: 6,
  },
  titleInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ccc",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 16,
  },
  thumbnailRow: {
    marginVertical: 16,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.5,
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
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#cbd5e1",
  },
  secondaryButtonText: {
    color: "#111",
    fontWeight: "700",
    fontSize: 15,
  },
});
