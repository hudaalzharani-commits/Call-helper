/** يجب أن تطابق القائمة في واجهة `Call-helper-main/utils/uiVisibility.ts` */
export const ALLOWED_UI_VISIBILITY_KEYS = [
  'page_live_indicators',
  'page_public_issues',
  'page_knowledge_base',
  'page_operational_updates',
  'page_what_did_rafeeq_learn',
  'page_before_escalation',
  'page_teach_rafeeq_experience',
  'view_dashboard',
  'view_callhelper',
  'actions_elevated_create',
  'action_common_issue_create',
  'action_knowledge_article_create',
  'action_operational_update_create',
  'action_training_example_create',
  'action_delete_confirmed_briefing',
];

/** مسؤول النظام دائماً؛ غيره يحتاج uiVisibility.action_delete_confirmed_briefing === true */
export function canDeleteConfirmedBriefing(user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return user.uiVisibility?.action_delete_confirmed_briefing === true;
}

function plainVisibility(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return {};
  const out = {};
  for (const k of Object.keys(obj)) {
    if (ALLOWED_UI_VISIBILITY_KEYS.includes(k) && typeof obj[k] === 'boolean') {
      out[k] = obj[k];
    }
  }
  return out;
}

export function mergeUiVisibility(existing, patch) {
  const base = plainVisibility(existing);
  const p = plainVisibility(patch);
  return { ...base, ...p };
}
