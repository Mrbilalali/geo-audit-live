export const KEYS_LS = "geo-toolkit-api-keys";

export function getApiKey(key: string): string {
  try {
    const raw = localStorage.getItem(KEYS_LS);
    return raw ? (JSON.parse(raw)[key] || "") : "";
  } catch {
    return "";
  }
}
