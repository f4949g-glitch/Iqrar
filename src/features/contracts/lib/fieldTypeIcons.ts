import {
  AlignLeft,
  Calendar,
  Check,
  Clock,
  File,
  Hash,
  Image,
  ListChecks,
  Mail,
  PenLine,
  Phone,
  Stamp,
  type LucideIcon,
} from 'lucide-react';
import type { FieldType } from '../types';

// أيقونة مميّزة لكل نوع حقل، لتمييز الأنواع بصريًا بلمحة سريعة بدل الاعتماد
// على النص فقط (داخل محرّر العقد وشاشة تعبئة الحقول عند التوقيع).
export const FIELD_TYPE_ICONS: Record<FieldType, LucideIcon> = {
  text: AlignLeft,
  number: Hash,
  email: Mail,
  phone: Phone,
  date: Calendar,
  time: Clock,
  signature: PenLine,
  image: Image,
  logo: Image,
  stamp: Stamp,
  checkbox: Check,
  select: ListChecks,
  textarea: AlignLeft,
  file: File,
};
