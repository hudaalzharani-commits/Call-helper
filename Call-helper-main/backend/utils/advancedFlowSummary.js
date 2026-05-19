/**
 * استنتاج ملخص مسار الوضع المتقدم من flowResult (سجلات قديمة).
 */

function buildFromGray(flowResult) {
  const selected = flowResult.selectedSteps ?? [];
  if (!Array.isArray(selected) || selected.length === 0) return null;

  const selections = selected.map((item) => ({
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
    questionTitle: (flowResult.questionTitle || '').trim() || undefined,
    finalAction: flowResult.finalAction,
  };
}

function buildFromAdvanced(flowResult) {
  const steps = flowResult.completedSteps ?? [];
  if (!Array.isArray(steps) || steps.length === 0) return null;

  const selections = steps.map((cs) => ({
    routeName: (cs.routeName || cs.route?.name || '').trim() || '—',
    stepName: (cs.stepName || '').trim() || '—',
    choiceName: (cs.selectedSubCondition?.name || '').trim() || '—',
  }));

  const routeNames = [...new Set(selections.map((s) => s.routeName).filter((n) => n !== '—'))];
  const pathLabel = selections
    .map((s) =>
      s.routeName !== '—'
        ? `${s.routeName}: ${s.stepName} → ${s.choiceName}`
        : `${s.stepName} → ${s.choiceName}`,
    )
    .join(' | ');

  return {
    mode: 'advanced',
    routeNames,
    selections,
    pathLabel,
    finalAction: flowResult.finalAction,
  };
}

function summaryRichness(summary) {
  if (!summary || typeof summary !== 'object') return 0;
  let score = 0;
  if (Array.isArray(summary.selections) && summary.selections.length > 0) {
    score += summary.selections.length * 2;
    const namedRoutes = summary.selections.filter(
      (s) => s.routeName && s.routeName !== '—',
    ).length;
    score += namedRoutes * 3;
  }
  if (Array.isArray(summary.routeNames) && summary.routeNames.length > 0) {
    score += summary.routeNames.length * 2;
  }
  if (typeof summary.pathLabel === 'string' && summary.pathLabel.trim()) {
    score += 1;
  }
  return score;
}

function deriveFromFlowResult(flowResult) {
  if (!flowResult || typeof flowResult !== 'object') return null;
  if (Array.isArray(flowResult.selectedSteps)) {
    return buildFromGray(flowResult);
  }
  if (Array.isArray(flowResult.completedSteps)) {
    return buildFromAdvanced(flowResult);
  }
  return null;
}

export function deriveAdvancedFlowSummaryFromStored(flowResult, storedSummary) {
  const fromFlow = deriveFromFlowResult(flowResult);

  if (storedSummary && typeof storedSummary === 'object') {
    const storedScore = summaryRichness(storedSummary);
    const flowScore = summaryRichness(fromFlow);
    if (storedScore > 0 && storedScore >= flowScore) {
      return storedSummary;
    }
  }

  return fromFlow || (storedSummary && typeof storedSummary === 'object' ? storedSummary : null);
}
