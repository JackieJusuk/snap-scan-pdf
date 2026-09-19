import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootNavigator";
import { scanPages } from "@/services/documentScanner";

type Props = NativeStackScreenProps<RootStackParamList, "Scan">;

export default function ScanScreen({ navigation, route }: Props) {
  const existingPages = route.params?.draftPages ?? [];
  const [scanning, setScanning] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const newPages = await scanPages();
        if (cancelled) return;

        if (newPages.length === 0) {
          navigation.goBack();
          return;
        }

        navigation.replace("PageEditor", {
          draftPages: [...existingPages, ...newPages],
        });
      } catch (error) {
        if (cancelled) return;
        Alert.alert("촬영 실패", "카메라를 여는 중 문제가 발생했습니다. 다시 시도해주세요.");
        navigation.goBack();
      } finally {
        if (!cancelled) setScanning(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.container}>
      {scanning && <ActivityIndicator size="large" color="#2563eb" />}
      <Text style={styles.text}>카메라를 여는 중...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000",
  },
  text: {
    marginTop: 12,
    color: "#fff",
  },
});
