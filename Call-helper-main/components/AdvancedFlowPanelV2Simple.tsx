/**
 * ====================================================================
 * Advanced Flow Panel V2 - Wizard Style Navigation (Simple Version)
 * ====================================================================
 * 
 * نفس طريقة عرض GrayAreaWizard:
 * - خطوة واحدة في كل مرة
 * - Breadcrumb لتتبع المسار
 * - زر رجوع
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
  Layers,
  MapPin,
  ArrowLeft,
  Target,
  GitBranch,
  FolderTree,
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import type { Route, Step, SubCondition } from '../contexts/AdvancedSettingsContext';
import { useAdvancedSettings } from '../contexts/AdvancedSettingsContext';

interface AdvancedFlowPanelV2Props {
  routes: Route[];
  steps: Step[];
  problemDescription: string;
  isGrayAreaMode: boolean;
  initialFilteredRouteIds?: string[] | undefined;
  /** عند تفعيل فلترة الفئة من وصف المشكلة / المعرفة */
  categoryScopeBanner?: { title: string; subtitle?: string } | null;
  /** رسالة عند عدم وجود مسارات بعد فلترة الفئة */
  scopedEmptyMessage?: string | null;
  onFlowComplete: (result: {
    completedSteps: Array<{
      stepId: string;
      stepName: string;
      selectedSubCondition: SubCondition;
    }>;
    finalAction: 'continue' | 'force_solution' | 'direct_answer' | 'escalation';
    escalationDetails?: string;
    solutionDetails?: string;
  }) => void;
  onDebugUpdate?: (data: {
    activeRoute: string;
    currentStep: { name: string; order: number };
    subCondition: string;
    action: 'continue' | 'force_solution' | 'direct_answer' | 'escalation';
  }) => void;
}

type WizardStep = 
  | { type: 'route_select'; availableRouteIds: string[] }
  | { type: 'step_conditions'; routeId: string; stepIndex: number }
  | { type: 'child_conditions'; parentCondition: SubCondition; routeId: string; stepIndex: number };

export function AdvancedFlowPanelV2({ 
  routes, 
  steps, 
  isGrayAreaMode,
  initialFilteredRouteIds,
  categoryScopeBanner,
  scopedEmptyMessage,
  onFlowComplete,
  onDebugUpdate,
}: AdvancedFlowPanelV2Props) {
  // ====================================================================
  // Advanced Settings Context
  // ====================================================================
  const { grayAreaSettings } = useAdvancedSettings();
  
  // ====================================================================
  // Wizard Navigation State
  // ====================================================================
  
  const [wizardHistory, setWizardHistory] = useState<WizardStep[]>([
    { type: 'route_select', availableRouteIds: [] }
  ]);
  
  const currentWizardStep = wizardHistory[wizardHistory.length - 1];
  
  const [flowPath, setFlowPath] = useState<Array<{
    route: Route;
    step: Step;
    subCondition: SubCondition;
  }>>([]);
  
  const [selectedConditionId, setSelectedConditionId] = useState<string | null>(null);
  const [flowFinished, setFlowFinished] = useState(false);
  const [finalAction, setFinalAction] = useState<'continue' | 'force_solution' | 'direct_answer' | 'escalation' | null>(null);

  // ====================================================================
  // Initialize Available Routes
  // ====================================================================

  useEffect(() => {
    const omitted = initialFilteredRouteIds === undefined;
    const raw = initialFilteredRouteIds ?? [];
    const filterIds = raw.filter(Boolean);

    if (filterIds.length > 0) {
      const filteredRoutes = routes.filter((r) => r.isActive && filterIds.includes(r.id));
      const ids = filteredRoutes.map((r) => r.id);
      if (ids.length > 0) {
        setWizardHistory([{ type: 'route_select', availableRouteIds: ids }]);
        return;
      }
    }

    // مصفوفة صريحة وفارغة = سياق محدد لكن لا مسارات مطابقة (لا نرجع لعرض «الكل»)
    if (!omitted) {
      setWizardHistory([{ type: 'route_select', availableRouteIds: [] }]);
      return;
    }

    if (isGrayAreaMode) {
      setWizardHistory([{ type: 'route_select', availableRouteIds: [] }]);
      return;
    }

    const allActiveRoutes = routes.filter((r) => r.isActive);
    setWizardHistory([
      { type: 'route_select', availableRouteIds: allActiveRoutes.map((r) => r.id) },
    ]);
  }, [routes, isGrayAreaMode, initialFilteredRouteIds]);

  // ====================================================================
  // Get Current Data
  // ====================================================================

  const getCurrentRoute = (): Route | null => {
    if (currentWizardStep.type === 'step_conditions' || currentWizardStep.type === 'child_conditions') {
      return routes.find(r => r.id === currentWizardStep.routeId) || null;
    }
    return null;
  };

  const getCurrentStep = (): Step | null => {
    const route = getCurrentRoute();
    if (!route) return null;
    
    if (currentWizardStep.type === 'step_conditions' || currentWizardStep.type === 'child_conditions') {
      const routeSteps = steps
        .filter(s => s.routeId === route.id)
        .sort((a, b) => a.order - b.order);
      
      return routeSteps[currentWizardStep.stepIndex] || null;
    }
    
    return null;
  };

  const currentRoute = getCurrentRoute();
  const currentStep = getCurrentStep();
  
  // Get current conditions based on wizard step type
  const currentConditions = (() => {
    if (currentWizardStep.type === 'child_conditions') {
      return currentWizardStep.parentCondition.childConditions || [];
    }
    return currentStep?.subConditions || [];
  })();

  // ====================================================================
  // Handlers
  // ====================================================================

  const handleRouteSelect = (routeId: string) => {
    const route = routes.find(r => r.id === routeId);
    if (!route) return;

    console.log('🎯 Route Selected:', route.name);

    setWizardHistory([
      ...wizardHistory,
      { type: 'step_conditions', routeId, stepIndex: 0 }
    ]);
    setSelectedConditionId(null);
  };

  const handleConditionSelect = (subConditionId: string) => {
    const subCondition = currentConditions.find(sc => sc.id === subConditionId);
    if (!subCondition || !currentRoute || !currentStep) return;

    setSelectedConditionId(subConditionId);

    // Update debug panel
    if (onDebugUpdate) {
      onDebugUpdate({
        activeRoute: currentRoute.name,
        currentStep: { name: currentStep.name, order: currentStep.order },
        subCondition: subCondition.name,
        action: subCondition.action,
      });
    }

    console.log('✅ Condition selected:', {
      step: currentStep.name,
      subCondition: subCondition.name,
      action: subCondition.action,
    });

    // Auto-navigation for 'continue' action
    if (subCondition.action === 'continue') {
      setTimeout(() => {
        handleProceed(subCondition);
      }, 400);
    }
  };

  const handleProceed = (selectedCondition: SubCondition) => {
    if (!currentRoute || !currentStep) return;

    const newFlowPath = [...flowPath, { route: currentRoute, step: currentStep, subCondition: selectedCondition }];
    setFlowPath(newFlowPath);

    console.log('🔍 handleProceed:', {
      subConditionId: selectedCondition.id,
      subConditionName: selectedCondition.name,
      action: selectedCondition.action,
    });

    // Check for linked routes
    const parentStepLinkedRoutes = routes.filter(r => 
      r.parentSteps.includes(selectedCondition.id) && r.isActive
    );
    const linkedRouteIds = selectedCondition.linkedRouteIds || [];
    const allLinkedRouteIds = [
      ...parentStepLinkedRoutes.map(r => r.id),
      ...linkedRouteIds,
    ];
    const uniqueLinkedRouteIds = [...new Set(allLinkedRouteIds)];

    console.log('🎯 Linked routes found:', uniqueLinkedRouteIds);

    if (selectedCondition.action === 'continue') {
      // Priority 1: Check for child conditions (nested steps)
      if (selectedCondition.childConditions && selectedCondition.childConditions.length > 0) {
        console.log('🔽 Navigating to child conditions');
        setWizardHistory([
          ...wizardHistory,
          { 
            type: 'child_conditions', 
            parentCondition: selectedCondition,
            routeId: currentRoute.id,
            stepIndex: currentWizardStep.type === 'step_conditions' ? currentWizardStep.stepIndex : 0
          }
        ]);
        setSelectedConditionId(null);
        return;
      }
      
      // Priority 2: Check for linked routes
      if (uniqueLinkedRouteIds.length > 0) {
        console.log('🔗 Navigating to linked routes');
        setWizardHistory([
          ...wizardHistory,
          { type: 'route_select', availableRouteIds: uniqueLinkedRouteIds }
        ]);
        setSelectedConditionId(null);
        return;
      }
      
      // Priority 3: Move to next step in current route (only if in step_conditions, not child_conditions)
      if (currentWizardStep.type === 'step_conditions') {
        const routeSteps = steps
          .filter(s => s.routeId === currentRoute.id)
          .sort((a, b) => a.order - b.order);
        
        const nextStepIndex = currentWizardStep.stepIndex + 1;
        
        if (nextStepIndex < routeSteps.length) {
          setWizardHistory([
            ...wizardHistory.slice(0, -1),
            { type: 'step_conditions', routeId: currentRoute.id, stepIndex: nextStepIndex }
          ]);
          setSelectedConditionId(null);
        } else {
          // All steps completed
          finishFlow(newFlowPath, 'continue');
        }
      } else {
        // If we're in child_conditions and no linked routes, just finish
        finishFlow(newFlowPath, 'continue');
      }
    } else {
      // force_solution or direct_answer or escalation
      finishFlow(newFlowPath, selectedCondition.action);
    }
  };

  const finishFlow = (
    path: Array<{ route: Route; step: Step; subCondition: SubCondition }>,
    action: 'continue' | 'force_solution' | 'direct_answer' | 'escalation'
  ) => {
    setFlowFinished(true);
    setFinalAction(action);

    const completedSteps = path.map(p => ({
      stepId: p.step.id,
      stepName: p.step.name,
      selectedSubCondition: p.subCondition,
    }));

    const lastStep = path[path.length - 1];
    
    onFlowComplete({
      completedSteps,
      finalAction: action,
      escalationDetails: action === 'escalation' ? lastStep.subCondition.actionDetails : undefined,
      solutionDetails: action === 'force_solution' || action === 'direct_answer'
        ? lastStep.subCondition.actionDetails
        : undefined,
    });

    console.log('🏁 Flow finished:', { action, completedSteps: completedSteps.length });
  };

  const handleBack = () => {
    if (wizardHistory.length > 1) {
      const newHistory = wizardHistory.slice(0, -1);
      setWizardHistory(newHistory);
      setSelectedConditionId(null);
      
      // Remove last item from flow path if going back from step or child conditions
      if (currentWizardStep.type === 'step_conditions' || currentWizardStep.type === 'child_conditions') {
        setFlowPath(flowPath.slice(0, -1));
      }
    }
  };

  const handleReset = () => {
    setWizardHistory([{ type: 'route_select', availableRouteIds: [] }]);
    setFlowPath([]);
    setSelectedConditionId(null);
    setFlowFinished(false);
    setFinalAction(null);
  };

  // ====================================================================
  // Render
  // ====================================================================

  // No routes available
  if (currentWizardStep.type === 'route_select' && currentWizardStep.availableRouteIds.length === 0) {
    const customEmpty = scopedEmptyMessage?.trim();
    return (
      <div className="glass-panel border-2 border-border rounded-xl p-6 text-center space-y-3">
        <AlertCircle className="size-12 text-muted-foreground mx-auto mb-1" />
        {categoryScopeBanner && (
          <div className="text-right glass-card rounded-lg p-3 border border-primary/20 mb-2">
            <p className="text-sm font-semibold text-foreground">{categoryScopeBanner.title}</p>
            {categoryScopeBanner.subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{categoryScopeBanner.subtitle}</p>
            )}
          </div>
        )}
        <p className="text-muted-foreground text-sm font-semibold">
          {customEmpty
            ? customEmpty
            : isGrayAreaMode
              ? 'لا توجد مسارات مربوطة بهذا السؤال'
              : 'لا توجد مسارات متاحة'}
        </p>
        {!customEmpty && (
          <p className="text-xs text-muted-foreground mt-2">
            {isGrayAreaMode
              ? 'يرجى ربط المسارات المناسبة بهذا السؤال من صفحة الإعدادات المتقدمة'
              : 'يرجى تفعيل بعض المسارات من لوحة الإعدادات'}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      {categoryScopeBanner && !flowFinished && (
        <div className="flex items-start gap-3 glass-panel rounded-lg p-3 border border-cyan-500/25 bg-cyan-500/5">
          <FolderTree className="size-5 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
          <div className="text-right flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">{categoryScopeBanner.title}</p>
            {categoryScopeBanner.subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{categoryScopeBanner.subtitle}</p>
            )}
          </div>
        </div>
      )}
      {/* Breadcrumb - المسار الحالي */}
      {flowPath.length > 0 && !flowFinished && (
        <div className="glass-panel rounded-lg p-3 border">
          <div className="flex items-center gap-2 justify-end flex-wrap">
            <span className="text-[10px] text-muted-foreground">المسار الحالي:</span>
            {flowPath.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">
                  {item.route.name} → {item.subCondition.name}
                </Badge>
                {index < flowPath.length - 1 && (
                  <ArrowLeft className="size-3 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      {!flowFinished && (
        <div className="glass-panel border-2 border-primary/30 rounded-xl p-5 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-2 pb-3 border-b border-border justify-end">
            <h4 className="font-bold text-foreground">
              {currentWizardStep.type === 'route_select' && 'اختر المسار المناسب'}
              {currentWizardStep.type === 'step_conditions' && currentStep && `حدد الحالة: ${currentStep.name}`}
              {currentWizardStep.type === 'child_conditions' && `حدد الحالة: ${currentWizardStep.parentCondition.name}`}
            </h4>
            {currentWizardStep.type === 'route_select' ? (
              <Layers className="size-5 text-primary" />
            ) : (
              <Target className="size-5 text-primary" />
            )}
          </div>

          {/* Route Selector */}
          {currentWizardStep.type === 'route_select' && (
            <div className="space-y-2">
              {currentWizardStep.availableRouteIds.map(routeId => {
                const route = routes.find(r => r.id === routeId);
                if (!route) return null;

                return (
                  <button
                    key={route.id}
                    onClick={() => handleRouteSelect(route.id)}
                    className="w-full glass-panel border-2 border-border hover:border-primary/50 rounded-lg p-4 text-right transition-all group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <MapPin className="size-4 text-primary" />
                          <h5 className="font-semibold text-foreground">{route.name}</h5>
                          <Badge className="bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-400 border-0 text-[10px]">
                            المرحلة {route.order}
                          </Badge>
                        </div>
                        {route.description && (
                          <p className="text-xs text-muted-foreground mt-1">{route.description}</p>
                        )}
                      </div>
                      <ArrowRight className="size-5 text-primary group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Step Conditions Selector (for both step_conditions and child_conditions) */}
          {(currentWizardStep.type === 'step_conditions' || currentWizardStep.type === 'child_conditions') && (
            <div className="space-y-2">
              {/* Info banner for linked routes/conditions */}
              {(() => {
                // Count total linked routes and child conditions
                let totalLinkedRoutes = 0;
                let totalChildConditions = 0;
                
                currentConditions.forEach(subCond => {
                  const linkedRoutes = routes.filter(r => 
                    r.parentSteps.includes(subCond.id) && r.isActive
                  );
                  const additionalLinkedRouteIds = subCond.linkedRouteIds || [];
                  totalLinkedRoutes += linkedRoutes.length + additionalLinkedRouteIds.length;
                  
                  if (subCond.childConditions && subCond.childConditions.length > 0) {
                    totalChildConditions += subCond.childConditions.length;
                  }
                });
                
                if (totalLinkedRoutes > 0 || totalChildConditions > 0) {
                  return (
                    <div className="glass-panel rounded-lg p-3 border border-cyan-500/30 bg-cyan-500/5 mb-3">
                      <div className="flex items-center gap-2 justify-end">
                        <p className="text-[11px] text-cyan-700 dark:text-cyan-300">
                          💡 هذه الخطوة تحتوي على {totalLinkedRoutes > 0 && `${totalLinkedRoutes} مسار متصل`}{totalLinkedRoutes > 0 && totalChildConditions > 0 && ' و '}{totalChildConditions > 0 && `${totalChildConditions} خطوة فرعية`}
                        </p>
                        <GitBranch className="size-3 text-cyan-600 dark:text-cyan-400" />
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
              
              {currentConditions.map(subCond => {
                const isSelected = selectedConditionId === subCond.id;
                
                // Check for child conditions (nested steps)
                const hasChildConditions = subCond.childConditions && subCond.childConditions.length > 0;
                
                // Check for linked routes
                const linkedRoutes = routes.filter(r => 
                  r.parentSteps.includes(subCond.id) && r.isActive
                );
                const additionalLinkedRouteIds = subCond.linkedRouteIds || [];
                const totalLinkedCount = linkedRoutes.length + additionalLinkedRouteIds.length;

                return (
                  <div
                    key={subCond.id}
                    className={`glass-panel rounded-lg p-3 border-2 transition-all cursor-pointer ${
                      isSelected 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/30'
                    }`}
                    onClick={() => handleConditionSelect(subCond.id)}
                  >
                    <div className="flex items-start gap-3 text-right">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleConditionSelect(subCond.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            {/* Icons for linked routes or child conditions */}
                            {subCond.action === 'continue' && totalLinkedCount > 0 && (
                              <GitBranch className="size-4 text-cyan-600 dark:text-cyan-400" />
                            )}
                            {hasChildConditions && (
                              <FolderTree className="size-4 text-blue-600 dark:text-blue-400" />
                            )}
                          </div>
                          <p className="text-sm font-semibold text-foreground">{subCond.name}</p>
                        </div>
                        
                        {/* Badges for action type and linked info */}
                        {grayAreaSettings.showActionTags && (
                          <div className="flex items-center gap-2 justify-end flex-wrap mt-2">
                            {subCond.action === 'force_solution' && (
                              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0 text-[10px]">
                                حل مباشر
                              </Badge>
                            )}
                            {subCond.action === 'direct_answer' && (
                              <Badge className="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-0 text-[10px]">
                                إجابة مباشرة
                              </Badge>
                            )}
                            {subCond.action === 'escalation' && (
                              <Badge className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-0 text-[10px]">
                                تصعيد
                              </Badge>
                            )}
                            {subCond.action === 'continue' && (
                              <>
                                <Badge className="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-0 text-[10px]">
                                  متابعة
                                </Badge>
                                {totalLinkedCount > 0 && (
                                  <Badge variant="outline" className="text-[10px]">
                                    {totalLinkedCount} مسار متصل
                                  </Badge>
                                )}
                                {hasChildConditions && (
                                  <Badge variant="outline" className="text-[10px]">
                                    {subCond.childConditions!.length} خطوة فرعية
                                  </Badge>
                                )}
                              </>
                            )}
                          </div>
                        )}
                        
                        {isSelected && subCond.actionDetails && grayAreaSettings.showActionDetails && (
                          <div className="mt-2 pt-2 border-t border-border">
                            <p className="text-xs font-semibold text-foreground mb-1">
                              {subCond.action === 'escalation' 
                                ? '⚠️ ملاحظات قبل التصعيد:' 
                                : subCond.action === 'force_solution' || subCond.action === 'direct_answer'
                                ? '💡 توجيهات الحل:'
                                : 'تفاصيل:'}
                            </p>
                            <p className="text-xs text-muted-foreground">{subCond.actionDetails}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Action Button (for force_solution / escalation) */}
          {selectedConditionId && currentConditions.find(sc => sc.id === selectedConditionId)?.action !== 'continue' && (
            <Button
              onClick={() => {
                const selected = currentConditions.find(sc => sc.id === selectedConditionId);
                if (selected) handleProceed(selected);
              }}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 font-bold"
            >
              {currentConditions.find(sc => sc.id === selectedConditionId)?.action === 'force_solution'
                ? '✓ تطبيق الحل'
                : currentConditions.find(sc => sc.id === selectedConditionId)?.action === 'direct_answer'
                  ? '✓ تطبيق إجابة مباشرة'
                  : '✓ تطبيق التصعيد'}
            </Button>
          )}
        </div>
      )}

      {/* Flow Finished */}
      {flowFinished && (
        <div className={`glass-panel rounded-xl p-5 border-2 ${
          finalAction === 'continue'
            ? 'border-emerald-500/50 bg-emerald-50/30 dark:bg-emerald-950/20'
            : finalAction === 'force_solution'
            ? 'border-orange-500/50 bg-orange-50/30 dark:bg-orange-950/20'
            : finalAction === 'direct_answer'
            ? 'border-cyan-500/50 bg-cyan-50/30 dark:bg-cyan-950/20'
            : 'border-red-500/50 bg-red-50/30 dark:bg-red-950/20'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            {finalAction === 'continue' ? (
              <CheckCircle2 className="size-8 text-emerald-600 dark:text-emerald-400" />
            ) : finalAction === 'force_solution' ? (
              <StopCircle className="size-8 text-orange-600 dark:text-orange-400" />
            ) : finalAction === 'direct_answer' ? (
              <CheckCircle2 className="size-8 text-cyan-600 dark:text-cyan-400" />
            ) : (
              <AlertCircle className="size-8 text-red-600 dark:text-red-400" />
            )}
            <div className="text-right flex-1">
              <h4 className="font-bold text-foreground">
                {finalAction === 'continue' 
                  ? 'تمت جميع الخطوات بنجاح'
                  : finalAction === 'force_solution'
                  ? 'تم إيقاف العملية - يوجد حل'
                  : finalAction === 'direct_answer'
                  ? 'تم تطبيق إجابة مباشرة'
                  : 'تم التصعيد للجهة المختصة'
                }
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                تم إنشاء الرد بناءً على المسار المحدد
              </p>
            </div>
          </div>

          <Button
            onClick={handleReset}
            variant="outline"
            size="sm"
            className="w-full"
          >
            🔄 إعادة المحاولة
          </Button>
        </div>
      )}

      {/* Back Button */}
      {wizardHistory.length > 1 && !flowFinished && (
        <div className="border-t pt-4">
          <Button
            onClick={handleBack}
            variant="outline"
            className="w-full"
          >
            <ArrowRight className="size-4 ml-2" />
            رجوع
          </Button>
        </div>
      )}

      <p className="text-[10px] text-center text-muted-foreground pt-2">
        سيتم توليد الصيغة تلقائياً بعد إتمام الخطوات
      </p>
    </div>
  );
}