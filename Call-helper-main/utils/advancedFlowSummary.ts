/**
 * ملخص مسار الوضع المتقدم / Gray Area للعرض في الإفادات والسجلات.
 */

export type AdvancedFlowSelection = {
  routeName: string;
  stepName: string;
  choiceName: string;
};

export type AdvancedFlowSummary = {
  mode: 'advanced' | 'gray_area';
  routeNames: string[];
  selections: AdvancedFlowSelection[];
  pathLabel: string;
  questionTitle?: string;
  finalAction?: string;
};

type RouteLike = { id: string; name: string };
type StepLike = { id: string; name: string; routeId: string };

type AdvancedFlowResultLike = {
  completedSteps?: Array<{
    stepId?: string;
    stepName?: string;
    routeId?: string;
    routeName?: string;
    selectedSubCondition?: { name?: string };
  }>;
  finalAction?: string;
};

type GrayFlowPathLike = {
  questionTitle?: string;
  finalAction?: string;
  selectedSteps?: Array<{
    route?: { name?: string };
    step?: { name?: string };
    subCondition?: { name?: string };
  }>;
};

export function buildAdvancedFlowSummaryFromResult(
  result: AdvancedFlowResultLike,
  ctx: { routes: RouteLike[]; steps: StepLike[] },
): AdvancedFlowSummary | null {
  const steps = result.completedSteps ?? [];
  if (steps.length === 0) return null;

  const selections: AdvancedFlowSelection[] = steps.map((cs) => {
    const step = ctx.steps.find((s) => s.id === cs.stepId);
    const route = step ? ctx.routes.find((r) => r.id === step.routeId) : undefined;
    return {
      routeName: (route?.name || '').trim() || '—',
      stepName: (cs.stepName || step?.name || '').trim() || '—',
      choiceName: (cs.selectedSubCondition?.name || '').trim() || '—',
    };
  });

  const routeNames = [...new Set(selections.map((s) => s.routeName).filter((n) => n !== '—'))];
  const pathLabel = selections
    .map((s) => `${s.routeName}: ${s.stepName} → ${s.choiceName}`)
    .join(' | ');

  return {
    mode: 'advanced',
    routeNames,
    selections,
    pathLabel,
    finalAction: result.finalAction,
  };
}

export function buildAdvancedFlowSummaryFromGrayPath(
  flowPath: GrayFlowPathLike,
): AdvancedFlowSummary | null {
  const selected = flowPath.selectedSteps ?? [];
  if (selected.length === 0) return null;

  const selections: AdvancedFlowSelection[] = selected.map((item) => ({
    routeName: (item.route?.name || '').trim() || '—',
    stepName: (item.step?.name || '').trim() || '—',
    choiceName: (item.subCondition?.name || '').trim() || '—',
  }));

  const routeNames = [...new Set(selections.map((s) => s.routeName).filter((n) => n !== '—'))];
  const pathLabel = selections
    .map((s) => `${s.routeName}: ${s.stepName} → ${s.choiceName}`)
    .join(' | ');

  return {
    mode: 'gray_area',
    routeNames,
    selections,
    pathLabel,
    questionTitle: (flowPath.questionTitle || '').trim() || undefined,
    finalAction: flowPath.finalAction,
  };
}

function summaryRichness(summary: AdvancedFlowSummary | null | undefined): number {
  if (!summary) return 0;
  let score = 0;
  if (summary.selections?.length) {
    score += summary.selections.length * 2;
    score += summary.selections.filter((s) => s.routeName && s.routeName !== '—').length * 3;
  }
  if (summary.routeNames?.length) score += summary.routeNames.length * 2;
  if (summary.pathLabel?.trim()) score += 1;
  return score;
}

function deriveFromFlowResultOnly(flowResult: unknown): AdvancedFlowSummary | null {
  if (!flowResult || typeof flowResult !== 'object') return null;
  const fr = flowResult as Record<string, unknown>;
  if (Array.isArray(fr.selectedSteps)) {
    return buildAdvancedFlowSummaryFromGrayPath(fr as GrayFlowPathLike);
  }
  if (Array.isArray(fr.completedSteps)) {
    const steps = fr.completedSteps as AdvancedFlowResultLike['completedSteps'];
    const selections: AdvancedFlowSelection[] = (steps ?? []).map((cs) => ({
      routeName: (cs?.routeName || '').trim() || '—',
      stepName: (cs?.stepName || '').trim() || '—',
      choiceName: (cs?.selectedSubCondition?.name || '').trim() || '—',
    }));
    if (selections.length === 0) return null;
    const routeNames = [...new Set(selections.map((s) => s.routeName).filter((n) => n !== '—'))];
    return {
      mode: 'advanced',
      routeNames,
      selections,
      pathLabel: selections
        .map((s) =>
          s.routeName !== '—'
            ? `${s.routeName}: ${s.stepName} → ${s.choiceName}`
            : `${s.stepName} → ${s.choiceName}`,
        )
        .join(' | '),
      finalAction: typeof fr.finalAction === 'string' ? fr.finalAction : undefined,
    };
  }
  return null;
}

/** استنتاج ملخص من flowResult و/أو الملخص المحفوظ (للإفادات المؤكدة). */
export function deriveAdvancedFlowSummaryFromStored(
  flowResult: unknown,
  storedSummary?: AdvancedFlowSummary | null,
): AdvancedFlowSummary | null {
  const fromFlow = deriveFromFlowResultOnly(flowResult);
  if (storedSummary) {
    const storedScore = summaryRichness(storedSummary);
    const flowScore = summaryRichness(fromFlow);
    if (storedScore > 0 && storedScore >= flowScore) {
      return storedSummary;
    }
  }
  return fromFlow ?? storedSummary ?? null;
}

export function buildAdvancedFlowSummary(
  flowResult: unknown,
  ctx: { routes: RouteLike[]; steps: StepLike[] },
): AdvancedFlowSummary | null {
  if (!flowResult || typeof flowResult !== 'object') return null;
  const fr = flowResult as Record<string, unknown>;
  if (Array.isArray(fr.selectedSteps)) {
    return buildAdvancedFlowSummaryFromGrayPath(fr as GrayFlowPathLike);
  }
  if (Array.isArray(fr.completedSteps)) {
    return buildAdvancedFlowSummaryFromResult(fr as AdvancedFlowResultLike, ctx);
  }
  return null;
}
