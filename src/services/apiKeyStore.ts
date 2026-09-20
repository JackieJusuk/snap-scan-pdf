import * as SecureStore from "expo-secure-store";

const ANTHROPIC_API_KEY_STORE_KEY = "anthropic_api_key";

export async function getAnthropicApiKey(): Promise<string | null> {
  return SecureStore.getItemAsync(ANTHROPIC_API_KEY_STORE_KEY);
}

export async function setAnthropicApiKey(apiKey: string): Promise<void> {
  await SecureStore.setItemAsync(ANTHROPIC_API_KEY_STORE_KEY, apiKey.trim());
}

export async function clearAnthropicApiKey(): Promise<void> {
  await SecureStore.deleteItemAsync(ANTHROPIC_API_KEY_STORE_KEY);
}
