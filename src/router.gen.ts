/* eslint-disable */
// 이 파일은 보통 @granite-js/react-native 개발 서버가 pages/ 아래 파일을 보고 자동
// 생성해준다(DO NOT EDIT 대상). 이 저장소는 실제 Granite dev 서버 없이 작성되어,
// 타입 체크가 통과하도록 같은 형식으로 손으로 맞춰뒀다 — 실제 `granite dev`/`build`를
// 처음 실행하면 이 파일이 자동으로 다시 생성되므로 그대로 덮어써도 된다.
import { Route as _IndexRoute } from "../pages/index";
import { Route as _ScanRoute } from "../pages/scan";
import { Route as _DocumentsRoute } from "../pages/documents";
import { Route as _SettingsRoute } from "../pages/settings";

declare module "@granite-js/react-native" {
  interface RegisterScreenInput {
    "/": (typeof _IndexRoute)["_inputType"];
    "/scan": (typeof _ScanRoute)["_inputType"];
    "/documents": (typeof _DocumentsRoute)["_inputType"];
    "/settings": (typeof _SettingsRoute)["_inputType"];
  }

  interface RegisterScreen {
    "/": (typeof _IndexRoute)["_outputType"];
    "/scan": (typeof _ScanRoute)["_outputType"];
    "/documents": (typeof _DocumentsRoute)["_outputType"];
    "/settings": (typeof _SettingsRoute)["_outputType"];
  }
}
