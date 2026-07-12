import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { MERGE_FIELD_LABELS, FIELD_TYPE_LABELS, type FieldType, type MergeFieldKey } from '../types';

export interface MergeFieldAttrs {
  partyId: string;
  partyLabel: string;
  fieldKey: MergeFieldKey;
  // لون مميّز للطرف صاحب الحقل (يُحفَظ وقت الإدراج) بدل لون موحّد لكل الحقول،
  // ليسهل تمييز حقول كل طرف داخل المستند بلمحة سريعة.
  partyColor: string;
}

function MergeFieldView({ node }: NodeViewProps) {
  const { partyLabel, fieldKey, partyColor } = node.attrs as unknown as MergeFieldAttrs;
  const color = partyColor || '#2955D8';
  return (
    <NodeViewWrapper
      as="span"
      className="mx-0.5 inline-flex items-center rounded px-1.5 py-0.5 text-xs font-bold"
      style={{ background: `${color}1a`, color }}
    >
      {`{{${partyLabel}: ${MERGE_FIELD_LABELS[fieldKey]}}}`}
    </NodeViewWrapper>
  );
}

export const MergeFieldNode = Node.create({
  name: 'mergeField',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      partyId: { default: '' },
      partyLabel: { default: '' },
      fieldKey: { default: 'full_name' },
      partyColor: { default: '#2955D8' },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-merge-field]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-merge-field': 'true' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MergeFieldView);
  },
});

export interface FillFieldAttrs {
  anchorId: string;
  partyId: string;
  partyLabel: string;
  fieldType: FieldType;
  label: string;
  required: boolean;
  partyColor: string;
}

function FillFieldView({ node }: NodeViewProps) {
  const { partyLabel, fieldType, label, required, partyColor } = node.attrs as unknown as FillFieldAttrs;
  const color = partyColor || '#1F7A5C';
  return (
    <NodeViewWrapper
      as="span"
      className="mx-0.5 inline-flex items-center gap-1 rounded border border-dashed px-1.5 py-0.5 text-xs font-bold"
      style={{ borderColor: color, background: `${color}1a`, color }}
    >
      [{label || FIELD_TYPE_LABELS[fieldType]} — {partyLabel}
      {required ? '*' : ''}]
    </NodeViewWrapper>
  );
}

export const FillFieldNode = Node.create({
  name: 'fillField',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      anchorId: { default: '' },
      partyId: { default: '' },
      partyLabel: { default: '' },
      fieldType: { default: 'text' },
      label: { default: '' },
      required: { default: true },
      partyColor: { default: '#1F7A5C' },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-fill-field]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-fill-field': 'true' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FillFieldView);
  },
});
