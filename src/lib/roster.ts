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
