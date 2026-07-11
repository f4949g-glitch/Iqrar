// يتحقق من عدم تكرار رقم الهوية بين طرفين مختلفين في نفس العقد (نفس الشخص لا
// يمكن أن يكون طرفًا أول وطرفًا ثانيًا معًا مثلًا). يتجاهل القيم الفارغة لأن
// رقم الهوية ليس إلزاميًا لكل الأطراف (مسار الإدخال اليدوي بلا نفاذ مثلًا).
export function findDuplicateNationalId(nationalIds: string[]): { firstIndex: number; secondIndex: number } | null {
  const owners = new Map<string, number>();
  for (let i = 0; i < nationalIds.length; i++) {
    const nid = nationalIds[i].trim();
    if (!nid) continue;
    const ownerIndex = owners.get(nid);
    if (ownerIndex !== undefined) return { firstIndex: ownerIndex, secondIndex: i };
    owners.set(nid, i);
  }
  return null;
}
