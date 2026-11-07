/** Client-safe call constants (no Node imports), shared by the staff form and the server helpers. */
export const CALL_OUTCOMES = ["answered", "missed", "voicemail"] as const;
export type CallOutcome = (typeof CALL_OUTCOMES)[number];
