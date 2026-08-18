import type { Activity } from './activity';

/**
 * Display label for an activity: an explicit `name` when a producer set one,
 * otherwise the raw `type`.
 *
 * `type` is an open string. Core `lineage@1` does not map vendor activity types
 * to presentation copy — OpenParser-friendly names live in
 * `@openparser/lineage/openparser`.
 */
export function activityLabel(activity: Activity): string {
  return activity.name ?? activity.type;
}
