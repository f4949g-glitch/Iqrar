import type { JsonNode } from './renderContractHtml';
import type { FieldType } from '../types';

export interface ExtractedFillField {
  anchorId: string;
  partyId: string;
  fieldType: FieldType;
  label: string;
  required: boolean;
}

export function extractFillFields(doc: JsonNode): ExtractedFillField[] {
  const results: ExtractedFillField[] = [];

  function walk(node: JsonNode) {
    if (node.type === 'fillField' && node.attrs) {
      results.push({
        anchorId: String(node.attrs.anchorId ?? ''),
        partyId: String(node.attrs.partyId ?? ''),
        fieldType: (node.attrs.fieldType as FieldType) ?? 'text',
        label: String(node.attrs.label ?? ''),
        required: node.attrs.required !== false,
      });
    }
    for (const child of node.content ?? []) walk(child);
  }

  walk(doc);
  return results;
}
