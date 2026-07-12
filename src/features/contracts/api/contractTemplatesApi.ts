import type { JSONContent } from '@tiptap/react';
import { supabase } from '@/lib/supabase/client';
import { translateErrorMessage } from '@/shared/lib/errorMessage';
import type { DocumentType } from '../types';

export interface ContractTemplate {
  id: string;
  title: string;
  document_type: DocumentType;
  body_json: JSONContent;
  party_count: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TemplateAccessGrant {
  template_id: string;
  user_id: string;
  granted_by: string;
  created_at: string;
}

export interface NewContractTemplateInput {
  title: string;
  document_type: DocumentType;
  body_json: JSONContent;
  party_count: number;
}

export async function listAllTemplates(): Promise<ContractTemplate[]> {
  const { data, error } = await supabase.from('contract_templates').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(translateErrorMessage(error.message));
  return data as unknown as ContractTemplate[];
}

export async function createTemplate(input: NewContractTemplateInput): Promise<ContractTemplate> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('غير مسجّل الدخول');
  const { data, error } = await supabase
    .from('contract_templates')
    .insert({ ...input, body_json: input.body_json as never, created_by: userData.user.id })
    .select()
    .single();
  if (error) throw new Error(translateErrorMessage(error.message));
  return data as unknown as ContractTemplate;
}

export async function updateTemplate(id: string, patch: Partial<NewContractTemplateInput>): Promise<ContractTemplate> {
  const { data, error } = await supabase
    .from('contract_templates')
    .update({ ...patch, body_json: patch.body_json as never, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(translateErrorMessage(error.message));
  return data as unknown as ContractTemplate;
}

export async function toggleTemplate(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from('contract_templates').update({ is_active: isActive }).eq('id', id);
  if (error) throw new Error(translateErrorMessage(error.message));
}

export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await supabase.from('contract_templates').delete().eq('id', id);
  if (error) throw new Error(translateErrorMessage(error.message));
}

export async function listTemplateAccess(templateId: string): Promise<TemplateAccessGrant[]> {
  const { data, error } = await supabase.from('contract_template_access').select('*').eq('template_id', templateId);
  if (error) throw new Error(translateErrorMessage(error.message));
  return data as TemplateAccessGrant[];
}

// يستبدل كل قائمة المستخدمين المسموح لهم بالقالب بالقائمة الجديدة (حذف الكل ثم
// إدراج المُختار)، بدل حساب فرق دقيق — أبسط ومطابق لحجم البيانات المتوقع هنا.
export async function setTemplateAccess(templateId: string, userIds: string[]): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('غير مسجّل الدخول');
  const { error: deleteError } = await supabase.from('contract_template_access').delete().eq('template_id', templateId);
  if (deleteError) throw new Error(translateErrorMessage(deleteError.message));
  if (userIds.length === 0) return;
  const { error: insertError } = await supabase
    .from('contract_template_access')
    .insert(userIds.map((userId) => ({ template_id: templateId, user_id: userId, granted_by: userData.user!.id })));
  if (insertError) throw new Error(translateErrorMessage(insertError.message));
}

// بلا أي فلترة صريحة بمعرّف المستخدم: الاعتماد الكامل على سياسة RLS
// contract_templates_select التي تقتصر النتائج على القوالب المخصَّصة له فعليًا.
export async function listMyTemplates(): Promise<ContractTemplate[]> {
  const { data, error } = await supabase.from('contract_templates').select('*').eq('is_active', true).order('created_at', { ascending: false });
  if (error) throw new Error(translateErrorMessage(error.message));
  return data as unknown as ContractTemplate[];
}

export async function countMyTemplates(): Promise<number> {
  const { count, error } = await supabase
    .from('contract_templates')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true);
  if (error) throw new Error(translateErrorMessage(error.message));
  return count ?? 0;
}

export async function getContractTemplate(id: string): Promise<ContractTemplate> {
  const { data, error } = await supabase.from('contract_templates').select('*').eq('id', id).single();
  if (error) throw new Error(translateErrorMessage(error.message));
  return data as unknown as ContractTemplate;
}
