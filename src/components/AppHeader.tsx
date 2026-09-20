import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackHeaderProps } from "@react-navigation/native-stack";

const CATEGORIES = [
  { label: "1. 기존 PDF 요약", route: "ImportSummary" },
  { label: "2. 촬영해서 요약", route: "Scan" },
  { label: "3. 기존 작업내용", route: "MyDocuments" },
] as const;

/**
 * 모든 화면에서 공통으로 쓰는 헤더. 앱 이름과 3개 작업 카테고리를 항상 보여줘서,
 * 어느 화면에 있든 다른 카테고리로 즉시 이동할 수 있게 한다. 카테고리 전환은
 * navigation.reset으로 스택을 그 화면 하나로 정리한다 — 탭 전환처럼 동작하게
 * 해서, 여러 카테고리를 오가는 동안 뒤로가기 스택이 한없이 쌓이지 않게 한다.
 */
export default function AppHeader({ navigation, route, back }: NativeStackHeaderProps) {
  const insets = useSafeAreaInsets();

  function goToCategory(target: (typeof CATEGORIES)[number]["route"]) {
    navigation.reset({ index: 0, routes: [{ name: target as never }] });
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.topRow}>
        <View style={styles.side}>
          {back && (
            <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
              <Text style={styles.backText}>‹ 뒤로</Text>
            </Pressable>
          )}
        </View>
        <Text style={styles.appName}>Scan-Pdf-Summary</Text>
        <View style={[styles.side, styles.sideRight]}>
          <Pressable onPress={() => navigation.navigate("Settings" as never)} hitSlop={12}>
            <Text style={styles.settingsText}>설정</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.categoryRow}>
        {CATEGORIES.map((item) => {
          const active = route.name === item.route;
          return (
            <Pressable
              key={item.route}
              style={[styles.categoryChip, active && styles.categoryChipActive]}
              onPress={() => goToCategory(item.route)}
            >
              <Text
                style={[styles.categoryText, active && styles.categoryTextActive]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 10,
    paddingHorizontal: 16,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  side: {
    minWidth: 48,
  },
  sideRight: {
    alignItems: "flex-end",
  },
  backText: {
    color: "#2563eb",
    fontSize: 14,
    fontWeight: "600",
  },
  appName: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111",
  },
  settingsText: {
    color: "#2563eb",
    fontSize: 14,
    fontWeight: "600",
  },
  categoryRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 10,
  },
  categoryChip: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
  },
  categoryChipActive: {
    backgroundColor: "#2563eb",
  },
  categoryText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  categoryTextActive: {
    color: "#fff",
  },
});
