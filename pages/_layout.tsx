import React, { type PropsWithChildren } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@granite-js/react-native";

/**
 * 모든 페이지에서 공통으로 보이는 헤더. 앱 이름과 설정 버튼을 항상 노출한다.
 */
export default function Layout({ children }: PropsWithChildren) {
  const navigation = useNavigation();

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        {navigation.canGoBack() ? (
          <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
            <Text style={styles.backText}>‹ 뒤로</Text>
          </Pressable>
        ) : (
          <View style={styles.headerSpacer} />
        )}
        <Text style={styles.title}>스캔 PDF 요약</Text>
        <Pressable onPress={() => navigation.navigate("/settings")} hitSlop={12}>
          <Text style={styles.settingsText}>설정</Text>
        </Pressable>
      </View>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
  },
  headerSpacer: {
    width: 40,
  },
  backText: {
    color: "#2563eb",
    fontSize: 14,
    fontWeight: "600",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
  settingsText: {
    color: "#2563eb",
    fontSize: 14,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
});
