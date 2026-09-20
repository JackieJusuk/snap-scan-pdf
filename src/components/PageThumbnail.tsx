import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { ScannedPage } from "@/types";

interface Props {
  page: ScannedPage;
  index: number;
  onDelete: () => void;
}

export default function PageThumbnail({ page, index, onDelete }: Props) {
  return (
    <View style={styles.container}>
      <Image source={{ uri: `data:image/jpeg;base64,${page.dataUri}` }} style={styles.image} resizeMode="cover" />
      <Text style={styles.pageNumber}>{index + 1}</Text>
      <Pressable onPress={onDelete} hitSlop={8}>
        <Text style={styles.deleteText}>삭제</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 110,
    marginRight: 12,
  },
  image: {
    width: 110,
    height: 150,
    borderRadius: 8,
    backgroundColor: "#eee",
  },
  pageNumber: {
    marginTop: 4,
    textAlign: "center",
    fontSize: 12,
    color: "#555",
  },
  deleteText: {
    marginTop: 2,
    textAlign: "center",
    fontSize: 12,
    color: "#dc2626",
  },
});
