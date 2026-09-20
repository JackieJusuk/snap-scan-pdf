import React, { type PropsWithChildren } from "react";
import { Granite, type InitialProps } from "@granite-js/react-native";
import { context } from "../require.context";
import { DocumentsProvider } from "@/context/DocumentsContext";

function AppContainer({ children }: PropsWithChildren<InitialProps>) {
  return <DocumentsProvider>{children}</DocumentsProvider>;
}

export default Granite.registerApp(AppContainer, {
  appName: "snap-scan-pdf",
  context,
});
