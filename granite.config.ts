import { appsInToss } from "@apps-in-toss/framework/plugins";
import { router } from "@granite-js/plugin-router";
import { hermes } from "@granite-js/plugin-hermes";
import { defineConfig } from "@granite-js/react-native/config";

// appName은 앱인토스 콘솔에 등록한 앱과 반드시 동일해야 한다 (한 번 정하면 변경 불가).
export default defineConfig({
  appName: "snap-scan-pdf",
  scheme: "granite",
  plugins: [
    router(),
    hermes(),
    appsInToss({
      brand: {
        displayName: "스캔 PDF 요약",
        primaryColor: "#2563eb",
        // TODO: 앱인토스 콘솔의 앱 정보에서 로고 이미지를 업로드한 뒤, 그 이미지를
        // 우클릭해 링크를 복사해서 이 자리에 넣는다(icon은 빈 문자열일 수 없다).
        icon: "REPLACE_WITH_CONSOLE_UPLOADED_ICON_URL",
      },
      permissions: [{ name: "camera", access: "access" }],
    }),
  ],
});
