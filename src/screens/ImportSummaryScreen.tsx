import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as FileSystem from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import { buildSummaryPdf } from "@/services/pdfBuilder";
import { summarizePdfDocumentWithAi } from "@/services/summaryAi";
import {
  PickedPdfFile,
  listPdfFilesInDirectory,
  pickPdfDirectory,
  saveSummaryNextToOriginal,
} from "@/services/pdfImport";

async function readAsBase64(uri: string): Promise<string> {
  return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
}

export default function ImportSummaryScreen() {
  const [directoryUri, setDirectoryUri] = useState<string | null>(null);
  const [files, setFiles] = useState<PickedPdfFile[]>([]);
  const [busyName, setBusyName] = useState<string | null>(null);

  async function handlePickFolder() {
    const uri = await pickPdfDirectory();
    if (!uri) return;
    setDirectoryUri(uri);
    try {
      const found = await listPdfFilesInDirectory(uri);
      setFiles(found);
      if (found.length === 0) {
        Alert.alert("PDF 없음", "선택한 폴더에서 PDF 파일을 찾지 못했습니다.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert("폴더 읽기 실패", message);
    }
  }

  async function handleSummarizeAndroid(file: PickedPdfFile) {
    if (!directoryUri) return;
    setBusyName(file.name);
    try {
      const base64 = await readAsBase64(file.uri);
      const summaryText = await summarizePdfDocumentWithAi(base64);
      const tempSummaryUri = await buildSummaryPdf(summaryText, file.name.replace(/\.pdf$/i, ""));
      await saveSummaryNextToOriginal(directoryUri, file.name, tempSummaryUri);
      Alert.alert("요약 완료", `"${file.name}"과 같은 폴더에 요약 PDF를 저장했습니다.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert("요약 실패", message);
    } finally {
      setBusyName(null);
    }
  }

  async function handlePickAndSummarizeIOS() {
    const result = await DocumentPicker.getDocumentAsync({ type: "application/pdf" });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];

    setBusyName(asset.name);
    try {
      const base64 = await readAsBase64(asset.uri);
      const summaryText = await summarizePdfDocumentWithAi(base64);
      const tempSummaryUri = await buildSummaryPdf(summaryText, asset.name.replace(/\.pdf$/i, ""));

      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert("공유 불가", "이 기기에서는 공유 기능을 사용할 수 없습니다.");
        return;
      }
      await Sharing.shareAsync(tempSummaryUri, { mimeType: "application/pdf" });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert("요약 실패", message);
    } finally {
      setBusyName(null);
    }
  }

  if (Platform.OS !== "android") {
    return (
      <View style={styles.container}>
        <Text style={styles.helpText}>
          iOS는 폴더를 직접 지정하는 기능이 없어서, PDF를 선택하면 요약 PDF를 공유
          시트로 보여드립니다. "파일 앱에 저장"을 눌러 원본과 같은 폴더에 직접
          저장해주세요.
        </Text>
        <Pressable
          style={[styles.button, styles.primaryButton]}
          onPress={handlePickAndSummarizeIOS}
          disabled={!!busyName}
        >
          {busyName ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>PDF 선택해서 요약</Text>
          )}
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.helpText}>
        폴더를 선택하면 그 안의 PDF 목록을 보여줍니다. 요약할 PDF를 고르면, 같은
        폴더에 "파일명_summary.pdf"로 AI 요약 PDF를 저장합니다.
      </Text>
      <Pressable style={[styles.button, styles.primaryButton]} onPress={handlePickFolder}>
        <Text style={styles.primaryButtonText}>
          {directoryUri ? "다른 폴더 선택" : "폴더 선택"}
        </Text>
      </Pressable>

      <FlatList
        style={styles.list}
        data={files}
        keyExtractor={(item) => item.uri}
        renderItem={({ item }) => (
          <Pressable
            style={styles.fileRow}
            onPress={() => handleSummarizeAndroid(item)}
            disabled={!!busyName}
          >
            <Text style={styles.fileName} numberOfLines={1}>
              {item.name}
            </Text>
            {busyName === item.name ? (
              <ActivityIndicator />
            ) : (
              <Text style={styles.fileAction}>요약하기</Text>
            )}
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
  },
  helpText: {
    fontSize: 13,
    color: "#777",
    lineHeight: 18,
    marginBottom: 16,
  },
  list: {
    marginTop: 20,
  },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
  },
  fileName: {
    flex: 1,
    marginRight: 12,
    fontSize: 14,
    color: "#111",
  },
  fileAction: {
    color: "#2563eb",
    fontWeight: "600",
    fontSize: 13,
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
});
