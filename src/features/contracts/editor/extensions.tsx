import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { MERGE_FIELD_LABELS, FIELD_TYPE_LABELS, type FieldType, type MergeFieldKey } from '../types';

export interface MergeFieldAttrs {
  partyId: string;
  partyLabel: string;
  fieldKey: MergeFieldKey;
}

function MergeFieldView({ node }: NodeViewProps) {
  const { partyLabel, fieldKey } = node.attrs as unknown as MergeFieldAttrs;
  return (
    <NodeViewWrapper as="span" className="mx-0.5 inline-flex items-center rounded bg-sealLight px-1.5 py-0.5 text-xs font-bold text-seal">
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
}

function FillFieldView({ node }: NodeViewProps) {
  const { partyLabel, fieldType, label, required } = node.attrs as unknown as FillFieldAttrs;
  return (
    <NodeViewWrapper
      as="span"
      className="mx-0.5 inline-flex items-center gap-1 rounded border border-dashed border-sage bg-sageLight px-1.5 py-0.5 text-xs font-bold text-sage"
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
