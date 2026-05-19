import type { ConfirmedBriefingRow } from '../services/analyticsService';
import type { AdvancedFlowSummary } from './advancedFlowSummary';
import { deriveAdvancedFlowSummaryFromStored } from './advancedFlowSummary';

/** تسميات عربية ثابتة لعرض الإفادات المؤكدة */
export const AR_BRIEFING_LABELS = {
  customer: 'اسم العميل',
  entity: 'نوع الجهة',
  problem: 'المشكلة',
  extraRoutes: 'مسارات إضافية',
  solution: 'الحل',
} as const;

/** توجيه الحل/التصعيد من نتيجة مسار الوضع المتقدم */
export function resolveFlowGuidanceFromFlowResult(
  result: {
    solutionDetails?: string;
    escalationDetails?: string;
    finalAction?: string;
  },
  lastSubCondition?: { actionDetails?: string; name?: string },
): string {
  const fromResult =
    result.finalAction === 'escalation'
      ? result.escalationDetails
      : result.solutionDetails ?? result.escalationDetails;

  const raw =
    (fromResult || lastSubCondition?.actionDetails || '').trim() ||
    (lastSubCondition?.name || '').trim();

  return raw;
}

/** نص مربع «تم إفادة العميل» — أولوية توجيه المسار ثم استخراج من الصيغة */
export function resolveCallHelperBriefingText(params: {
  flowBriefingGuidance: string | null;
  generatedText: string;
  matchedKbResponse: string | null;
  preferKbWhenNoFlow?: boolean;
}): string {
  const fromFlow = params.flowBriefingGuidance?.trim();
  if (fromFlow) return fromFlow;

  const fromTemplate = extractBriefingGuidance(params.generatedText);
  if (fromTemplate.trim()) return fromTemplate.trim();

  if (params.matchedKbResponse?.trim() && params.preferKbWhenNoFlow !== false) {
    return params.matchedKbResponse.trim();
  }

  return params.generatedText?.trim() || '';
}

/** جوهر التوجيه بعد إزالة عناوين المسار المتبقية داخل النص */
function refineGuidanceCore(core: string): string {
  let t = core.trim();
  if (!t) return '';

  const inlineMarkers: RegExp[] = [
    /💡\s*توجيهات الحل:\s*([\s\S]*?)$/i,
    /💡\s*الحل:\s*([\s\S]*?)$/i,
    /⚠️\s*تصعيد:\s*([\s\S]*?)$/i,
    /💡\s*Solution guidance:\s*([\s\S]*?)$/i,
    /💡\s*Solution:\s*([\s\S]*?)$/i,
    /⚠️\s*Escalation:\s*([\s\S]*?)$/i,
  ];
  for (const re of inlineMarkers) {
    const m = t.match(re);
    if (m?.[1]?.trim()) return m[1].trim();
  }

  t = t
    .replace(/^الحالة\s*:[^\n]+\n+/i, '')
    .replace(/^نوع المشكلة\s*:[^\n]+\n+/i, '')
    .replace(/^✅\s*تمت معالجة جميع الخطوات[^\n]*\n*/i, '')
    .trim();

  return t;
}

/** صيغة مطابقة قاعدة المعرفة: سلام → عميل/جهة → الحل → شكراً */
function extractKbEnvelopeCore(text: string): string | null {
  const envelopePatterns: RegExp[] = [
    /نوع الجهة\s*:[^\n]+\n+\n*([\s\S]*?)\n+\n*شكراً لتواصلكم/i,
    /العميل\s*:[^\n]+\n+نوع الجهة\s*:[^\n]+\n+\n*([\s\S]*?)\n+\n*شكراً لتواصلكم/i,
    /Entity type\s*:[^\n]+\n+\n*([\s\S]*?)\n+\n*Thank you/i,
  ];

  for (const re of envelopePatterns) {
    const m = text.match(re);
    if (m?.[1]?.trim()) {
      const refined = refineGuidanceCore(m[1].trim());
      if (refined) return refined;
    }
  }
  return null;
}

/** استخراج نص التوجيه/الحل من الصيغة المخزّنة (عربي أو إنجليزي) */
export function extractBriefingGuidance(raw: string | null | undefined): string {
  const text = (raw ?? '').trim();
  if (!text) return '';

  const patterns: RegExp[] = [
    /💡\s*توجيهات الحل:\s*([\s\S]*?)(?:\n\nشكراً|\n\nمع تحيات|\n\nتفاصيل المشكلة|$)/i,
    /💡\s*الحل:\s*([\s\S]*?)(?:\n\nشكراً|\n\nمع تحيات|\n\nتفاصيل المشكلة|$)/i,
    /⚠️\s*تصعيد:\s*([\s\S]*?)(?:\n\nشكراً|\n\nمع تحيات|\n\nتفاصيل المشكلة|$)/i,
    /💡\s*Solution guidance:\s*([\s\S]*?)(?:\n\nThank you|$)/i,
    /💡\s*Solution:\s*([\s\S]*?)(?:\n\nThank you|$)/i,
    /⚠️\s*Escalation:\s*([\s\S]*?)(?:\n\nThank you|$)/i,
    /Briefing guidance:\s*([\s\S]*?)$/i,
    /✅\s*([\s\S]*?)(?:\n\nتفاصيل المشكلة|\n\nProblem details|$)/,
  ];

  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]?.trim()) return m[1].trim();
  }

  const fromKbEnvelope = extractKbEnvelopeCore(text);
  if (fromKbEnvelope) return fromKbEnvelope;

  return refineGuidanceCore(text);
}

function extractSolutionFromFlowResult(flowResult: unknown): string | null {
  if (!flowResult || typeof flowResult !== 'object') return null;
  const fr = flowResult as {
    completedSteps?: Array<{
      selectedSubCondition?: { actionDetails?: string; name?: string };
    }>;
    solutionDetails?: string;
    escalationDetails?: string;
    finalAction?: string;
  };
  const last = fr.completedSteps?.[fr.completedSteps.length - 1];
  const guidance = resolveFlowGuidanceFromFlowResult(
    fr,
    last?.selectedSubCondition,
  );
  return guidance.trim() || null;
}

/** استخراج «الحالة» من صيغة قديمة مخزّنة (عند غياب flowResult) */
function extractLegacyFlowCondition(raw: string | null | undefined): string | null {
  const text = (raw ?? '').trim();
  if (!text) return null;
  const m = text.match(/(?:الحالة|Status)\s*:\s*(.+?)(?:\n\n|\n💡|\n⚠️|$)/i);
  const value = m?.[1]?.trim();
  if (!value || value === '—' || value === '-') return null;
  return value;
}

/** دمج ملخص محفوظ + flowResult + سطر الحالة من النص */
export function resolveBriefingFlowSummary(
  row: Pick<ConfirmedBriefingRow, 'advancedFlowSummary' | 'solution'> & {
    flowResult?: unknown;
  },
): AdvancedFlowSummary | null {
  const fromStored = deriveAdvancedFlowSummaryFromStored(
    row.flowResult ?? null,
    row.advancedFlowSummary ?? null,
  );
  if (
    fromStored &&
    ((fromStored.selections?.length ?? 0) > 0 ||
      Boolean(fromStored.pathLabel?.trim()) ||
      (fromStored.routeNames?.length ?? 0) > 0)
  ) {
    return fromStored;
  }

  const condition = extractLegacyFlowCondition(row.solution);
  if (!condition) return fromStored;

  return {
    mode: 'advanced',
    routeNames: [],
    selections: [{ routeName: '—', stepName: '—', choiceName: condition }],
    pathLabel: condition,
    finalAction: undefined,
  };
}

export type BriefingRouteStep = {
  index: number;
  routeName?: string;
  stepName?: string;
  choiceName: string;
};

export type ConfirmedBriefingView = {
  customerName: string | null;
  entityType: string | null;
  problemSummary: string | null;
  routes: BriefingRouteStep[];
  solution: string | null;
};

function isDashLabel(value: string | undefined): boolean {
  return !value || value === '—' || value === '-';
}

export function buildBriefingRouteSteps(
  summary?: AdvancedFlowSummary | null,
): BriefingRouteStep[] {
  if (!summary) return [];

  if (summary.selections?.length) {
    return summary.selections.map((sel, i) => ({
      index: i + 1,
      routeName: isDashLabel(sel.routeName) ? undefined : sel.routeName,
      stepName: isDashLabel(sel.stepName) ? undefined : sel.stepName,
      choiceName: sel.choiceName || '—',
    }));
  }

  if (summary.pathLabel?.trim()) {
    return [{ index: 1, choiceName: summary.pathLabel.trim() }];
  }

  if (summary.routeNames?.length) {
    return summary.routeNames.map((name, i) => ({
      index: i + 1,
      routeName: name,
      choiceName: name,
    }));
  }

  return [];
}

function formatFlowPathsForText(summary?: AdvancedFlowSummary | null): string[] {
  return buildBriefingRouteSteps(summary).map((step) => {
    if (!step.routeName && !step.stepName) {
      return `${step.index}. ${step.choiceName}`;
    }
    const route = step.routeName ? `${step.routeName} — ` : '';
    const st = step.stepName ? `${step.stepName} → ` : '';
    return `${step.index}. ${route}${st}${step.choiceName}`;
  });
}

/** بيانات منظّمة لعرض الإفادة في الواجهة */
export function buildConfirmedBriefingView(
  row: ConfirmedBriefingRow,
): ConfirmedBriefingView {
  const flowSummary = resolveBriefingFlowSummary(row);
  const solutionText =
    extractSolutionFromFlowResult(row.flowResult) ||
    extractBriefingGuidance(row.solution);
  return {
    customerName: row.customerName?.trim() || null,
    entityType: row.entityType?.trim() || null,
    problemSummary: row.problemSummary?.trim() || null,
    routes: buildBriefingRouteSteps(flowSummary),
    solution: solutionText.trim() || null,
  };
}

/**
 * نص الإفادة المؤكدة بترتيب ثابت:
 * اسم العميل → نوع الجهة → المشكلة → مسارات إضافية → الحل
 */
export function formatConfirmedBriefingBody(
  row: ConfirmedBriefingRow,
  labels: typeof AR_BRIEFING_LABELS = AR_BRIEFING_LABELS,
): string {
  const guidance =
    extractSolutionFromFlowResult(row.flowResult) ||
    extractBriefingGuidance(row.solution);
  const lines: string[] = [];

  if (row.customerName?.trim()) {
    lines.push(`${labels.customer}: ${row.customerName.trim()}`);
  }
  if (row.entityType?.trim()) {
    lines.push(`${labels.entity}: ${row.entityType.trim()}`);
  }
  if (row.problemSummary?.trim()) {
    lines.push(`${labels.problem}: ${row.problemSummary.trim()}`);
  }

  const flowSummary = resolveBriefingFlowSummary(row);
  const routeLines = formatFlowPathsForText(flowSummary);
  if (routeLines.length > 0) {
    lines.push('');
    lines.push(`${labels.extraRoutes}:`);
    for (const line of routeLines) {
      lines.push(line);
    }
  }

  if (guidance) {
    lines.push('');
    lines.push(`${labels.solution}:`);
    lines.push(guidance);
  }

  return lines.join('\n').trim() || '—';
}
