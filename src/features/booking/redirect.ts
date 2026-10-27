/** Leave for Maya's hosted page. Its own module so tests can stand in for
 * a full-page navigation. */
export function goToMaya(url: string): void {
  window.location.assign(url);
}
