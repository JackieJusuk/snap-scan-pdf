import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { createRoute, useNavigation } from "@granite-js/react-native";

export const Route = createRoute("/", {
  validateParams: (params) => params,
  component: HomePage,
});

function HomePage() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <View style={styles.menu}>
        <Pressable style={[styles.menuCard, styles.menuCardPrimary]} onPress={() => navigation.navigate("/scan")}>
          <Text style={[styles.menuCardTitle, styles.menuCardTitleOnPrimary]}>
            1. 촬영해서 AI 요약 PDF 만들기
          </Text>
        </Pressable>
        <Pressable style={[styles.menuCard, styles.menuCardSecondary]} onPress={() => navigation.navigate("/documents")}>
          <Text style={styles.menuCardTitle}>2. 기존 작업내용</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  menu: {
    padding: 16,
    gap: 12,
  },
  menuCard: {
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  menuCardPrimary: {
    backgroundColor: "#2563eb",
  },
  menuCardSecondary: {
    backgroundColor: "#f1f5f9",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#cbd5e1",
  },
  menuCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
  },
  menuCardTitleOnPrimary: {
    color: "#fff",
  },
});
