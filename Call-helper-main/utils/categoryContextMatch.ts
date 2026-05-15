/**
 * مطابقة فئات عربية للسياق (وصف المشكلة ↔ فئة المسار).
 * يدعم اختلاف التعريف: "تأشيرة" في النص و "التأشيرة" على المسار.
 */

export function stripLeadingAl(s: string): string {
  const t = (s || '').trim();
  if (t.startsWith('ال') && t.length > 3) return t.slice(2).trim();
  return t;
}

/**
 * جذر تقريبي لمقارنة فئات عربية (مفرد/جمع شائع)، مثال: «تأشيرة» ↔ «تأشيرات».
 * لا يُستخدم للنصوص الطويلة — للتسميات القصيرة فقط (فئات مسارات / معرفة).
 */
export function categoryStemKey(s: string): string {
  let bare = stripLeadingAl((s || '').trim());
  if (!bare) return '';
  if (bare.endsWith('ات') && bare.length > 4) {
    bare = bare.slice(0, -2);
  } else if (bare.endsWith('ة') && bare.length > 3) {
    bare = bare.slice(0, -1);
  } else if (bare.endsWith('ان') && bare.length > 4) {
    bare = bare.slice(0, -2);
  }
  return bare;
}

/** تطابق بين تسميتين للفئة (مثلاً من قاعدة المعرفة ومن المسار). */
export function categoryLabelsAlign(a: string, b: string): boolean {
  const x = (a || '').trim();
  const y = (b || '').trim();
  if (!x || !y) return false;
  if (x === y) return true;
  const bx = stripLeadingAl(x);
  const by = stripLeadingAl(y);
  if (bx && by && bx === by) return true;
  const sx = categoryStemKey(x);
  const sy = categoryStemKey(y);
  if (sx.length >= 2 && sy.length >= 2 && sx === sy) return true;
  const minLen = 3;
  if (x.length >= minLen && y.length >= minLen && (x.includes(y) || y.includes(x))) return true;
  return false;
}

/** هل يذكر النص فئة المسار (بصيغة مع أو بدون ال التعريف)؟ */
export function descriptionImpliesCategory(text: string, routeCategory: string): boolean {
  const t = (text || '').trim();
  const c = (routeCategory || '').trim();
  if (!t || !c) return false;
  const lower = t.toLowerCase();
  if (t.includes(c) || lower.includes(c.toLowerCase())) return true;
  const bare = stripLeadingAl(c);
  if (bare.length >= 2 && (t.includes(bare) || lower.includes(bare.toLowerCase()))) return true;
  if (!c.startsWith('ال') && bare === c) {
    const withAl = `ال${c}`;
    if (t.includes(withAl) || lower.includes(withAl.toLowerCase())) return true;
  }
  const stem = categoryStemKey(c);
  if (stem.length >= 2 && (t.includes(stem) || lower.includes(stem.toLowerCase()))) return true;
  return false;
}
