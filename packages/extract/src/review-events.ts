import {
  JsonPointerSchema,
  JsonValueSchema,
  jsonValuesEqual,
  type JsonValue,
} from '@openparser/lineage';
import { z } from 'zod';

const NonRootJsonPointerSchema = JsonPointerSchema.min(
  1,
  'path must identify a value below the document root'
);

const ExtractionReviewEventBaseShape = {
  version: z.number().int().positive(),
  actor_id: z.string().min(1),
  created_at: z.string().datetime(),
} as const;

export const ExtractionReviewEventSchema = z.discriminatedUnion('type', [
  z
    .object({
      ...ExtractionReviewEventBaseShape,
      type: z.literal('field_confirmed'),
      path: NonRootJsonPointerSchema,
      /** What the field said before, so the trace can diff without replaying. */
      previous_value: JsonValueSchema.optional(),
      value: JsonValueSchema,
      note: z.string().max(2_000).optional(),
    })
    .strict(),
  // The confirmation stays in the log so the audit trail names who withdrew it;
  // only the value chain forgets. No payload beyond the path: the tip is
  // unambiguous once eligibility has been checked.
  z
    .object({
      ...ExtractionReviewEventBaseShape,
      type: z.literal('field_confirmation_retracted'),
      path: NonRootJsonPointerSchema,
    })
    .strict(),
  z
    .object({
      ...ExtractionReviewEventBaseShape,
      type: z.enum(['approved', 'rejected']),
      note: z.string().max(2_000).optional(),
    })
    .strict(),
  // Signing the run off is one act by one actor, so taking it back needs no
  // payload: the live completion is unambiguous. Both events stay in the log —
  // the trail has to show the run was signed off and then reopened — and only
  // the status and the lineage decision forget it.
  z
    .object({
      ...ExtractionReviewEventBaseShape,
      type: z.literal('completion_retracted'),
    })
    .strict(),
]);
export type ExtractionReviewEvent = z.infer<typeof ExtractionReviewEventSchema>;
export type FieldConfirmedReviewEvent = ExtractionReviewEvent & { type: 'field_confirmed' };
export type CompletionReviewEvent = ExtractionReviewEvent & { type: 'approved' | 'rejected' };

/** True when either pointer is the other, or one sits inside the other. */
export function reviewPathsOverlap(left: string, right: string): boolean {
  return left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`);
}

/**
 * Confirmations that still contribute to the current value chain. Each
 * retraction peels the current tip on that exact path, in event order, so two
 * retractions of the same path undo two confirmations.
 */
export function liveFieldConfirmedEvents(
  events: readonly ExtractionReviewEvent[]
): FieldConfirmedReviewEvent[] {
  const stacks = new Map<string, FieldConfirmedReviewEvent[]>();
  for (const event of events) {
    if (event.type === 'field_confirmed') {
      const stack = stacks.get(event.path) ?? [];
      stack.push(event);
      stacks.set(event.path, stack);
      continue;
    }
    if (event.type === 'field_confirmation_retracted') {
      const stack = stacks.get(event.path);
      if (!stack || stack.length === 0) continue;
      stack.pop();
      if (stack.length === 0) stacks.delete(event.path);
    }
  }
  const live = new Set<FieldConfirmedReviewEvent>();
  for (const stack of stacks.values()) {
    for (const event of stack) live.add(event);
  }
  return events.filter(
    (event): event is FieldConfirmedReviewEvent =>
      event.type === 'field_confirmed' && live.has(event)
  );
}

/**
 * Who currently stands behind each path, replayed from the event log.
 *
 * An actor counts when their newest live confirmation on that path names the
 * value the path now holds. That single rule replaces separate approve and
 * withdraw bookkeeping, and it is why a sign-off can no longer describe a value
 * nobody confirmed: someone confirming a different value moves the path on, and
 * everyone who named the old value stops counting. A confirmation on an
 * overlapping path — a parent or a child — has the same effect, since it changes
 * what the value at this path is.
 *
 * Confirming the value a path already holds adds an approver without disturbing
 * the ones already there, which is how a quorum accumulates.
 */
export function approversByPointerFromEvents(
  events: readonly ExtractionReviewEvent[]
): ReadonlyMap<string, ReadonlySet<string>> {
  const standing = new Map<string, { value: JsonValue; actors: Set<string> }>();
  for (const event of liveFieldConfirmedEvents(events)) {
    for (const [path, entry] of standing) {
      if (path !== event.path && reviewPathsOverlap(path, event.path)) {
        standing.delete(path);
      } else if (path === event.path && !jsonValuesEqual(entry.value, event.value)) {
        standing.delete(path);
      }
    }
    const entry = standing.get(event.path);
    if (entry) {
      entry.actors.add(event.actor_id);
    } else {
      standing.set(event.path, { value: event.value, actors: new Set([event.actor_id]) });
    }
  }
  const approvers = new Map<string, ReadonlySet<string>>();
  for (const [path, entry] of standing) approvers.set(path, entry.actors);
  return approvers;
}

/**
 * The completion the run currently stands on, or none when it was taken back.
 *
 * Replayed rather than stored so the status and the audit trail cannot drift:
 * a completion event makes itself the live one, a retraction clears it, and a
 * reopened run can be signed off again.
 */
export function liveCompletionEvent(
  events: readonly ExtractionReviewEvent[]
): CompletionReviewEvent | null {
  let live: CompletionReviewEvent | null = null;
  for (const event of events) {
    if (event.type === 'approved' || event.type === 'rejected') live = event;
    else if (event.type === 'completion_retracted') live = null;
  }
  return live;
}
