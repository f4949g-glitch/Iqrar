import { useEffect, useState } from 'react';
import { useEditor, EditorContent, type JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TableKit } from '@tiptap/extension-table';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Table as TableIcon,
  Heading1,
  Heading2,
} from 'lucide-react';
import Underline from '@tiptap/extension-underline';
import { MergeFieldNode, FillFieldNode } from './extensions';
import { FIELD_TYPE_LABELS, MERGE_FIELD_LABELS, type ContractParty, type FieldType, type MergeFieldKey } from '../types';

const FILLABLE_TYPES: FieldType[] = ['text', 'number', 'date', 'signature', 'checkbox', 'textarea'];

interface ContractEditorProps {
  parties: ContractParty[];
  content: JSONContent | null;
  onChange: (json: JSONContent) => void;
}

function ToolbarButton({ onClick, active, children, title }: { onClick: () => void; active?: boolean; children: React.ReactNode; title: string }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`rounded-lg p-2 transition ${active ? 'bg-seal text-white' : 'text-ink hover:bg-paper'}`}
    >
      {children}
    </button>
  );
}

export function ContractEditor({ parties, content, onChange }: ContractEditorProps) {
  const [mergeParty, setMergeParty] = useState(parties[0]?.id ?? '');
  const [fillParty, setFillParty] = useState(parties[0]?.id ?? '');
  const [fillType, setFillType] = useState<FieldType>('signature');

  const editor = useEditor({
    extensions: [StarterKit, Underline, TableKit.configure({ table: { resizable: false } }), MergeFieldNode, FillFieldNode],
    content: content ?? '<p></p>',
    onUpdate: ({ editor: e }) => onChange(e.getJSON()),
  });

  useEffect(() => {
    if (!mergeParty && parties[0]) setMergeParty(parties[0].id);
    if (!fillParty && parties[0]) setFillParty(parties[0].id);
  }, [parties, mergeParty, fillParty]);

  if (!editor) return null;

  const insertMergeField = (fieldKey: MergeFieldKey) => {
    const party = parties.find((p) => p.id === mergeParty);
    if (!party) return;
    editor
      .chain()
      .focus()
      .insertContent({
        type: 'mergeField',
        attrs: { partyId: party.id, partyLabel: `${party.role_label} — ${party.full_name}`, fieldKey },
      })
      .run();
  };

  const insertFillField = () => {
    const party = parties.find((p) => p.id === fillParty);
    if (!party) return;
    editor
      .chain()
      .focus()
      .insertContent({
        type: 'fillField',
        attrs: {
          anchorId: crypto.randomUUID(),
          partyId: party.id,
          partyLabel: `${party.role_label} — ${party.full_name}`,
          fieldType: fillType,
          label: FIELD_TYPE_LABELS[fillType],
          required: true,
        },
      })
      .run();
  };

  return (
    <div className="rounded-xl border border-line bg-card">
      <div className="flex flex-wrap items-center gap-1 border-b border-line p-2">
        <ToolbarButton title="عريض" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold size={16} />
        </ToolbarButton>
        <ToolbarButton title="مائل" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic size={16} />
        </ToolbarButton>
        <ToolbarButton title="تسطير" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon size={16} />
        </ToolbarButton>
        <ToolbarButton title="عنوان كبير" active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
          <Heading1 size={16} />
        </ToolbarButton>
        <ToolbarButton title="عنوان فرعي" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 size={16} />
        </ToolbarButton>
        <ToolbarButton title="قائمة نقطية" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List size={16} />
        </ToolbarButton>
        <ToolbarButton title="قائمة مرقّمة" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered size={16} />
        </ToolbarButton>
        <ToolbarButton title="إدراج جدول" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
          <TableIcon size={16} />
        </ToolbarButton>

        <div className="mx-2 h-6 w-px bg-line" />

        <select value={mergeParty} onChange={(e) => setMergeParty(e.target.value)} className="rounded-lg border border-line bg-white px-2 py-1 text-xs text-ink">
          {parties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.role_label} — {p.full_name || 'بلا اسم'}
            </option>
          ))}
        </select>
        <select
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) insertMergeField(e.target.value as MergeFieldKey);
            e.target.value = '';
          }}
          className="rounded-lg border border-seal bg-sealLight px-2 py-1 text-xs font-bold text-seal"
        >
          <option value="" disabled>
            + إدراج حقل دمج
          </option>
          {(Object.keys(MERGE_FIELD_LABELS) as MergeFieldKey[]).map((k) => (
            <option key={k} value={k}>
              {MERGE_FIELD_LABELS[k]}
            </option>
          ))}
        </select>

        <div className="mx-2 h-6 w-px bg-line" />

        <select value={fillParty} onChange={(e) => setFillParty(e.target.value)} className="rounded-lg border border-line bg-white px-2 py-1 text-xs text-ink">
          {parties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.role_label} — {p.full_name || 'بلا اسم'}
            </option>
          ))}
        </select>
        <select value={fillType} onChange={(e) => setFillType(e.target.value as FieldType)} className="rounded-lg border border-line bg-white px-2 py-1 text-xs text-ink">
          {FILLABLE_TYPES.map((t) => (
            <option key={t} value={t}>
              {FIELD_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <button type="button" onClick={insertFillField} className="rounded-lg border border-sage bg-sageLight px-2 py-1 text-xs font-bold text-sage">
          + إدراج حقل تعبئة
        </button>
      </div>
      <EditorContent editor={editor} className="prose max-w-none p-4 text-ink [&_.ProseMirror]:min-h-[300px] [&_.ProseMirror]:outline-none" />
    </div>
  );
}
