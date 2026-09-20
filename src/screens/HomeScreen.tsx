import React, { useLayoutEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

export default function HomeScreen({ navigation }: Props) {
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={() => navigation.navigate("Settings")} hitSlop={12}>
          <Text style={styles.headerButtonText}>설정</Text>
        </Pressable>
      ),
    });
  }, [navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.menu}>
        <Pressable
          style={[styles.menuCard, styles.menuCardSecondary]}
          onPress={() => navigation.navigate("ImportSummary")}
        >
          <Text style={styles.menuCardTitle}>1. 기존 PDF를 읽어서 AI Summary PDF 만들기</Text>
        </Pressable>
        <Pressable
          style={[styles.menuCard, styles.menuCardPrimary]}
          onPress={() => navigation.navigate("Scan", undefined)}
        >
          <Text style={[styles.menuCardTitle, styles.menuCardTitleOnPrimary]}>
            2. 사진찍고 PDF 만든후 AI Summary PDF 만들기
          </Text>
        </Pressable>
        <Pressable
          style={[styles.menuCard, styles.menuCardSecondary]}
          onPress={() => navigation.navigate("MyDocuments")}
        >
          <Text style={styles.menuCardTitle}>3. 기존 작업내용</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerButtonText: {
    color: "#2563eb",
    fontSize: 15,
    fontWeight: "600",
    marginRight: 4,
  },
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
