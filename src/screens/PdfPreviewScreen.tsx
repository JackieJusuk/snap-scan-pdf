import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Sharing from "expo-sharing";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootNavigator";
import { useDocuments } from "@/context/DocumentsContext";
import { saveToChosenDirectory } from "@/services/pdfBuilder";

type Props = NativeStackScreenProps<RootStackParamList, "PdfPreview">;

async function shareUri(uri: string) {
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    Alert.alert("공유 불가", "이 기기에서는 공유 기능을 사용할 수 없습니다.");
    return;
  }
  await Sharing.shareAsync(uri, { mimeType: "application/pdf" });
}

async function saveUriToFolder(uri: string) {
  if (Platform.OS !== "android") {
    Alert.alert(
      "안내",
      "iOS에서는 폴더를 직접 지정하는 기능 대신, '공유/저장' 버튼의 공유 시트에서 '파일 앱에 저장'을 선택해 원하는 폴더를 고를 수 있습니다."
    );
    return;
  }

  try {
    const result = await saveToChosenDirectory(uri);
    if (result === "saved") {
      Alert.alert("저장 완료", "선택한 폴더에 PDF를 저장했습니다.");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    Alert.alert("저장 실패", message);
  }
}

function PdfActionRow({ label, uri, pending }: { label: string; uri?: string; pending?: string }) {
  return (
    <View style={styles.pdfBlock}>
      <Text style={styles.pdfBlockTitle}>{label}</Text>
      <Text style={styles.pdfBlockStatus}>
        {uri ? "✅ 생성 완료" : pending ?? "생성되지 않음"}
      </Text>
      <View style={styles.actions}>
        <Pressable
          style={[styles.button, styles.primaryButton]}
          onPress={() => uri && shareUri(uri)}
          disabled={!uri}
        >
          <Text style={styles.primaryButtonText}>공유/저장</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.secondaryButton]}
          onPress={() => uri && saveUriToFolder(uri)}
          disabled={!uri}
        >
          <Text style={styles.secondaryButtonText}>폴더 선택해서 저장</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function PdfPreviewScreen({ navigation, route }: Props) {
  const { documents, loading, updateDocument, deleteDocument } = useDocuments();
  const document = documents.find((doc) => doc.id === route.params.documentId);
  const [title, setTitle] = useState(document?.title ?? "");

  if (!document) {
    // 임시 진단용 — "문서를 찾을 수 없습니다" 재현 시 원인 파악을 위해 실제 상태를 화면에 노출한다.
    // 원인 확인되면 제거할 것.
    return (
      <View style={styles.container}>
        <Text>문서를 찾을 수 없습니다.</Text>
        <Text style={styles.debugText}>찾는 ID: {route.params.documentId}</Text>
        <Text style={styles.debugText}>{loading ? "documents 로딩 중..." : "documents 로딩 완료"}</Text>
        <Text style={styles.debugText}>저장된 문서 수: {documents.length}</Text>
        <Text style={styles.debugText}>
          저장된 ID 목록: {documents.length ? documents.map((d) => d.id).join(", ") : "(없음)"}
        </Text>
      </View>
    );
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
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <TextInput
        style={styles.titleInput}
        value={title}
        onChangeText={setTitle}
        onBlur={handleTitleBlur}
        placeholder="문서 제목"
      />
      <Text style={styles.meta}>{document.pages.length}페이지</Text>

      <PdfActionRow
        label="원본 스캔 PDF"
        uri={document.pdfUri}
        pending="PDF를 생성하는 중입니다..."
      />
      <PdfActionRow
        label="AI 요약 PDF (Claude)"
        uri={document.summaryPdfUri}
        pending="요약을 생성하지 못했습니다 (설정에서 API 키를 확인하세요)."
      />

      <Pressable style={[styles.button, styles.dangerButton]} onPress={handleDelete}>
        <Text style={styles.dangerButtonText}>문서 삭제</Text>
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
  debugText: {
    marginTop: 10,
    fontSize: 12,
    color: "#888",
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
  pdfBlock: {
    marginTop: 20,
    padding: 14,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
  },
  pdfBlockTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
  },
  pdfBlockStatus: {
    marginTop: 4,
    color: "#334155",
  },
  actions: {
    marginTop: 14,
    gap: 10,
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
  secondaryButton: {
    backgroundColor: "#fff",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#cbd5e1",
  },
  secondaryButtonText: {
    color: "#334155",
    fontWeight: "600",
    fontSize: 15,
  },
  dangerButton: {
    marginTop: 24,
    backgroundColor: "#fef2f2",
  },
  dangerButtonText: {
    color: "#dc2626",
    fontWeight: "600",
    fontSize: 15,
  },
});
