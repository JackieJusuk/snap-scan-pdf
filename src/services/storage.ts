import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScannedDocument } from "@/types";

const STORAGE_KEY = "snap-scan-pdf/documents";

export async function loadDocuments(): Promise<ScannedDocument[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ScannedDocument[];
  } catch {
    return [];
  }
}

export async function saveDocuments(documents: ScannedDocument[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
}
