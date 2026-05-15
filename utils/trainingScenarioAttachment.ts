/** ذيل قديم أو لصق يدوي — لا يُعد مرفقاً حقيقياً إلا إذا رُفع الملف وخُزن المسار */
const TRAINING_ATTACHMENT_FOOTER_RE =
  /\s*──(?:\s|\r?\n)*مرفق\s+توضيحي\s*\(\s*اسم\s+الملف\s*\)\s*:\s*[\s\S]*$/iu;

export function stripTrainingAttachmentFooter(scenario: string): string {
  return scenario.replace(TRAINING_ATTACHMENT_FOOTER_RE, '').trimEnd();
}

/** هل النص يحتوي صيغة «مرفق توضيحي (اسم الملف):» (غالباً لصق يدوي — ليس رفعاً حقيقياً) */
export function scenarioTextMentionsAttachmentLine(scenario: string): boolean {
  return /──[\s\S]{0,240}?مرفق\s+توضيحي\s*\(\s*اسم\s+الملف\s*\)\s*:/iu.test(scenario);
}
