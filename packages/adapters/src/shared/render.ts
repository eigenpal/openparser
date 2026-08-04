import type {
  DocumentAsset,
  DocumentElement,
  DocumentPage,
  DocumentRelation,
} from '@openparser/schema';
import { renderTableElement } from './table';

/** Parents that group other content without themselves being OCR-detail substitutes. */
function isStructuralContainer(element: DocumentElement): boolean {
  return element.kind === 'section';
}

export function renderCanonicalMarkdown(input: {
  pages: DocumentPage[];
  elements: DocumentElement[];
  relations?: DocumentRelation[];
  assets?: DocumentAsset[];
}): string {
  const elementById = new Map(input.elements.map((element) => [element.id, element]));
  const assetById = new Map((input.assets ?? []).map((asset) => [asset.id, asset]));
  const containsRelations = (input.relations ?? []).filter(
    (relation) => relation.type === 'contains'
  );

  return input.pages
    .map((page) => {
      const orderedIds = page.reading_order.length > 0 ? page.reading_order : page.element_ids;
      const orderedIdSet = new Set(orderedIds);

      // Suppress contained children of content-bearing parents (table→words, text→lines).
      // Structural containers (sections) suppress children only when the container itself
      // is in this page's reading order — then the container renders the body. When the
      // section is absent from reading order (e.g. Azure sections lack locations), keep
      // children visible so section bodies are not dropped.
      const suppressedContainedIds = new Set(
        containsRelations
          .filter((relation) => {
            const parent = elementById.get(relation.from_id);
            if (!parent) return false;
            if (isStructuralContainer(parent)) return orderedIdSet.has(parent.id);
            return true;
          })
          .map((relation) => relation.to_id)
      );

      let elements = orderedIds
        .map((id) => elementById.get(id))
        .filter((element): element is DocumentElement => element !== undefined)
        .filter((element) => !suppressedContainedIds.has(element.id));

      if (elements.some((element) => element.kind === 'text' && element.role === 'line')) {
        elements = elements.filter(
          (element) =>
            element.kind !== 'text' || (element.role !== 'word' && element.role !== 'symbol')
        );
      } else if (elements.some((element) => element.kind === 'text' && element.role === 'word')) {
        elements = elements.filter(
          (element) => element.kind !== 'text' || element.role !== 'symbol'
        );
      }

      return elements
        .map((element) => renderElement(element, assetById, elementById, containsRelations))
        .filter(Boolean)
        .join('\n\n');
    })
    .filter(Boolean)
    .join('\n\n');
}

function renderElement(
  element: DocumentElement,
  assetById: Map<string, DocumentAsset>,
  elementById: Map<string, DocumentElement>,
  containsRelations: DocumentRelation[],
  ancestors: ReadonlySet<string> = new Set()
): string {
  if (ancestors.has(element.id)) return '';
  switch (element.kind) {
    case 'text':
      if (!element.text.trim()) return '';
      if (element.role === 'document_title') return `# ${element.text}`;
      if (element.role === 'heading') return `## ${element.text}`;
      if (element.role === 'list_item') return `- ${element.text}`;
      if (element.role === 'code') return `\`\`\`\n${element.text}\n\`\`\``;
      return element.text;
    case 'table':
      return renderTableElement(element);
    case 'figure': {
      const label = element.caption ?? element.alt_text;
      const uri = element.asset_id ? assetById.get(element.asset_id)?.uri : undefined;
      if (uri) return `![${escapeMarkdownLabel(label ?? 'Figure')}](${uri})`;
      return label?.trim() ? `[Figure: ${label}]` : '';
    }
    case 'formula':
      return element.value
        ? element.format === 'latex'
          ? `$$${element.value}$$`
          : element.value
        : '';
    case 'key_value':
      return `**${escapeMarkdownText(element.key.text)}:** ${element.value.text}`;
    case 'query_answer':
      return `**${escapeMarkdownText(element.query.text)}:** ${element.answer?.text ?? ''}`;
    case 'section': {
      const title = element.title?.trim() ? `## ${element.title}` : '';
      const childAncestors = new Set(ancestors).add(element.id);
      const body = containsRelations
        .filter((relation) => relation.from_id === element.id)
        .map((relation) => elementById.get(relation.to_id))
        .filter((child): child is DocumentElement => child !== undefined)
        .map((child) =>
          renderElement(child, assetById, elementById, containsRelations, childAncestors)
        )
        .filter(Boolean)
        .join('\n\n');
      return [title, body].filter(Boolean).join('\n\n');
    }
    case 'selection_mark':
      return element.state === 'selected'
        ? '- [x]'
        : element.state === 'unselected'
          ? '- [ ]'
          : '- [-]';
    case 'signature':
      return element.text ? `[Signature: ${element.text}]` : '[Signature]';
    case 'barcode':
      return `\`${element.value}\``;
    case 'link':
      return `[${escapeMarkdownLabel(element.text ?? element.url)}](${element.url})`;
    case 'stamp':
      return element.text ? `[Stamp: ${element.text}]` : '[Stamp]';
    case 'other':
      return element.text ?? `[${element.label}]`;
  }
}

function escapeMarkdownLabel(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('[', '\\[').replaceAll(']', '\\]');
}

function escapeMarkdownText(value: string): string {
  return escapeMarkdownLabel(value)
    .replaceAll('*', '\\*')
    .replaceAll('_', '\\_')
    .replaceAll('`', '\\`');
}
