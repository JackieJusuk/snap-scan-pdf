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
import AppHeader from "@/components/AppHeader";

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
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{ header: (props) => <AppHeader {...props} /> }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Scan" component={ScanScreen} />
        <Stack.Screen name="PageEditor" component={PageEditorScreen} />
        <Stack.Screen name="PdfPreview" component={PdfPreviewScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="ImportSummary" component={ImportSummaryScreen} />
        <Stack.Screen name="MyDocuments" component={MyDocumentsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
