/**
 * The source stops events from reaching its document-level listeners with `e.stopPropagation()` (the element is below
 * `document`). In Next.js the React root IS the document, so React's synthetic stopPropagation does not stop other
 * native document listeners: stop them explicitly (they are registered after React's own listener).
 */
export function stopAll(e: { stopPropagation(): void; nativeEvent: Event }) {
  e.stopPropagation();
  e.nativeEvent.stopImmediatePropagation();
}
