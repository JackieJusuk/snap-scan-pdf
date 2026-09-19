import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { ScannedPage } from "@/types";

interface Props {
  page: ScannedPage;
  index: number;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export default function PageThumbnail({ page, index, onDelete, onMoveUp, onMoveDown }: Props) {
  return (
    <View style={styles.container}>
      <Image source={{ uri: page.imageUri }} style={styles.image} resizeMode="cover" />
      <Text style={styles.pageNumber}>{index + 1}</Text>
      <View style={styles.actions}>
        <Pressable onPress={onMoveUp} disabled={!onMoveUp} hitSlop={8}>
          <Text style={[styles.actionText, !onMoveUp && styles.actionDisabled]}>▲</Text>
        </Pressable>
        <Pressable onPress={onMoveDown} disabled={!onMoveDown} hitSlop={8}>
          <Text style={[styles.actionText, !onMoveDown && styles.actionDisabled]}>▼</Text>
        </Pressable>
        <Pressable onPress={onDelete} hitSlop={8}>
          <Text style={styles.deleteText}>삭제</Text>
        </Pressable>
      </View>
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
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    paddingHorizontal: 4,
  },
  actionText: {
    fontSize: 14,
    color: "#2563eb",
  },
  actionDisabled: {
    color: "#ccc",
  },
  deleteText: {
    fontSize: 12,
    color: "#dc2626",
  },
});
