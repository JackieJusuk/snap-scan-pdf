import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as FileSystem from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import { buildSummaryPdf, saveToChosenDirectory } from "@/services/pdfBuilder";
import { summarizePdfDocumentWithAi } from "@/services/summaryAi";
import {
  PickedPdfFile,
  listPdfFilesInDirectory,
  pickPdfDirectory,
  saveSummaryNextToOriginal,
} from "@/services/pdfImport";

interface SummaryResult {
  uri: string;
  sourceName: string;
}

async function readAsBase64(uri: string): Promise<string> {
  return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
}

export default function ImportSummaryScreen() {
  // Android "폴더에서 선택" 흐름 — 같은 폴더에 자동 저장까지 가능하다.
  const [directoryUri, setDirectoryUri] = useState<string | null>(null);
  const [files, setFiles] = useState<PickedPdfFile[]>([]);
  const [busyName, setBusyName] = useState<string | null>(null);

  // "파일에서 직접 선택" 흐름 — Google Drive/Dropbox 등 클라우드 포함, 두 플랫폼 공용.
  // 클라우드 소스는 원본 폴더에 자동 쓰기 권한이 없는 경우가 많아, 완료 후 공유/폴더
  // 선택 저장 중 하나를 사용자가 직접 고르게 한다.
  const [result, setResult] = useState<SummaryResult | null>(null);

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

  async function handleSummarizeInFolder(file: PickedPdfFile) {
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

  async function handlePickFile() {
    const pickResult = await DocumentPicker.getDocumentAsync({ type: "application/pdf" });
    if (pickResult.canceled || !pickResult.assets?.[0]) return;
    const asset = pickResult.assets[0];

    setResult(null);
    setBusyName(asset.name);
    try {
      const base64 = await readAsBase64(asset.uri);
      const summaryText = await summarizePdfDocumentWithAi(base64);
      const tempSummaryUri = await buildSummaryPdf(summaryText, asset.name.replace(/\.pdf$/i, ""));
      setResult({ uri: tempSummaryUri, sourceName: asset.name });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert("요약 실패", message);
    } finally {
      setBusyName(null);
    }
  }

  async function handleShareResult() {
    if (!result) return;
    const available = await Sharing.isAvailableAsync();
    if (!available) {
      Alert.alert("공유 불가", "이 기기에서는 공유 기능을 사용할 수 없습니다.");
      return;
    }
    await Sharing.shareAsync(result.uri, { mimeType: "application/pdf" });
  }

  async function handleSaveResultToFolder() {
    if (!result) return;
    try {
      const outcome = await saveToChosenDirectory(result.uri);
      if (outcome === "saved") {
        Alert.alert("저장 완료", "선택한 폴더에 요약 PDF를 저장했습니다.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert("저장 실패", message);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {Platform.OS === "android" && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>폴더에서 선택 (같은 폴더에 자동 저장)</Text>
          <Text style={styles.helpText}>
            휴대폰/저장소의 폴더를 고르면 그 안의 PDF 목록을 보여줍니다. 하나를 고르면
            같은 폴더에 "파일명_summary.pdf"로 자동 저장됩니다.
          </Text>
          <Pressable style={[styles.button, styles.secondaryButton]} onPress={handlePickFolder}>
            <Text style={styles.secondaryButtonText}>
              {directoryUri ? "다른 폴더 선택" : "폴더 선택"}
            </Text>
          </Pressable>

          {files.map((item) => (
            <Pressable
              key={item.uri}
              style={styles.fileRow}
              onPress={() => handleSummarizeInFolder(item)}
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
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>파일에서 직접 선택 (Google Drive, Dropbox 등)</Text>
        <Text style={styles.helpText}>
          기기에 연결된 Google Drive 등 클라우드에 있는 PDF도 고를 수 있습니다. 클라우드
          파일은 원래 위치에 자동 저장할 권한이 없는 경우가 많아, 요약이 끝나면
          공유하거나 저장할 폴더를 직접 골라주세요.
        </Text>
        <Pressable
          style={[styles.button, styles.primaryButton]}
          onPress={handlePickFile}
          disabled={!!busyName}
        >
          {busyName ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>PDF 파일 선택</Text>
          )}
        </Pressable>

        {result && (
          <View style={styles.resultBlock}>
            <Text style={styles.resultText}>"{result.sourceName}" 요약이 준비됐습니다.</Text>
            <View style={styles.resultActions}>
              <Pressable style={[styles.button, styles.primaryButton]} onPress={handleShareResult}>
                <Text style={styles.primaryButtonText}>공유/저장</Text>
              </Pressable>
              {Platform.OS === "android" && (
                <Pressable
                  style={[styles.button, styles.secondaryButton]}
                  onPress={handleSaveResultToFolder}
                >
                  <Text style={styles.secondaryButtonText}>폴더 선택해서 저장</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}
      </View>
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
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
    marginBottom: 6,
  },
  helpText: {
    fontSize: 13,
    color: "#777",
    lineHeight: 18,
    marginBottom: 16,
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
  resultBlock: {
    marginTop: 20,
    padding: 14,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
  },
  resultText: {
    color: "#334155",
    marginBottom: 12,
  },
  resultActions: {
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
});
