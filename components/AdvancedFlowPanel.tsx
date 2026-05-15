/**
 * ====================================================================
 * Advanced Flow Panel - Nested Decision Tree
 * ====================================================================
 * 
 * يعرض Routes بناءً على Keywords
 * يدعم الشروط المتداخلة (Nested Conditions)
 * - Continue → يفتح شروط فرعية
 * - Force Solution / Escalation → نهائي
 * 
 * ====================================================================
 */

import { useState, useEffect } from 'react';
import { 
  ArrowRight, 
  CheckCircle2,
  PlayCircle, 
  StopCircle, 
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Search,
  ChevronLeft,
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import type { Route, Step, SubCondition } from '../contexts/AdvancedSettingsContext';
import { matchRoutesFromDescription } from '../utils/keywordMatcher';
import { useAdvancedSettings } from '../contexts/AdvancedSettingsContext';

interface AdvancedFlowPanelProps {
  routes: Route[];
  steps: Step[];
  problemDescription: string;
  onFlowComplete: (result: {
    completedSteps: Array<{
      stepId: string;
      stepName: string;
      selectedSubCondition: SubCondition;
    }>;
    finalAction: 'continue' | 'force_solution' | 'escalation';
    escalationDetails?: string;
    solutionDetails?: string;
  }) => void;
  onDebugUpdate?: (data: {
    activeRoute: string;
    currentStep: { name: string; order: number };
    subCondition: string;
    action: 'continue' | 'force_solution' | 'escalation';
  }) => void;
}

/**
 * Breadcrumb item for navigation
 */
interface BreadcrumbItem {
  name: string;
  level: number;
}

export function AdvancedFlowPanel({ 
  routes, 
  steps, 
  problemDescription,
  onFlowComplete,
  onDebugUpdate,
}: AdvancedFlowPanelProps) {
  // ====================================================================
  // Advanced Settings Context
  // ====================================================================
  const { grayAreaSettings } = useAdvancedSettings();
  
  // ====================================================================
  // State Management
  // ====================================================================
  
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Array<{
    stepId: string;
    stepName: string;
    selectedSubCondition: SubCondition;
  }>>([]);
  
  // Nested navigation state
  const [currentConditions, setCurrentConditions] = useState<SubCondition[]>([]);
  const [selectedConditionId, setSelectedConditionId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [conditionPath, setConditionPath] = useState<SubCondition[]>([]); // Path of selected conditions
  
  const [flowFinished, setFlowFinished] = useState(false);
  const [finalAction, setFinalAction] = useState<'continue' | 'force_solution' | 'escalation' | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [matchedRoutes, setMatchedRoutes] = useState<Array<{
    routeName: string;
    matchScore: number;
    matchedKeywords: string[];
  }>>([]);

  // ====================================================================
  // Keyword Matching
  // ====================================================================

  useEffect(() => {
    if (!problemDescription || !problemDescription.trim()) {
      setMatchedRoutes([]);
      return;
    }

    const activeRoutes = routes
      .filter(route => route.isActive)
      .map(route => route.name);

    const matches = matchRoutesFromDescription(problemDescription, activeRoutes);
    setMatchedRoutes(matches);

    console.log('🔍 Keyword Analysis:', {
      description: problemDescription,
      matches: matches.map(m => ({
        route: m.routeName,
        score: m.matchScore,
        keywords: m.matchedKeywords,
      })),
    });
  }, [problemDescription, routes]);

  // Get only matched routes
  const relevantRoutes = routes.filter(route => 
    route.isActive && matchedRoutes.some(m => m.routeName === route.name)
  ).sort((a, b) => {
    const aMatch = matchedRoutes.find(m => m.routeName === a.name);
    const bMatch = matchedRoutes.find(m => m.routeName === b.name);
    return (bMatch?.matchScore || 0) - (aMatch?.matchScore || 0);
  });

  // ====================================================================
  // Parent Steps Filtering
  // ====================================================================
  
  /**
   * Filter routes based on Parent Steps logic:
   * - If route has NO parent steps → show it (root route)
   * - If route HAS parent steps → show ONLY if one of the parent steps was selected
   */
  const getAccessibleRoutes = () => {
    return relevantRoutes.filter(route => {
      // No parent steps → always accessible (root route)
      if (!route.parentSteps || route.parentSteps.length === 0) {
        console.log(`✅ Route "${route.name}" - Root route (no parent steps)`);
        return true;
      }

      // Has parent steps → check if any were selected in completed steps
      const selectedSubConditionIds = completedSteps.map(cs => cs.selectedSubCondition.id);
      const hasMatchingParent = route.parentSteps.some(parentId => 
        selectedSubConditionIds.includes(parentId)
      );

      console.log(`${hasMatchingParent ? '✅' : '❌'} Route "${route.name}" - Parent Steps:`, {
        requiredParentIds: route.parentSteps,
        selectedIds: selectedSubConditionIds,
        hasAccess: hasMatchingParent,
      });

      return hasMatchingParent;
    });
  };

  const accessibleRoutes = getAccessibleRoutes();

  console.log('🚦 Accessible Routes:', accessibleRoutes.map(r => r.name));

  // Get steps for accessible routes only
  const relevantSteps = accessibleRoutes
    .map(route => steps.find(step => step.routeId === route.id))
    .filter((step): step is Step => step !== undefined);

  const currentStep = relevantSteps[currentStepIndex];
  const currentRoute = accessibleRoutes[currentStepIndex];

  // ====================================================================
  // Initialize Current Conditions
  // ====================================================================

  useEffect(() => {
    if (currentStep) {
      // Reset to root conditions when step changes
      setCurrentConditions(currentStep.subConditions);
      setBreadcrumbs([{ name: currentStep.name, level: 0 }]);
      setConditionPath([]);
      setSelectedConditionId(null);
    }
  }, [currentStep]);

  // ====================================================================
  // Functions
  // ====================================================================

  /**
   * Handle checkbox selection
   */
  const handleCheckboxChange = (subConditionId: string, isChecked: boolean) => {
    if (isChecked) {
      setSelectedConditionId(subConditionId);

      const selectedCondition = currentConditions.find(sc => sc.id === subConditionId);

      if (selectedCondition && currentStep && currentRoute) {
        // Update debug panel
        if (onDebugUpdate) {
          onDebugUpdate({
            activeRoute: currentRoute.name,
            currentStep: { name: currentStep.name, order: currentStep.order },
            subCondition: selectedCondition.name,
            action: selectedCondition.action,
          });
        }

        console.log('✅ Checkbox selected:', {
          step: currentStep.name,
          subCondition: selectedCondition.name,
          action: selectedCondition.action,
          hasChildren: selectedCondition.childConditions && selectedCondition.childConditions.length > 0,
        });

        // Auto-navigate to child conditions if they exist (only for continue actions)
        if (selectedCondition.action === 'continue' && selectedCondition.childConditions && selectedCondition.childConditions.length > 0) {
          console.log('🔄 Auto-navigating to child conditions...');
          setTimeout(() => {
            // Add to path
            const newPath = [...conditionPath, selectedCondition];
            setConditionPath(newPath);

            // Navigate deeper
            setCurrentConditions(selectedCondition.childConditions);
            setBreadcrumbs(prev => [...prev, { name: selectedCondition.name, level: prev.length }]);
            setSelectedConditionId(null);

            console.log('🔽 Navigated to children:', {
              parent: selectedCondition.name,
              children: selectedCondition.childConditions.map(c => c.name),
            });
          }, 400);
        }
        // For force_solution/escalation: just show notes, wait for user to click button
      }
    } else {
      setSelectedConditionId(null);
    }
  };

  /**
   * Proceed to next level or step
   */
  const handleProceed = () => {
    if (!selectedConditionId) {
      alert('يرجى اختيار خيار قبل المتابعة');
      return;
    }

    const selectedCondition = currentConditions.find(sc => sc.id === selectedConditionId);
    if (!selectedCondition) return;

    // Add to path
    const newPath = [...conditionPath, selectedCondition];
    setConditionPath(newPath);

    // Check if this condition has child conditions
    if (selectedCondition.childConditions && selectedCondition.childConditions.length > 0) {
      // Navigate deeper
      setCurrentConditions(selectedCondition.childConditions);
      setBreadcrumbs(prev => [...prev, { name: selectedCondition.name, level: prev.length }]);
      setSelectedConditionId(null);

      console.log('🔽 Navigating deeper:', {
        parent: selectedCondition.name,
        children: selectedCondition.childConditions.map(c => c.name),
      });
    } else if (selectedCondition.action === 'continue') {
      // No children, move to next step
      moveToNextStep(newPath);
    } else {
      // Force solution or Escalation
      handleFinishFlow(selectedCondition);
    }
  };

  /**
   * Move to next route/step
   */
  const moveToNextStep = (path: SubCondition[]) => {
    // Get the final selected condition from path
    const finalCondition = path[path.length - 1];
    
    // Record completed step
    const newCompletedSteps = [
      ...completedSteps,
      {
        stepId: currentStep.id,
        stepName: currentStep.name,
        selectedSubCondition: finalCondition,
      },
    ];
    setCompletedSteps(newCompletedSteps);

    console.log('✅ Step completed:', {
      step: currentStep.name,
      path: path.map(c => c.name).join(' → '),
      finalChoice: finalCondition.name,
    });

    // Move to next step
    if (currentStepIndex < relevantSteps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
      setConditionPath([]);
      setSelectedConditionId(null);
    } else {
      // All steps completed
      finishFlow(newCompletedSteps, 'continue');
    }
  };

  /**
   * Finish flow with action
   */
  const handleFinishFlow = (condition: SubCondition) => {
    const newPath = [...conditionPath, condition];
    const finalCondition = newPath[newPath.length - 1];

    const newCompletedSteps = [
      ...completedSteps,
      {
        stepId: currentStep.id,
        stepName: currentStep.name,
        selectedSubCondition: finalCondition,
      },
    ];

    finishFlow(newCompletedSteps, finalCondition.action);
  };

  /**
   * Finish the flow
   */
  const finishFlow = (
    steps: Array<{
      stepId: string;
      stepName: string;
      selectedSubCondition: SubCondition;
    }>,
    action: 'continue' | 'force_solution' | 'escalation'
  ) => {
    setFlowFinished(true);
    setFinalAction(action);

    const lastStep = steps[steps.length - 1];
    const result = {
      completedSteps: steps,
      finalAction: action,
      escalationDetails: action === 'escalation' ? lastStep.selectedSubCondition.actionDetails : undefined,
      solutionDetails: action === 'force_solution' ? lastStep.selectedSubCondition.actionDetails : undefined,
    };

    console.log('🏁 Flow finished:', result);

    onFlowComplete(result);
  };

  /**
   * Reset flow
   */
  const handleReset = () => {
    setCurrentStepIndex(0);
    setCompletedSteps([]);
    setConditionPath([]);
    setSelectedConditionId(null);
    setFlowFinished(false);
    setFinalAction(null);

    console.log('🔄 Flow reset');
  };

  /**
   * Navigate back in breadcrumb
   */
  const handleBreadcrumbClick = (level: number) => {
    if (level === 0) {
      // Back to root
      setCurrentConditions(currentStep.subConditions);
      setBreadcrumbs([{ name: currentStep.name, level: 0 }]);
      setConditionPath([]);
    } else {
      // Navigate to specific level
      const targetPath = conditionPath.slice(0, level);
      const lastCondition = targetPath[targetPath.length - 1];
      
      if (lastCondition.childConditions) {
        setCurrentConditions(lastCondition.childConditions);
        setBreadcrumbs(prev => prev.slice(0, level + 1));
        setConditionPath(targetPath);
      }
    }
    
    setSelectedConditionId(null);
  };

  // ====================================================================
  // UI Helpers
  // ====================================================================

  const getActionBadge = (action: SubCondition['action']) => {
    const config = {
      continue: {
        label: 'متابعة',
        color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
        icon: PlayCircle,
      },
      force_solution: {
        label: 'إيقاف وحل',
        color: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400',
        icon: StopCircle,
      },
      escalation: {
        label: 'تصعيد',
        color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
        icon: AlertCircle,
      },
    };

    const { label, color, icon: Icon } = config[action];

    return (
      <Badge className={`${color} border-0 flex items-center gap-1 text-xs`}>
        <Icon className="size-3" />
        {label}
      </Badge>
    );
  };

  // ====================================================================
  // Render
  // ====================================================================

  if (matchedRoutes.length === 0) {
    return (
      <div className="glass-panel border-2 border-border rounded-xl p-6 text-center">
        <Search className="size-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground text-sm font-semibold">
          لم نتمكن من تحديد مسار مناسب
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          جرب إضافة تفاصيل أكثر لوصف المشكلة (مثل: تسجيل، دفع، تأشيرة، عقد)
        </p>
      </div>
    );
  }

  if (relevantSteps.length === 0) {
    return (
      <div className="glass-panel border-2 border-border rounded-xl p-6 text-center">
        <Sparkles className="size-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">
          لا توجد خطوات معرّفة للمسارات المطابقة
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-primary" />
          <h3 className="font-bold text-foreground">Advanced View</h3>
          <Badge variant="outline" className="text-xs">
            {matchedRoutes.length} مسار مطابق
          </Badge>
        </div>
        {isExpanded ? (
          <ChevronUp className="size-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-5 text-muted-foreground" />
        )}
      </div>

      {isExpanded && (
        <>
          {/* Matched Routes Info */}
          <div className="glass-panel rounded-lg p-3 border border-border">
            <div className="flex items-start gap-2 text-right">
              <Search className="size-4 text-primary flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-foreground mb-1">
                  تم العثور على مطابقات:
                </p>
                <div className="flex flex-wrap gap-1">
                  {matchedRoutes.map((match) => (
                    <Badge 
                      key={match.routeName} 
                      className="bg-primary/10 text-primary border-0 text-[10px]"
                    >
                      {match.routeName} ({match.matchScore} نقطة)
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Progress Indicator */}
          {!flowFinished && (
            <div className="flex items-center gap-2">
              {relevantSteps.map((step, index) => (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center w-full">
                    <div className={`w-full h-2 rounded-full transition-all ${
                      index < currentStepIndex 
                        ? 'bg-emerald-500'
                        : index === currentStepIndex
                        ? 'bg-cyan-500'
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`} />
                    <span className={`text-[10px] mt-1 ${
                      index <= currentStepIndex 
                        ? 'text-foreground font-semibold'
                        : 'text-muted-foreground'
                    }`}>
                      {step.name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Current Step or Final Result */}
          {!flowFinished ? (
            currentRoute && currentStep ? (
              <div className="glass-panel border-2 border-primary/30 rounded-xl p-5 space-y-4">
              {/* Step Header */}
              <div className="flex items-start gap-3 pb-3 border-b border-border">
                <div className="text-right flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <ArrowRight className="size-4 text-primary" />
                    <h4 className="font-bold text-foreground">
                      {currentRoute.name} (المرحلة {currentRoute.order})
                    </h4>
                  </div>
                  
                  {/* Breadcrumb Navigation */}
                  {breadcrumbs.length > 1 && (
                    <div className="flex items-center gap-1 mt-2 flex-wrap">
                      {breadcrumbs.map((crumb, index) => (
                        <div key={index} className="flex items-center gap-1">
                          {index > 0 && <ChevronLeft className="size-3 text-muted-foreground" />}
                          <button
                            onClick={() => handleBreadcrumbClick(crumb.level)}
                            className="text-[10px] text-primary hover:underline"
                          >
                            {crumb.name}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <Badge className="bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-400 border-0 text-xs">
                  {currentStepIndex + 1}/{relevantSteps.length}
                </Badge>
              </div>

              {/* Sub-conditions as Checkboxes */}
              {currentConditions.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground mb-3">
                    لا توجد خيارات لهذه المرحلة
                  </p>
                  <Button
                    onClick={() => moveToNextStep(conditionPath)}
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
                    size="sm"
                  >
                    متابعة للمرحلة التالية
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {currentConditions.map((subCond, index) => {
                    const isSelected = selectedConditionId === subCond.id;
                    const isActionStop = subCond.action !== 'continue';
                    const hasChildren = subCond.childConditions && subCond.childConditions.length > 0;

                    return (
                      <div
                        key={subCond.id}
                        className={`glass-panel rounded-lg p-3 border-2 transition-all cursor-pointer ${
                          isSelected 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:border-primary/30'
                        }`}
                        onClick={() => handleCheckboxChange(subCond.id, !isSelected)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1 text-right">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => 
                                handleCheckboxChange(subCond.id, checked as boolean)
                              }
                              className="mt-0.5"
                            />
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-foreground">
                                {subCond.name}
                              </p>
                              {hasChildren && (
                                <p className="text-[10px] text-cyan-600 dark:text-cyan-400 mt-0.5">
                                  {subCond.childConditions!.length} خيار فرعي متاح
                                </p>
                              )}
                            </div>
                          </div>

                          {grayAreaSettings.showActionTags && (
                            <div>
                              {getActionBadge(subCond.action)}
                            </div>
                          )}
                        </div>

                        {isSelected && subCond.actionDetails && grayAreaSettings.showActionDetails && (
                          <div className={`mt-3 pt-3 border-t ${
                            isActionStop 
                              ? 'border-orange-500/30' 
                              : 'border-border'
                          }`}>
                            <p className="text-xs font-semibold text-foreground mb-1">
                              {subCond.action === 'escalation' 
                                ? '⚠️ ملاحظات قبل التصعيد:' 
                                : subCond.action === 'force_solution'
                                ? '💡 توجيهات الحل:'
                                : 'تفاصيل:'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {subCond.actionDetails}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Continue Button - Only show if no auto-navigation happened */}
              {selectedConditionId && (() => {
                const selected = currentConditions.find(sc => sc.id === selectedConditionId);
                
                if (!selected) return null;

                if (selected.action === 'continue') {
                  const hasChildren = selected.childConditions && selected.childConditions.length > 0;
                  
                  // Hide button if it has children (auto-navigation will handle it)
                  if (hasChildren) {
                    return (
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">
                          ⏳ يتم فتح الخيارات الفرعية تلقائياً...
                        </p>
                      </div>
                    );
                  }
                  
                  // Show button for navigation to next step
                  return (
                    <Button
                      onClick={handleProceed}
                      className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-600 hover:to-blue-600"
                    >
                      {currentStepIndex < relevantSteps.length - 1 
                        ? '← المرحلة التالية'
                        : 'إنهاء وتطبيق'
                      }
                    </Button>
                  );
                } else {
                  // Force solution or Escalation - Show "Apply and Finish" button
                  return (
                    <Button
                      onClick={() => handleFinishFlow(selected)}
                      className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 font-bold"
                    >
                      {selected.action === 'force_solution' ? '✓ تطبيق الحل' : '✓ تطبيق التصعيد'}
                    </Button>
                  );
                }
              })()}
            </div>
            ) : (
              // No current route or step available
              <div className="glass-panel border-2 border-orange-500/30 rounded-xl p-6 text-center">
                <AlertCircle className="size-12 text-orange-500 mx-auto mb-3" />
                <p className="text-orange-700 dark:text-orange-400 text-sm font-semibold mb-2">
                  لا توجد مراحل متاحة حالياً
                </p>
                <p className="text-xs text-muted-foreground">
                  جرب إضافة المزيد من التفاصيل أو حدد نوع المشكلة أولاً
                </p>
              </div>
            )
          ) : (
            // Flow Finished
            <div className={`glass-panel rounded-xl p-5 border-2 ${
              finalAction === 'continue'
                ? 'border-emerald-500/50 bg-emerald-50/30 dark:bg-emerald-950/20'
                : finalAction === 'force_solution'
                ? 'border-orange-500/50 bg-orange-50/30 dark:bg-orange-950/20'
                : 'border-red-500/50 bg-red-50/30 dark:bg-red-950/20'
            }`}>
              <div className="flex items-center gap-3 mb-4">
                {finalAction === 'continue' ? (
                  <CheckCircle2 className="size-8 text-emerald-600 dark:text-emerald-400" />
                ) : finalAction === 'force_solution' ? (
                  <StopCircle className="size-8 text-orange-600 dark:text-orange-400" />
                ) : (
                  <AlertCircle className="size-8 text-red-600 dark:text-red-400" />
                )}
                <div className="text-right flex-1">
                  <h4 className="font-bold text-foreground">
                    {finalAction === 'continue' 
                      ? 'تمت جميع الخطوات بنجاح'
                      : finalAction === 'force_solution'
                      ? 'تم إيقاف العملية - يوجد حل'
                      : 'تم التصعيد للجهة المختصة'
                    }
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {completedSteps.length} خطوة مكتملة
                  </p>
                </div>
              </div>

              {(completedSteps[completedSteps.length - 1]?.selectedSubCondition.actionDetails) && (
                <div className="glass-panel rounded-lg p-4 border border-border mb-4">
                  <p className="text-xs font-semibold text-muted-foreground mb-2 text-right">
                    {finalAction === 'escalation' ? 'تفاصيل التصعيد:' : 'الحل المقترح:'}
                  </p>
                  <p className="text-sm text-foreground text-right">
                    {completedSteps[completedSteps.length - 1].selectedSubCondition.actionDetails}
                  </p>
                </div>
              )}

              <div className="space-y-2 mb-4">
                <p className="text-xs font-semibold text-muted-foreground text-right">الخطوات المكتملة:</p>
                {completedSteps.map((step, index) => (
                  <div key={step.stepId} className="flex items-center gap-2 text-sm text-right">
                    <span className="text-primary font-medium">
                      {step.selectedSubCondition.name}
                    </span>
                    <ArrowRight className="size-3 text-muted-foreground rotate-180" />
                    <span className="text-foreground">
                      {index + 1}. {step.stepName}
                    </span>
                    <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                ))}
              </div>

              <Button
                onClick={handleReset}
                variant="outline"
                className="w-full border-2"
                size="sm"
              >
                إعادة المحاولة
              </Button>
            </div>
          )}

          {completedSteps.length > 0 && !flowFinished && (
            <div className="text-xs text-muted-foreground text-center">
              ✓ تم إكمال {completedSteps.length} من {relevantSteps.length} خطوات
            </div>
          )}
        </>
      )}
    </div>
  );
}