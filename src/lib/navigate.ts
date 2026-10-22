/** Leaves the app for an external page (Maya checkout). Isolated so tests can spy on it. */
export function navigateExternal(url: string): void {
  window.location.assign(url);
}
