import type { ParsedDocument } from '@openparser/schema';
import { ParsedDocumentSchema } from '@openparser/schema';
import { describe, expect, test } from 'bun:test';
import { renderGroundedDocument, truncateParsedDocumentToCharBudget } from './sources';

const TWO_ELEMENT_DOC: ParsedDocument = {
  output_format: 'openparser@1',
  document_id: 'doc_trunc',
  provenance: { provider: 'test', model: 'test' },
  text: 'Hello world\nGoodbye moon',
  markdown: 'Hello world\nGoodbye moon',
  pages: [
    {
      number: 1,
      width: 100,
      height: 100,
      unit: 'pixel',
      rotation_degrees: 0,
      languages: [],
      element_ids: ['e0', 'e1'],
      reading_order: ['e0', 'e1'],
    },
  ],
  elements: [
    {
      id: 'e0',
      kind: 'text',
      role: 'paragraph',
      text: 'Hello world',
      spans: [],
      languages: [],
      locations: [{ page_number: 1, bbox: { left: 1, top: 1, right: 20, bottom: 10 } }],
    },
    {
      id: 'e1',
      kind: 'text',
      role: 'paragraph',
      text: 'Goodbye moon',
      spans: [],
      languages: [],
      locations: [{ page_number: 1, bbox: { left: 1, top: 12, right: 20, bottom: 22 } }],
    },
  ],
  text_annotations: [],
  relations: [],
  assets: [],
};

describe('truncateParsedDocumentToCharBudget', () => {
  test('keeps the full document when the tagged rendering fits', () => {
    const rendered = renderGroundedDocument(TWO_ELEMENT_DOC);
    const result = truncateParsedDocumentToCharBudget(TWO_ELEMENT_DOC, rendered.length);
    expect(result.truncated).toBe(false);
    expect(result.document).toBe(TWO_ELEMENT_DOC);
    expect(result.keptElementIds).toEqual(['e0', 'e1']);
  });

  test('drops trailing elements at a tag boundary and keeps citations consistent', () => {
    const firstBlock = renderGroundedDocument({
      ...TWO_ELEMENT_DOC,
      pages: [
        {
          ...TWO_ELEMENT_DOC.pages[0]!,
          element_ids: ['e0'],
          reading_order: ['e0'],
        },
      ],
      elements: [TWO_ELEMENT_DOC.elements[0]!],
      text: 'Hello world',
      markdown: 'Hello world',
    });
    const result = truncateParsedDocumentToCharBudget(TWO_ELEMENT_DOC, firstBlock.length + 8);
    expect(result.truncated).toBe(true);
    expect(result.keptElementIds).toEqual(['e0']);
    expect(result.document.elements.map((element) => element.id)).toEqual(['e0']);
    expect(renderGroundedDocument(result.document)).toBe(firstBlock);
    expect(renderGroundedDocument(result.document)).not.toContain('e1');
  });

  test('keeps the first element even when it exceeds the budget', () => {
    const result = truncateParsedDocumentToCharBudget(TWO_ELEMENT_DOC, 1);
    expect(result.truncated).toBe(true);
    expect(result.keptElementIds).toEqual(['e0']);
  });

  test('preserves empty leading page slots for canonical page numbering', () => {
    const blankLeadingPageDoc: ParsedDocument = {
      output_format: 'openparser@1',
      document_id: 'doc_blank_leading',
      provenance: { provider: 'test', model: 'test' },
      text: 'Page two\nPage three',
      markdown: 'Page two\nPage three',
      pages: [
        {
          number: 1,
          width: 100,
          height: 100,
          unit: 'pixel',
          rotation_degrees: 0,
          languages: [],
          element_ids: [],
          reading_order: [],
        },
        {
          number: 2,
          width: 100,
          height: 100,
          unit: 'pixel',
          rotation_degrees: 0,
          languages: [],
          element_ids: ['e2'],
          reading_order: ['e2'],
        },
        {
          number: 3,
          width: 100,
          height: 100,
          unit: 'pixel',
          rotation_degrees: 0,
          languages: [],
          element_ids: ['e3'],
          reading_order: ['e3'],
        },
      ],
      elements: [
        {
          id: 'e2',
          kind: 'text',
          role: 'paragraph',
          text: 'Page two',
          spans: [],
          languages: [],
          locations: [{ page_number: 2, bbox: { left: 1, top: 1, right: 20, bottom: 10 } }],
        },
        {
          id: 'e3',
          kind: 'text',
          role: 'paragraph',
          text: 'Page three',
          spans: [],
          languages: [],
          locations: [{ page_number: 3, bbox: { left: 1, top: 1, right: 20, bottom: 10 } }],
        },
      ],
      text_annotations: [],
      relations: [],
      assets: [],
    };

    const rendered = renderGroundedDocument(blankLeadingPageDoc);
    const result = truncateParsedDocumentToCharBudget(blankLeadingPageDoc, rendered.length);

    expect(result.truncated).toBe(false);
    expect(ParsedDocumentSchema.parse(result.document)).toEqual(result.document);
    expect(result.document.pages.map((page) => page.number)).toEqual([1, 2, 3]);
    expect(result.document.pages[0]?.element_ids).toEqual([]);
    expect(result.document.pages[0]?.reading_order).toEqual([]);
    expect(result.document.elements.map((element) => element.locations[0]?.page_number)).toEqual([
      2, 3,
    ]);
    expect(renderGroundedDocument(result.document)).toContain('page="2"');
    expect(renderGroundedDocument(result.document)).toContain('page="3"');
  });

  test('preserves empty leading page slots when trailing elements are dropped', () => {
    const blankLeadingPageDoc: ParsedDocument = {
      output_format: 'openparser@1',
      document_id: 'doc_blank_leading_trunc',
      provenance: { provider: 'test', model: 'test' },
      text: 'Page two\nPage three',
      markdown: 'Page two\nPage three',
      pages: [
        {
          number: 1,
          width: 100,
          height: 100,
          unit: 'pixel',
          rotation_degrees: 0,
          languages: [],
          element_ids: [],
          reading_order: [],
        },
        {
          number: 2,
          width: 100,
          height: 100,
          unit: 'pixel',
          rotation_degrees: 0,
          languages: [],
          element_ids: ['e2'],
          reading_order: ['e2'],
        },
        {
          number: 3,
          width: 100,
          height: 100,
          unit: 'pixel',
          rotation_degrees: 0,
          languages: [],
          element_ids: ['e3'],
          reading_order: ['e3'],
        },
      ],
      elements: [
        {
          id: 'e2',
          kind: 'text',
          role: 'paragraph',
          text: 'Page two',
          spans: [],
          languages: [],
          locations: [{ page_number: 2, bbox: { left: 1, top: 1, right: 20, bottom: 10 } }],
        },
        {
          id: 'e3',
          kind: 'text',
          role: 'paragraph',
          text: 'Page three',
          spans: [],
          languages: [],
          locations: [{ page_number: 3, bbox: { left: 1, top: 1, right: 20, bottom: 10 } }],
        },
      ],
      text_annotations: [],
      relations: [],
      assets: [],
    };

    const pageTwoOnlyDoc: ParsedDocument = {
      ...blankLeadingPageDoc,
      pages: blankLeadingPageDoc.pages.slice(0, 2),
      elements: [blankLeadingPageDoc.elements[0]!],
      text: 'Page two',
      markdown: 'Page two',
    };
    const pageTwoBlock = renderGroundedDocument(pageTwoOnlyDoc);
    const result = truncateParsedDocumentToCharBudget(blankLeadingPageDoc, pageTwoBlock.length + 8);

    expect(result.truncated).toBe(true);
    expect(result.keptElementIds).toEqual(['e2']);
    expect(ParsedDocumentSchema.parse(result.document)).toEqual(result.document);
    expect(result.document.pages.map((page) => page.number)).toEqual([1, 2]);
    expect(result.document.pages[0]?.element_ids).toEqual([]);
    expect(result.document.elements[0]?.locations[0]?.page_number).toBe(2);
    expect(renderGroundedDocument(result.document)).toBe(pageTwoBlock);
    expect(renderGroundedDocument(result.document)).not.toContain('e3');
  });
});
