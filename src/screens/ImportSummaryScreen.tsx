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
  hasQuestions: boolean;
}

interface Progress {
  done: number;
  total: number;
}

async function readAsBase64(uri: string): Promise<string> {
  return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
}

export default function ImportSummaryScreen() {
  // Android "폴더에서 선택" 흐름 — 여러 개를 체크해서 한 번에 처리하고, 같은 폴더에
  // 자동 저장까지 가능하다.
  const [directoryUri, setDirectoryUri] = useState<string | null>(null);
  const [files, setFiles] = useState<PickedPdfFile[]>([]);
  const [selectedUris, setSelectedUris] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<Progress | null>(null);

  // 자동 저장이 안 되는(또는 애초에 그럴 권한이 없는) 요약 결과들의 대기열. 파일에서
  // 직접 선택(Drive 등)한 항목과, 폴더 자동 저장이 실패한 항목이 여기 함께 쌓인다.
  const [results, setResults] = useState<SummaryResult[]>([]);

  // 지금 사용 중인 쪽 버튼만 채운 파란색으로, 나머지는 파란 테두리로 — 헤더의 카테고리
  // 칩과 같은 규칙(선택됨=채움, 선택 안 됨=테두리)을 이 화면의 두 진입 버튼에도 적용.
  const [activeSection, setActiveSection] = useState<"local" | "cloud" | null>(null);

  const busy = progress !== null;

  async function handlePickFolder() {
    setActiveSection("local");
    const uri = await pickPdfDirectory();
    if (!uri) return;
    setDirectoryUri(uri);
    setSelectedUris(new Set());
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

  function toggleSelected(uri: string) {
    setSelectedUris((prev) => {
      const next = new Set(prev);
      if (next.has(uri)) {
        next.delete(uri);
      } else {
        next.add(uri);
      }
      return next;
    });
  }

  async function handleSummarizeSelected() {
    if (!directoryUri || selectedUris.size === 0) return;
    const targets = files.filter((file) => selectedUris.has(file.uri));

    setProgress({ done: 0, total: targets.length });
    const needsManualSave: SummaryResult[] = [];
    let savedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < targets.length; i++) {
      const file = targets[i];
      try {
        const base64 = await readAsBase64(file.uri);
        const aiResult = await summarizePdfDocumentWithAi(base64);
        const tempSummaryUri = await buildSummaryPdf(aiResult, file.name.replace(/\.pdf$/i, ""));
        try {
          await saveSummaryNextToOriginal(directoryUri, file.name, tempSummaryUri);
          savedCount += 1;
        } catch {
          // 이 폴더(예: Google Drive)에는 자동 저장이 안 됨 — 요약 자체는 버리지
          // 않고 대기열로 넘겨서 공유/다른 폴더 저장으로 이어갈 수 있게 한다.
          needsManualSave.push({
            uri: tempSummaryUri,
            sourceName: file.name,
            hasQuestions: aiResult.questions !== null,
          });
        }
      } catch {
        failedCount += 1;
      }
      setProgress({ done: i + 1, total: targets.length });
    }

    setProgress(null);
    setSelectedUris(new Set());
    if (needsManualSave.length > 0) {
      setResults((prev) => [...prev, ...needsManualSave]);
    }

    const parts: string[] = [];
    if (savedCount > 0) parts.push(`${savedCount}개는 같은 폴더에 저장 완료`);
    if (needsManualSave.length > 0) {
      parts.push(`${needsManualSave.length}개는 이 폴더에 저장할 수 없어 아래 목록에 추가됨`);
    }
    if (failedCount > 0) parts.push(`${failedCount}개는 요약 자체에 실패`);
    Alert.alert("처리 완료", parts.join("\n"));
  }

  async function handlePickFiles() {
    setActiveSection("cloud");
    const pickResult = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      multiple: true,
    });
    if (pickResult.canceled || !pickResult.assets?.length) return;
    const assets = pickResult.assets;

    setProgress({ done: 0, total: assets.length });
    const newResults: SummaryResult[] = [];
    let failedCount = 0;

    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i];
      try {
        const base64 = await readAsBase64(asset.uri);
        const aiResult = await summarizePdfDocumentWithAi(base64);
        const tempSummaryUri = await buildSummaryPdf(aiResult, asset.name.replace(/\.pdf$/i, ""));
        newResults.push({
          uri: tempSummaryUri,
          sourceName: asset.name,
          hasQuestions: aiResult.questions !== null,
        });
      } catch {
        failedCount += 1;
      }
      setProgress({ done: i + 1, total: assets.length });
    }

    setProgress(null);
    if (newResults.length > 0) {
      setResults((prev) => [...prev, ...newResults]);
    }
    if (failedCount > 0) {
      Alert.alert("일부 요약 실패", `${failedCount}개 파일은 요약에 실패했습니다.`);
    }
  }

  async function handleShareResult(item: SummaryResult) {
    const available = await Sharing.isAvailableAsync();
    if (!available) {
      Alert.alert("공유 불가", "이 기기에서는 공유 기능을 사용할 수 없습니다.");
      return;
    }
    await Sharing.shareAsync(item.uri, { mimeType: "application/pdf" });
  }

  async function handleSaveResultToFolder(item: SummaryResult) {
    try {
      const outcome = await saveToChosenDirectory(item.uri);
      if (outcome === "saved") {
        Alert.alert("저장 완료", "선택한 폴더에 요약 PDF를 저장했습니다.");
        setResults((prev) => prev.filter((result) => result.uri !== item.uri));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert("저장 실패", message);
    }
  }

  function handleDismissResult(item: SummaryResult) {
    setResults((prev) => prev.filter((result) => result.uri !== item.uri));
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {progress && (
        <View style={styles.progressBanner}>
          <ActivityIndicator />
          <Text style={styles.progressText}>
            요약 중… ({progress.done}/{progress.total})
          </Text>
        </View>
      )}

      {Platform.OS === "android" && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>로컬 폴더에서 선택</Text>
          <Text style={styles.helpText}>
            휴대폰/저장소의 폴더를 고르면 그 안의 PDF 목록을 보여줍니다. 여러 개를
            체크한 뒤 한 번에 요약할 수 있고, 같은 폴더에 "파일명_summary.pdf"로
            자동 저장됩니다.
          </Text>
          <Pressable
            style={[
              styles.button,
              activeSection === "local" ? styles.primaryButton : styles.outlineButton,
            ]}
            onPress={handlePickFolder}
            disabled={busy}
          >
            <Text
              style={activeSection === "local" ? styles.primaryButtonText : styles.outlineButtonText}
            >
              {directoryUri ? "다른 폴더 선택" : "폴더 선택"}
            </Text>
          </Pressable>

          {files.map((item) => {
            const checked = selectedUris.has(item.uri);
            return (
              <Pressable
                key={item.uri}
                style={styles.fileRow}
                onPress={() => toggleSelected(item.uri)}
                disabled={busy}
              >
                <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                  {checked && <Text style={styles.checkboxMark}>✓</Text>}
                </View>
                <Text style={styles.fileName} numberOfLines={1}>
                  {item.name}
                </Text>
              </Pressable>
            );
          })}

          {files.length > 0 && (
            <Pressable
              style={[
                styles.button,
                styles.primaryButton,
                (selectedUris.size === 0 || busy) && styles.buttonDisabled,
              ]}
              onPress={handleSummarizeSelected}
              disabled={selectedUris.size === 0 || busy}
            >
              <Text style={styles.primaryButtonText}>
                선택한 {selectedUris.size}개 요약하기
              </Text>
            </Pressable>
          )}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>클라우드 드라이브에서 선택</Text>
        <Text style={styles.helpText}>
          기기에 연결된 Google Drive 등 클라우드에 있는 PDF도 여러 개 골라 한 번에
          요약할 수 있습니다. 클라우드 파일은 원래 위치에 자동 저장할 권한이 없는
          경우가 많아, 요약이 끝나면 각각 공유하거나 저장할 폴더를 직접 골라주세요.
        </Text>
        <Pressable
          style={[
            styles.button,
            activeSection === "cloud" ? styles.primaryButton : styles.outlineButton,
          ]}
          onPress={handlePickFiles}
          disabled={busy}
        >
          <Text
            style={activeSection === "cloud" ? styles.primaryButtonText : styles.outlineButtonText}
          >
            PDF 파일 선택 (여러 개 가능)
          </Text>
        </Pressable>
      </View>

      {results.map((item) => (
        <View key={item.uri} style={styles.resultBlock}>
          <Text style={styles.resultText}>
            "{item.sourceName}" 요약이 준비됐습니다.
            {item.hasQuestions ? " (교과서로 판단되어 예상문제 포함)" : ""}
          </Text>
          <View style={styles.resultActions}>
            <Pressable
              style={[styles.button, styles.primaryButton]}
              onPress={() => handleShareResult(item)}
            >
              <Text style={styles.primaryButtonText}>공유/저장</Text>
            </Pressable>
            {Platform.OS === "android" && (
              <Pressable
                style={[styles.button, styles.secondaryButton]}
                onPress={() => handleSaveResultToFolder(item)}
              >
                <Text style={styles.secondaryButtonText}>폴더 선택해서 저장</Text>
              </Pressable>
            )}
            <Pressable style={styles.dismissButton} onPress={() => handleDismissResult(item)}>
              <Text style={styles.dismissButtonText}>목록에서 지우기</Text>
            </Pressable>
          </View>
        </View>
      ))}
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
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  checkboxMark: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  fileName: {
    flex: 1,
    fontSize: 14,
    color: "#111",
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
  dismissButton: {
    alignItems: "center",
    paddingVertical: 8,
  },
  dismissButtonText: {
    color: "#94a3b8",
    fontSize: 13,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
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
    backgroundColor: "#fff",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#cbd5e1",
  },
  secondaryButtonText: {
    color: "#334155",
    fontWeight: "600",
    fontSize: 15,
  },
  outlineButton: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#2563eb",
  },
  outlineButtonText: {
    color: "#2563eb",
    fontWeight: "700",
    fontSize: 15,
  },
});
