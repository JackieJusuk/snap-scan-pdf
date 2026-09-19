import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { DocumentsProvider } from "@/context/DocumentsContext";
import RootNavigator from "@/navigation/RootNavigator";

export default function App() {
  return (
    <SafeAreaProvider>
      <DocumentsProvider>
        <StatusBar style="auto" />
        <RootNavigator />
      </DocumentsProvider>
    </SafeAreaProvider>
  );
}
