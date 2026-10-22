/** A run of consecutive slots on one court; `start`/`end` are inclusive
 * indexes into that court's 24 slots. */
export type Selection = { court_id: number; start: number; end: number };
