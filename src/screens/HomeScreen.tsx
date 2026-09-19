import React from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootNavigator";
import { useDocuments } from "@/context/DocumentsContext";
import DocumentCard from "@/components/DocumentCard";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

export default function HomeScreen({ navigation }: Props) {
  const { documents, loading } = useDocuments();

  return (
    <View style={styles.container}>
      {!loading && documents.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>아직 저장된 문서가 없습니다.</Text>
          <Text style={styles.emptySubText}>아래 버튼으로 첫 문서를 촬영해보세요.</Text>
        </View>
      ) : (
        <FlatList
          data={documents}
          keyExtractor={(doc) => doc.id}
          renderItem={({ item }) => (
            <DocumentCard
              document={item}
              onPress={() => navigation.navigate("PdfPreview", { documentId: item.id })}
            />
          )}
        />
      )}

      <Pressable
        style={styles.fab}
        onPress={() => navigation.navigate("Scan", undefined)}
      >
        <Text style={styles.fabText}>+ 새로 촬영</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  emptySubText: {
    marginTop: 6,
    fontSize: 13,
    color: "#888",
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 28,
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 30,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  fabText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
