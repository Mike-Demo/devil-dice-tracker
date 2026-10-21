const ROSTER_KEY = "catan-dice-roster-code-v1";

export function getRosterCode(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ROSTER_KEY);
}

export function setRosterCode(code: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ROSTER_KEY, code);
}

export function clearRosterCode(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ROSTER_KEY);
}

export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

const ROSTER_KEY_KEY = "catan-dice-roster-key-v1";

/** Private key letting this device edit the roster (only on the creator's device). */
export function getRosterKey(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ROSTER_KEY_KEY);
}

export function setRosterKey(key: string | null): void {
  if (typeof window === "undefined") return;
  if (key) window.localStorage.setItem(ROSTER_KEY_KEY, key);
  else window.localStorage.removeItem(ROSTER_KEY_KEY);
}
