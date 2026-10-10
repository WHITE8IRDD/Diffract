/**
 * Identifier helpers.
 *
 * IDs are monotonic counters prefixed by kind (`doc-3`, `layer-12`) so they
 * are unique inside a session, cheap to generate, easy to debug, and stable
 * for history snapshots. (A crypto UUID would also work but is harder to read
 * in logs and offers no benefit for in-process state.)
 */

let counter = 0;

/** Next unique id with a kind prefix, e.g. `freshId("layer") → "layer-7"`. */
export function freshId(kind: string): string {
  counter += 1;
  return `${kind}-${counter}`;
}

/** Reset the counter — test helper only. */
export function resetIds(): void {
  counter = 0;
}
