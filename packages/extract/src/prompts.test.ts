import { describe, expect, test } from 'bun:test';
import {
  EXTRACT_PROMPT,
  GROUNDED_EXTRACT_PROMPT,
  appendExtractionCallerPrompt,
  composeExtractionInstruction,
  composeExtractionUserMessage,
} from './prompts';

describe('canonical extraction prompts', () => {
  test('both modes ask for verbatim values; only grounding asks for citations', () => {
    for (const prompt of [EXTRACT_PROMPT, GROUNDED_EXTRACT_PROMPT]) {
      expect(prompt).toMatch(/exactly as it appears in the document/);
      expect(prompt).toMatch(/[Dd]o not normalize/);
    }
    expect(EXTRACT_PROMPT).not.toMatch(/quote/i);
    expect(GROUNDED_EXTRACT_PROMPT).toMatch(/Cite exact element ids/);
    expect(GROUNDED_EXTRACT_PROMPT).toMatch(/[Aa]lways give a quote/);
    expect(GROUNDED_EXTRACT_PROMPT).toMatch(/transform_claim/);
    expect(GROUNDED_EXTRACT_PROMPT).toMatch(/untrusted report/);
  });

  test('appendExtractionCallerPrompt keeps canonical instructions first', () => {
    expect(appendExtractionCallerPrompt(GROUNDED_EXTRACT_PROMPT)).toBe(GROUNDED_EXTRACT_PROMPT);
    expect(appendExtractionCallerPrompt(GROUNDED_EXTRACT_PROMPT, '  ')).toBe(
      GROUNDED_EXTRACT_PROMPT
    );
    const combined = appendExtractionCallerPrompt(GROUNDED_EXTRACT_PROMPT, 'Prefer letterhead.');
    expect(combined.startsWith(GROUNDED_EXTRACT_PROMPT)).toBe(true);
    expect(combined.endsWith('Prefer letterhead.')).toBe(true);
  });

  test('composeExtractionInstruction keeps repair out of document content', () => {
    const primary = composeExtractionInstruction({
      prompt: GROUNDED_EXTRACT_PROMPT,
      repairFeedback: null,
    });
    expect(primary).toBe(GROUNDED_EXTRACT_PROMPT);
    expect(primary).not.toContain('DOCUMENT:');

    const repair = composeExtractionInstruction({
      prompt: GROUNDED_EXTRACT_PROMPT,
      repairFeedback: {
        invalidJson: { greeting: 1 },
        errors: [{ path: '/greeting', kind: 'type', message: 'must be string' }],
      },
    });
    expect(repair.startsWith(GROUNDED_EXTRACT_PROMPT)).toBe(true);
    expect(repair).toContain('SCHEMA REPAIR:');
    expect(repair).not.toContain('DOCUMENT:');
  });

  test('composeExtractionUserMessage appends document and optional repair', () => {
    const primary = composeExtractionUserMessage({
      prompt: EXTRACT_PROMPT,
      documentText: 'Hello',
      repairFeedback: null,
    });
    expect(primary.startsWith(EXTRACT_PROMPT)).toBe(true);
    expect(primary).toContain('\n\nDOCUMENT:\nHello');
    expect(primary).not.toContain('SCHEMA REPAIR:');

    const repair = composeExtractionUserMessage({
      prompt: EXTRACT_PROMPT,
      documentText: 'Hello',
      repairFeedback: {
        invalidJson: { greeting: 1 },
        errors: [{ path: '/greeting', kind: 'type', message: 'must be string' }],
      },
    });
    expect(repair).toContain('SCHEMA REPAIR:');
    expect(repair).toContain('"greeting":1');
    expect(repair).toContain('must be string');
  });
});
