import { useEffect, useState } from 'react';
import { useEditor, EditorContent, type Editor, type JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TableKit } from '@tiptap/extension-table';
import TextAlign from '@tiptap/extension-text-align';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Table as TableIcon,
  Heading1,
  Heading2,
  Braces,
  PenLine,
  AlignRight,
  AlignCenter,
  AlignLeft,
  AlignJustify,
  Rows3,
  Columns3,
  Trash2,
} from 'lucide-react';
import Underline from '@tiptap/extension-underline';
import { MergeFieldNode, FillFieldNode } from './extensions';
import { FIELD_TYPE_LABELS, MERGE_FIELD_LABELS, type ContractParty, type FieldType, type MergeFieldKey } from '../types';

const FILLABLE_TYPES: FieldType[] = ['text', 'number', 'date', 'signature', 'checkbox', 'textarea'];

// لون ثابت لكل طرف حسب ترتيبه (نفس لوحة الألوان المستخدمة في خطوة تحديد حقول
// PDF الجاهز)، ليسهل تمييز حقول كل طرف داخل المستند بلمحة سريعة بدل لون رمادي موحّد.
const PARTY_COLORS = ['#C9922B', '#4C7A6B', '#B5533C', '#5B6B82', '#8B5CF6', '#0EA5E9'];
function colorForParty(parties: ContractParty[], partyId: string): string {
  const index = parties.findIndex((p) => p.id === partyId);
  return PARTY_COLORS[index % PARTY_COLORS.length] ?? PARTY_COLORS[0];
}

// إدراج حقل دمج/تعبئة ملاصقًا مباشرة للنص المجاور بلا مسافة كان يُنتج عند
// الحفظ نصًا ملتصقًا بلا فواصل (مثل "فلانالنص"). نتحقق من الحرف قبل/بعد نقطة
// الإدراج ونضيف مسافة تلقائيًا فقط إن لم تكن موجودة أصلًا، بدل مسافة ثابتة قد
// تُضاعِف مسافة كتبها المستخدم بنفسه.
function insertNodeWithSpacing(editor: Editor, node: JSONContent) {
  const { from } = editor.state.selection;
  const before = from > 0 ? editor.state.doc.textBetween(from - 1, from) : '';
  const after = from < editor.state.doc.content.size ? editor.state.doc.textBetween(from, from + 1) : '';
  const content: JSONContent[] = [];
  if (before && !/\s/.test(before)) content.push({ type: 'text', text: ' ' });
  content.push(node);
  if (after && !/\s/.test(after)) content.push({ type: 'text', text: ' ' });
  editor.chain().focus().insertContent(content).run();
}

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
    extensions: [
      StarterKit,
      Underline,
      TableKit.configure({ table: { resizable: false } }),
      TextAlign.configure({ types: ['heading', 'paragraph'], defaultAlignment: 'right' }),
      MergeFieldNode,
      FillFieldNode,
    ],
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
    insertNodeWithSpacing(editor, {
      type: 'mergeField',
      attrs: {
        partyId: party.id,
        partyLabel: `${party.role_label} — ${party.full_name}`,
        fieldKey,
        partyColor: colorForParty(parties, party.id),
      },
    });
  };

  const insertFillField = () => {
    const party = parties.find((p) => p.id === fillParty);
    if (!party) return;
    insertNodeWithSpacing(editor, {
      type: 'fillField',
      attrs: {
        anchorId: crypto.randomUUID(),
        partyId: party.id,
        partyLabel: `${party.role_label} — ${party.full_name}`,
        fieldType: fillType,
        label: FIELD_TYPE_LABELS[fillType],
        required: true,
        partyColor: colorForParty(parties, party.id),
      },
    });
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
        {editor.isActive('table') && (
          <>
            <ToolbarButton title="إضافة صف" onClick={() => editor.chain().focus().addRowAfter().run()}>
              <Rows3 size={16} />
            </ToolbarButton>
            <ToolbarButton title="حذف صف" onClick={() => editor.chain().focus().deleteRow().run()}>
              <span className="relative">
                <Rows3 size={16} />
                <Trash2 size={9} className="absolute -bottom-1 -left-1" />
              </span>
            </ToolbarButton>
            <ToolbarButton title="إضافة عمود" onClick={() => editor.chain().focus().addColumnAfter().run()}>
              <Columns3 size={16} />
            </ToolbarButton>
            <ToolbarButton title="حذف عمود" onClick={() => editor.chain().focus().deleteColumn().run()}>
              <span className="relative">
                <Columns3 size={16} />
                <Trash2 size={9} className="absolute -bottom-1 -left-1" />
              </span>
            </ToolbarButton>
          </>
        )}
        <span className="mx-1 h-5 w-px shrink-0 bg-line" aria-hidden="true" />
        <ToolbarButton title="محاذاة لليمين" active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()}>
          <AlignRight size={16} />
        </ToolbarButton>
        <ToolbarButton title="توسيط" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}>
          <AlignCenter size={16} />
        </ToolbarButton>
        <ToolbarButton title="محاذاة لليسار" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}>
          <AlignLeft size={16} />
        </ToolbarButton>
        <ToolbarButton title="ضبط" active={editor.isActive({ textAlign: 'justify' })} onClick={() => editor.chain().focus().setTextAlign('justify').run()}>
          <AlignJustify size={16} />
        </ToolbarButton>
      </div>

      {/* قسمان منفصلان بعنوان وأيقونة واضحين بدل عناصر متجاورة بلا تمييز، ليسهل
          التفريق بين "حقل دمج" (يُستبدَل ببيانات الطرف تلقائيًا) و"حقل تعبئة"
          (يملؤه الطرف بنفسه عند التوقيع). نقطة اللون بجانب كل قائمة أطراف تطابق
          لون شارات الحقول المُدرَجة لنفس الطرف داخل المستند. */}
      <div className="grid grid-cols-1 gap-2 border-b border-line p-2 sm:grid-cols-2">
        <div className="rounded-lg bg-sealLight p-2">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-seal">
            <Braces size={14} /> حقل دمج (يُستبدَل تلقائيًا ببيانات الطرف)
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colorForParty(parties, mergeParty) }} aria-hidden="true" />
            <select value={mergeParty} onChange={(e) => setMergeParty(e.target.value)} className="rounded-lg border border-line bg-card px-2 py-1 text-xs text-ink">
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
              className="rounded-lg border border-seal bg-card px-2 py-1 text-xs font-bold text-seal"
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
          </div>
        </div>

        <div className="rounded-lg bg-sageLight p-2">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-sage">
            <PenLine size={14} /> حقل تعبئة (يملؤه الطرف بنفسه عند التوقيع)
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colorForParty(parties, fillParty) }} aria-hidden="true" />
            <select value={fillParty} onChange={(e) => setFillParty(e.target.value)} className="rounded-lg border border-line bg-card px-2 py-1 text-xs text-ink">
              {parties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.role_label} — {p.full_name || 'بلا اسم'}
                </option>
              ))}
            </select>
            <select value={fillType} onChange={(e) => setFillType(e.target.value as FieldType)} className="rounded-lg border border-line bg-card px-2 py-1 text-xs text-ink">
              {FILLABLE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {FIELD_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            <button type="button" onClick={insertFillField} className="rounded-lg border border-sage bg-card px-2 py-1 text-xs font-bold text-sage">
              + إدراج
            </button>
          </div>
        </div>
      </div>
      {/* سطح التحرير أبيض دائمًا بصرف النظر عن وضع الموقع (فاتح/داكن): محتواه
          مستند رسمي (نص أسود ثابت عبر .prose، انظر index.css) يُطبَع/يُنزَّل
          بهذا الشكل تمامًا، فبقاؤه كورقة بيضاء أوضح للمستخدم من تتبّع تبديل
          الوضع الداكن، ويتفادى نصًا أسود غير مقروء فوق خلفية داكنة. */}
      <EditorContent
        editor={editor}
        className="prose max-w-none rounded-b-xl bg-white p-4 text-ink [&_.ProseMirror]:min-h-[300px] [&_.ProseMirror]:outline-none"
      />
    </div>
  );
}
