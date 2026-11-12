// Controls which feedback types trigger notifications and acknowledgment.
// Change this array to add or remove trigger types without touching any other code.
export const NOTIFY_FEEDBACK_TYPES = ["LIABILITY", "COACHING_OPPORTUNITY"] as const;

export function shouldNotify(feedbackTypes: string[]): boolean {
  return feedbackTypes.some((ft) =>
    (NOTIFY_FEEDBACK_TYPES as readonly string[]).includes(ft)
  );
}
