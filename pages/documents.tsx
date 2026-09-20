import React, { useState } from "react";
import { Alert, FlatList, StyleSheet, Text, View } from "react-native";
import { createRoute } from "@granite-js/react-native";
import { useDocuments } from "@/context/DocumentsContext";
import { buildSummaryPdfBase64, savePdfToDevice } from "@/services/pdfBuilder";
import { ScannedDocument } from "@/types";

export const Route = createRoute("/documents", {
  validateParams: (params) => params,
  component: DocumentsPage,
});

function DocumentsPage() {
  const { documents, loading, deleteDocument } = useDocuments();
  const [savingId, setSavingId] = useState<string | null>(null);

  async function handleResave(doc: ScannedDocument) {
    setSavingId(doc.id);
    try {
      const base64 = await buildSummaryPdfBase64({ summary: doc.summary, questions: doc.questions }, doc.title);
      await savePdfToDevice(base64, `${doc.title}_요약.pdf`);
      Alert.alert("저장 완료", "요약 PDF를 기기에 다시 저장했어요.");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert("저장 실패", message);
    } finally {
      setSavingId(null);
    }
  }

  function handleDelete(doc: ScannedDocument) {
    Alert.alert("문서 삭제", `"${doc.title}"을(를) 목록에서 삭제할까요? (기기에 저장된 PDF 파일은 남아 있어요)`, [
      { text: "취소", style: "cancel" },
      { text: "삭제", style: "destructive", onPress: () => deleteDocument(doc.id) },
    ]);
  }

  if (!loading && documents.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>아직 저장된 문서가 없습니다.</Text>
        <Text style={styles.emptySubText}>홈 화면에서 촬영하고 첫 문서를 만들어보세요.</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={documents}
      keyExtractor={(doc) => doc.id}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.meta}>
            {new Date(item.updatedAt).toLocaleDateString("ko-KR")}
            {item.questions ? " · 예상문제 포함" : ""}
          </Text>
          <Text style={styles.summaryPreview} numberOfLines={2}>
            {item.summary}
          </Text>
          <View style={styles.actions}>
            <Text style={styles.actionButton} onPress={() => handleResave(item)}>
              {savingId === item.id ? "저장 중…" : "요약 PDF 다시 저장"}
            </Text>
            <Text style={[styles.actionButton, styles.deleteButton]} onPress={() => handleDelete(item)}>
              삭제
            </Text>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  emptySubText: {
    marginTop: 6,
    fontSize: 13,
    color: "#888",
  },
  card: {
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
  meta: {
    marginTop: 4,
    fontSize: 12,
    color: "#888",
  },
  summaryPreview: {
    marginTop: 8,
    fontSize: 13,
    color: "#555",
    lineHeight: 18,
  },
  actions: {
    flexDirection: "row",
    gap: 20,
    marginTop: 12,
  },
  actionButton: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563eb",
  },
  deleteButton: {
    color: "#dc2626",
  },
});
