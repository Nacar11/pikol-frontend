const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

/**
 * Only https leaves the app, plus http to this machine for the mock provider.
 * A `checkout_url` is server data; never hand `javascript:` to the location bar.
 */
export function isAllowedExternalUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol === 'https:') return true;
  return parsed.protocol === 'http:' && LOCAL_HOSTS.has(parsed.hostname);
}

/**
 * Leaves the app for an external page (Maya checkout). Isolated so tests can spy on it.
 * Throws on a URL that is not allowed; the caller surfaces the error.
 */
export function navigateExternal(url: string): void {
  if (!isAllowedExternalUrl(url)) throw new Error('Refusing to open an unsafe payment link.');
  window.location.assign(url);
}
