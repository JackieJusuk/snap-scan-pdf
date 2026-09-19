import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { ScannedDocument } from "@/types";

interface Props {
  document: ScannedDocument;
  onPress: () => void;
}

export default function DocumentCard({ document, onPress }: Props) {
  const cover = document.pages[0]?.imageUri;
  const date = new Date(document.updatedAt).toLocaleDateString("ko-KR");

  return (
    <Pressable style={styles.card} onPress={onPress}>
      {cover ? (
        <Image source={{ uri: cover }} style={styles.thumbnail} resizeMode="cover" />
      ) : (
        <View style={[styles.thumbnail, styles.thumbnailPlaceholder]} />
      )}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {document.title}
        </Text>
        <Text style={styles.meta}>
          {document.pages.length}페이지 · {date}
          {document.pdfUri ? " · PDF 완료" : ""}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e0e0e0",
  },
  thumbnail: {
    width: 56,
    height: 72,
    borderRadius: 6,
    backgroundColor: "#eee",
  },
  thumbnailPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    marginLeft: 12,
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  meta: {
    marginTop: 4,
    fontSize: 13,
    color: "#777",
  },
});
