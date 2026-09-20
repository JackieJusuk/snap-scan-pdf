import React, { useEffect } from "react";
import { BackHandler } from "react-native";
import { NavigationContainer, useNavigationContainerRef } from "@react-navigation/native";
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
  const navigationRef = useNavigationContainerRef<RootStackParamList>();

  useEffect(() => {
    // 폰의 하드웨어/제스처 뒤로가기는 화면을 한 단계씩 거슬러 올라가는 대신, 바로
    // 홈으로 이동시킨다. 이미 홈이면 기본 동작(앱 종료)에 맡긴다.
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (navigationRef.getCurrentRoute()?.name !== "Home") {
        navigationRef.reset({ index: 0, routes: [{ name: "Home" }] });
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [navigationRef]);

  return (
    <NavigationContainer ref={navigationRef}>
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
