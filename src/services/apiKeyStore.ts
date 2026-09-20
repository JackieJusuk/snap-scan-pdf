import { Storage } from "@apps-in-toss/framework";

const ANTHROPIC_API_KEY_STORE_KEY = "anthropic_api_key";

// 앱인토스 환경에는 expo-secure-store 같은 하드웨어 기반 보안 저장소 API가 없다.
// Storage는 일반 로컬 저장소(토스 앱 삭제 시 함께 삭제)라서, expo-secure-store만큼
// 안전하지는 않다는 점을 감안해야 한다.
export async function getAnthropicApiKey(): Promise<string | null> {
  const value = await Storage.getItem(ANTHROPIC_API_KEY_STORE_KEY);
  return value ?? null;
}

export async function setAnthropicApiKey(apiKey: string): Promise<void> {
  await Storage.setItem(ANTHROPIC_API_KEY_STORE_KEY, apiKey.trim());
}

export async function clearAnthropicApiKey(): Promise<void> {
  await Storage.removeItem(ANTHROPIC_API_KEY_STORE_KEY);
}
