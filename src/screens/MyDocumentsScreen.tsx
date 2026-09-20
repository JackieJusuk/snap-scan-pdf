import React from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootNavigator";
import { useDocuments } from "@/context/DocumentsContext";
import DocumentCard from "@/components/DocumentCard";

type Props = NativeStackScreenProps<RootStackParamList, "MyDocuments">;

export default function MyDocumentsScreen({ navigation }: Props) {
  const { documents, loading } = useDocuments();

  return (
    <View style={styles.container}>
      {!loading && documents.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>아직 저장된 문서가 없습니다.</Text>
          <Text style={styles.emptySubText}>홈 화면의 메뉴로 첫 문서를 만들어보세요.</Text>
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
});
