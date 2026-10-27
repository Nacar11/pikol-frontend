/** Browser storage for per-browser conveniences. It can be absent or throw
 * (private mode, blocked site data), so a failure reads as "nothing saved". */
export function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Not remembering is fine.
  }
}
