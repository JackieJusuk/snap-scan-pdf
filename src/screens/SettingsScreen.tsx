import React, { useEffect, useState } from "react";
import { Alert, Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { clearAnthropicApiKey, getAnthropicApiKey, setAnthropicApiKey } from "@/services/apiKeyStore";

export default function SettingsScreen() {
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
    Alert.alert("저장 완료", "API 키가 기기에 안전하게 저장되었습니다.");
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
        문서 스캔 시 AI 요약 PDF를 생성하는 데 사용됩니다. 키는 이 기기에만 안전하게
        저장되며, 요약을 요청할 때만 Anthropic 서버로 전송됩니다.
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

      <Pressable onPress={() => Linking.openURL("https://console.anthropic.com/settings/keys")}>
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
