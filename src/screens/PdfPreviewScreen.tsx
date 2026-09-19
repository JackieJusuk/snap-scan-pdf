import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import * as Sharing from "expo-sharing";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootNavigator";
import { useDocuments } from "@/context/DocumentsContext";

type Props = NativeStackScreenProps<RootStackParamList, "PdfPreview">;

export default function PdfPreviewScreen({ navigation, route }: Props) {
  const { documents, updateDocument, deleteDocument } = useDocuments();
  const document = documents.find((doc) => doc.id === route.params.documentId);
  const [title, setTitle] = useState(document?.title ?? "");

  if (!document) {
    return (
      <View style={styles.container}>
        <Text>문서를 찾을 수 없습니다.</Text>
      </View>
    );
  }

  async function handleShare() {
    if (!document?.pdfUri) return;
    const available = await Sharing.isAvailableAsync();
    if (!available) {
      Alert.alert("공유 불가", "이 기기에서는 공유 기능을 사용할 수 없습니다.");
      return;
    }
    await Sharing.shareAsync(document.pdfUri, { mimeType: "application/pdf" });
  }

  function handleTitleBlur() {
    if (document && title.trim() && title !== document.title) {
      updateDocument(document.id, { title: title.trim() });
    }
  }

  function handleDelete() {
    if (!document) return;
    Alert.alert("문서 삭제", "이 문서를 삭제할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          await deleteDocument(document.id);
          navigation.popToTop();
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.titleInput}
        value={title}
        onChangeText={setTitle}
        onBlur={handleTitleBlur}
        placeholder="문서 제목"
      />
      <Text style={styles.meta}>{document.pages.length}페이지</Text>

      <View style={styles.status}>
        <Text style={styles.statusText}>
          {document.pdfUri ? "✅ PDF 생성 완료 (텍스트 검색 가능)" : "PDF를 생성하는 중입니다..."}
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={[styles.button, styles.primaryButton]}
          onPress={handleShare}
          disabled={!document.pdfUri}
        >
          <Text style={styles.primaryButtonText}>PDF 공유/저장</Text>
        </Pressable>
        <Pressable style={[styles.button, styles.dangerButton]} onPress={handleDelete}>
          <Text style={styles.dangerButtonText}>문서 삭제</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
  },
  titleInput: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ccc",
  },
  meta: {
    marginTop: 8,
    color: "#777",
  },
  status: {
    marginTop: 24,
    padding: 14,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
  },
  statusText: {
    color: "#334155",
  },
  actions: {
    marginTop: "auto",
    gap: 12,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: "#2563eb",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  dangerButton: {
    backgroundColor: "#fef2f2",
  },
  dangerButtonText: {
    color: "#dc2626",
    fontWeight: "600",
    fontSize: 15,
  },
});
