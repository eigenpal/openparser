import {
  assertParsedDocumentElementKinds,
  parseParsedDocumentWithElementKinds,
  type ParsedDocument,
} from '@openparser/schema';
import { expect, test } from 'bun:test';
import { AWS_TEXTRACT_DETECT_OUTPUT_CAPABILITIES } from './aws-textract/output';
import { mapLayoutResultsToParsedDocument } from './paddle/convert';
import { PADDLE_LAYOUT_OUTPUT_CAPABILITIES } from './paddle/output';
import { parseCanonicalWithCapabilities } from './shared/parse-canonical';

test('parseCanonicalWithCapabilities preserves narrowed element kinds', () => {
  const narrowed = parseCanonicalWithCapabilities(
    mapLayoutResultsToParsedDocument({
      documentId: 'doc_parse',
      pages: [{ number: 1, width: 100, height: 100 }],
      layoutResults: [
        {
          prunedResult: {
            parsing_res_list: [
              { block_label: 'text', block_content: 'x', block_bbox: [0, 0, 10, 10] },
            ],
          },
        },
      ],
    }),
    PADDLE_LAYOUT_OUTPUT_CAPABILITIES
  );
  assertParsedDocumentElementKinds(narrowed, PADDLE_LAYOUT_OUTPUT_CAPABILITIES.elementKinds);
});

test('parseParsedDocumentWithElementKinds rejects unexpected element kinds', () => {
  const document: ParsedDocument = {
    output_format: 'openparser@1',
    document_id: 'doc_bad',
    provenance: { provider: 'test', model: 'test', operation: 'test' },
    text: 'x',
    markdown: 'x',
    pages: [
      {
        number: 1,
        width: 1,
        height: 1,
        unit: 'normalized',
        rotation_degrees: 0,
        languages: [],
        element_ids: [],
        reading_order: [],
      },
    ],
    elements: [
      {
        id: 'el-1',
        kind: 'table',
        row_count: 1,
        column_count: 1,
        cells: [],
        html: '<table></table>',
        locations: [],
      },
    ],
    text_annotations: [],
    relations: [],
    assets: [],
  };

  expect(() =>
    parseParsedDocumentWithElementKinds(
      document,
      AWS_TEXTRACT_DETECT_OUTPUT_CAPABILITIES.elementKinds
    )
  ).toThrow(/kind table/);
});
