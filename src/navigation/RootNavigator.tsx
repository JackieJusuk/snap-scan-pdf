import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ScannedPage } from "@/types";
import HomeScreen from "@/screens/HomeScreen";
import ScanScreen from "@/screens/ScanScreen";
import PageEditorScreen from "@/screens/PageEditorScreen";
import PdfPreviewScreen from "@/screens/PdfPreviewScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import ImportSummaryScreen from "@/screens/ImportSummaryScreen";
import MyDocumentsScreen from "@/screens/MyDocumentsScreen";

export type RootStackParamList = {
  Home: undefined;
  Scan: { draftPages: ScannedPage[] } | undefined;
  PageEditor: { draftPages: ScannedPage[] };
  PdfPreview: { documentId: string };
  Settings: undefined;
  ImportSummary: undefined;
  MyDocuments: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: "Scan-PDF-Summary" }}
        />
        <Stack.Screen name="Scan" component={ScanScreen} options={{ title: "촬영" }} />
        <Stack.Screen
          name="PageEditor"
          component={PageEditorScreen}
          options={{ title: "페이지 편집" }}
        />
        <Stack.Screen
          name="PdfPreview"
          component={PdfPreviewScreen}
          options={{ title: "PDF" }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: "설정" }}
        />
        <Stack.Screen
          name="ImportSummary"
          component={ImportSummaryScreen}
          options={{ title: "기존 PDF 요약" }}
        />
        <Stack.Screen
          name="MyDocuments"
          component={MyDocumentsScreen}
          options={{ title: "기존 작업내용" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
