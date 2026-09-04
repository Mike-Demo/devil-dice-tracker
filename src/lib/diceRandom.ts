/**
 * Cryptographically secure random integer in [0, sides), via the Web Crypto
 * API — the same approach as the STA D20 roller's diceRandom.ts.
 */
export function secureInt(sides: number): number {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  // arr[0] is always populated; ?? 0 only satisfies noUncheckedIndexedAccess.
  return (arr[0] ?? 0) % sides;
}

/** Cryptographically secure d6 roll, 1–6. */
export function secureD6(): number {
  return secureInt(6) + 1;
}
