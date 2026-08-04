import type { DocumentElement, DocumentPage, DocumentRelation } from '@openparser/schema';
import { expect, test } from 'bun:test';
import { renderCanonicalMarkdown } from './render';
import { renderTableElement } from './table';

test('renders top-level graph content without repeating contained OCR detail', () => {
  const pages: DocumentPage[] = [
    {
      number: 1,
      source_page_number: 1,
      width: 1,
      height: 1,
      unit: 'normalized',
      rotation_degrees: 0,
      languages: [],
      element_ids: ['heading', 'line', 'word', 'standalone', 'mark'],
      reading_order: ['heading', 'line', 'word', 'standalone', 'mark'],
    },
  ];
  const elements: DocumentElement[] = [
    {
      id: 'heading',
      kind: 'text',
      role: 'heading',
      text: 'Summary',
      spans: [],
      languages: [],
      locations: [],
    },
    {
      id: 'line',
      kind: 'text',
      role: 'line',
      text: 'Summary',
      spans: [],
      languages: [],
      locations: [],
    },
    {
      id: 'word',
      kind: 'text',
      role: 'word',
      text: 'Summary',
      spans: [],
      languages: [],
      locations: [],
    },
    {
      id: 'standalone',
      kind: 'text',
      role: 'line',
      text: 'Body copy',
      spans: [],
      languages: [],
      locations: [],
    },
    {
      id: 'mark',
      kind: 'selection_mark',
      mark_type: 'checkbox',
      state: 'selected',
      locations: [],
    },
  ];

  expect(
    renderCanonicalMarkdown({
      pages,
      elements,
      relations: [
        { type: 'contains', from_id: 'heading', to_id: 'line' },
        { type: 'contains', from_id: 'line', to_id: 'word' },
      ],
    })
  ).toBe('## Summary\n\nBody copy\n\n- [x]');
});

test('keeps section body when section is absent from reading order', () => {
  const pages: DocumentPage[] = [
    {
      number: 1,
      source_page_number: 1,
      width: 1,
      height: 1,
      unit: 'normalized',
      rotation_degrees: 0,
      languages: [],
      element_ids: ['kv', 'section'],
      reading_order: ['kv'],
    },
  ];
  const elements: DocumentElement[] = [
    {
      id: 'section',
      kind: 'section',
      role: 'section',
      title: 'Details',
      spans: [],
      locations: [],
    },
    {
      id: 'kv',
      kind: 'key_value',
      key: { text: 'Invoice', spans: [], locations: [] },
      value: { text: '42', spans: [], locations: [] },
      locations: [],
    },
  ];
  const relations: DocumentRelation[] = [{ type: 'contains', from_id: 'section', to_id: 'kv' }];

  expect(renderCanonicalMarkdown({ pages, elements, relations })).toBe('**Invoice:** 42');
});

test('renders section title and body when section is in reading order', () => {
  const pages: DocumentPage[] = [
    {
      number: 1,
      source_page_number: 1,
      width: 1,
      height: 1,
      unit: 'normalized',
      rotation_degrees: 0,
      languages: [],
      element_ids: ['section', 'para'],
      reading_order: ['section'],
    },
  ];
  const elements: DocumentElement[] = [
    {
      id: 'section',
      kind: 'section',
      role: 'section',
      title: 'Overview',
      spans: [],
      locations: [],
    },
    {
      id: 'para',
      kind: 'text',
      role: 'paragraph',
      text: 'Body copy',
      spans: [],
      languages: [],
      locations: [],
    },
  ];

  expect(
    renderCanonicalMarkdown({
      pages,
      elements,
      relations: [{ type: 'contains', from_id: 'section', to_id: 'para' }],
    })
  ).toBe('## Overview\n\nBody copy');
});

test('table render prefers cells over conflicting html and markdown', () => {
  expect(
    renderTableElement({
      cells: [
        {
          id: 'c0',
          row_index: 0,
          column_index: 0,
          row_span: 1,
          column_span: 1,
          role: 'body',
          text: 'from-cells',
          spans: [],
          locations: [],
          element_ids: [],
        },
      ],
      row_count: 1,
      html: '<table><tr><td>from-html</td></tr></table>',
      markdown: '| from-markdown |',
    })
  ).toBe('<table><tr><td>from-cells</td></tr></table>');

  expect(
    renderTableElement({
      cells: [],
      row_count: 0,
      html: '<table><tr><td>from-html</td></tr></table>',
      markdown: '| from-markdown |',
    })
  ).toBe('<table><tr><td>from-html</td></tr></table>');

  expect(
    renderTableElement({
      cells: [],
      row_count: 0,
      markdown: '| from-markdown |',
    })
  ).toBe('| from-markdown |');
});
