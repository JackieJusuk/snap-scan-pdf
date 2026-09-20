import React, { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { createRoute, openURL } from "@granite-js/react-native";
import { clearAnthropicApiKey, getAnthropicApiKey, setAnthropicApiKey } from "@/services/apiKeyStore";

export const Route = createRoute("/settings", {
  validateParams: (params) => params,
  component: SettingsPage,
});

function SettingsPage() {
  const [apiKey, setApiKeyInput] = useState("");
  const [hasSavedKey, setHasSavedKey] = useState(false);

  useEffect(() => {
    getAnthropicApiKey().then((key) => setHasSavedKey(!!key));
  }, []);

  async function handleSave() {
    if (!apiKey.trim()) {
      Alert.alert("입력 필요", "Anthropic API 키를 입력해주세요.");
      return;
    }
    await setAnthropicApiKey(apiKey.trim());
    setApiKeyInput("");
    setHasSavedKey(true);
    Alert.alert("저장 완료", "API 키가 이 기기에 저장되었습니다.");
  }

  async function handleClear() {
    await clearAnthropicApiKey();
    setHasSavedKey(false);
    Alert.alert("삭제 완료", "저장된 API 키를 삭제했습니다.");
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Anthropic API 키</Text>
      <Text style={styles.helpText}>
        문서를 스캔한 뒤 AI 요약 PDF를 만드는 데 사용됩니다. 앱인토스 환경에는
        expo-secure-store 같은 하드웨어 보안 저장소가 없어서, 일반 로컬 저장소(토스
        앱을 삭제하면 함께 삭제됨)에 저장됩니다.
      </Text>
      <TextInput
        style={styles.input}
        value={apiKey}
        onChangeText={setApiKeyInput}
        placeholder={hasSavedKey ? "저장된 키가 있습니다 (변경하려면 입력)" : "sk-ant-..."}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
      />

      <Pressable style={[styles.button, styles.primaryButton]} onPress={handleSave}>
        <Text style={styles.primaryButtonText}>저장</Text>
      </Pressable>

      {hasSavedKey && (
        <Pressable style={[styles.button, styles.dangerButton]} onPress={handleClear}>
          <Text style={styles.dangerButtonText}>저장된 키 삭제</Text>
        </Pressable>
      )}

      <Pressable onPress={() => openURL("https://console.anthropic.com/settings/keys")}>
        <Text style={styles.link}>API 키 발급받기 (console.anthropic.com)</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
  },
  label: {
    fontSize: 16,
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
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ccc",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 16,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 12,
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
  link: {
    color: "#2563eb",
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
  },
});
