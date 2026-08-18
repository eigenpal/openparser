import type { Activity } from '../activity';

/**
 * Human labels for the activity types this profile emits.
 *
 * Documents do not carry generated display strings, so this is where a label is
 * recovered from `activity.type`. Keeping it here rather than in each dashboard
 * means one mapping to translate or correct, and it stays available to anyone
 * reading a document through this library.
 */
const ACTIVITY_LABELS: Record<string, string> = {
  ocr: 'Parse',
  extract: 'Schema-constrained extraction',
  transform: 'Transform',
  grounding_resolution: 'Grounding resolution and validation',
  'review.confirm': 'Human review',
};

/**
 * Display label for an OpenParser activity: an explicit `name` when a producer
 * set one, otherwise a label for known types, otherwise the raw type.
 *
 * `type` is an open string, so unknown types render as themselves rather than
 * being hidden behind a placeholder.
 */
export function activityLabel(activity: Activity): string {
  return activity.name ?? ACTIVITY_LABELS[activity.type] ?? activity.type;
}
