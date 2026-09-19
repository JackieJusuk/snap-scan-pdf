import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ScannedPage } from "@/types";
import HomeScreen from "@/screens/HomeScreen";
import ScanScreen from "@/screens/ScanScreen";
import PageEditorScreen from "@/screens/PageEditorScreen";
import PdfPreviewScreen from "@/screens/PdfPreviewScreen";

export type RootStackParamList = {
  Home: undefined;
  Scan: { draftPages: ScannedPage[] } | undefined;
  PageEditor: { draftPages: ScannedPage[] };
  PdfPreview: { documentId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: "내 문서" }} />
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}
