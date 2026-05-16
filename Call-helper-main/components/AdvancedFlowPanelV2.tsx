/**
 * ====================================================================
 * Advanced Flow Panel V2 - Flexible Route Navigation
 * ====================================================================
 * 
 * نظامين مختلفين:
 * 1. Gray Area Mode (< 50%): Show الroutes المربوطة بالسؤال المختار فقط (of إعدادات Gray Area)
 * 2. Advanced Mode (50-79%): Show جميع الroutes المفعلة، ثم التنقل Based on اNoختيار
 * 
 * ✨ ميزة جديدة: اNoعتماد الكلي على linkedRouteIds of إعدادات الأسئلة في وضع Gray Area
 * ❌ تم Cancel keyword matching في وضع Gray Area
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
  ChevronLeft,
  Layers,
  MapPin,
  Target,
  ArrowLeft,
  ListFilter,
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import type { Route, Step, SubCondition } from '../contexts/AdvancedSettingsContext';
import { matchRoutesFromDescription } from '../utils/keywordMatcher';

interface AdvancedFlowPanelV2Props {
  routes: Route[];
  steps: Step[];
  problemDescription: string;
  isGrayAreaMode: boolean; // true = Gray Area (< 50%), false = Advanced Mode (50-79%)
  initialFilteredRouteIds?: string[]; // ✨ NEW: Initial filtered routes from Gray Area question selection
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

interface BreadcrumbItem {
  name: string;
  level: number;
  type: 'route' | 'step' | 'condition';
}

export function AdvancedFlowPanelV2({ 
  routes, 
  steps, 
  problemDescription,
  isGrayAreaMode,
  initialFilteredRouteIds,
  onFlowComplete,
  onDebugUpdate,
}: AdvancedFlowPanelV2Props) {
  // ====================================================================
  // Wizard-style Navigation (like GrayAreaWizard)
  // ====================================================================
  
  type WizardStepType = 
    | { type: 'route_select'; availableRouteIds: string[] }
    | { type: 'step_conditions'; routeId: string; stepIndex: number }
    | { type: 'child_conditions'; routeId: string; stepIndex: number; parentPath: SubCondition[] };

  const [wizardHistory, setWizardHistory] = useState<WizardStepType[]>([
    { type: 'route_select', availableRouteIds: [] }
  ]);
  
  const currentWizardStep = wizardHistory[wizardHistory.length - 1];
  
  // ====================================================================
  // State Management
  // ====================================================================
  
  const [selectedConditionId, setSelectedConditionId] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Array<{
    stepId: string;
    stepName: string;
    selectedSubCondition: SubCondition;
  }>>([]);
  
  // Flow state
  const [flowFinished, setFlowFinished] = useState(false);
  const [finalAction, setFinalAction] = useState<'continue' | 'force_solution' | 'escalation' | null>(null);
  const [flowPath, setFlowPath] = useState<Array<{
    route: Route;
    step: Step;
    subCondition: SubCondition;
  }>>([]);

  // ====================================================================
  // Initialize Available Routes
  // ====================================================================

  useEffect(() => {
    if (isGrayAreaMode) {
      // ✨ Gray Area Mode: Use ONLY linkedRouteIds from question settings
      // ❌ NO keyword matching - only show routes linked to the selected question
      
      if (initialFilteredRouteIds && initialFilteredRouteIds.length > 0) {
        console.log('🎯 Gray Area Mode - Using Linked Routes from Question:', initialFilteredRouteIds);
        
        const filteredRoutes = routes
          .filter(route => route.isActive && initialFilteredRouteIds.includes(route.id));
        
        setWizardHistory([{ type: 'route_select', availableRouteIds: filteredRoutes.map(r => r.id) }]);
        
        console.log('✅ Filtered Routes:', filteredRoutes.map(r => r.name));
      } else {
        // No linked routes - show nothing
        console.log('⚠️ Gray Area Mode - No linked routes found');
        setWizardHistory([{ type: 'route_select', availableRouteIds: [] }]);
      }
    } else {
      // Advanced Mode: Show ALL active routes (no parent restriction initially)
      const allActiveRoutes = routes.filter(route => route.isActive);
      setWizardHistory([{ type: 'route_select', availableRouteIds: allActiveRoutes.map(r => r.id) }]);

      console.log('🎯 Advanced Mode - All Routes Available:', {
        totalRoutes: allActiveRoutes.length,
        routes: allActiveRoutes.map(r => r.name),
      });
    }
  }, [routes, isGrayAreaMode, initialFilteredRouteIds]);

  // ====================================================================
  // Get Current Route and Step
  // ====================================================================

  const currentRouteId = currentWizardStep.type === 'route_select' ? null : currentWizardStep.routeId;
  const currentRoute = currentRouteId ? routes.find(r => r.id === currentRouteId) : null;
  
  // Get steps for current route
  const currentRouteSteps = currentRoute 
    ? steps.filter(step => step.routeId === currentRoute.id).sort((a, b) => a.order - b.order)
    : [];
  
  const currentStep = currentRouteSteps[currentWizardStep.type === 'step_conditions' ? currentWizardStep.stepIndex : 0];

  // ====================================================================
  // Initialize Current Conditions
  // ====================================================================

  useEffect(() => {
    if (currentStep) {
      const currentConditions = currentStep.subConditions;
      const breadcrumbs: BreadcrumbItem[] = [
        ...selectedRouteIds.map((routeId, idx) => {
          const route = routes.find(r => r.id === routeId);
          return {
            name: route?.name || 'Unknown',
            level: idx,
            type: 'route' as const,
          };
        }),
        { 
          name: currentStep.name, 
          level: selectedRouteIds.length, 
          type: 'step' as const,
        },
      ];
      const conditionPath: SubCondition[] = [];
      setSelectedConditionId(null);
    }
  }, [currentStep, selectedRouteIds, routes]);

  // ====================================================================
  // Route Selection
  // ====================================================================

  /**
   * Handle route selection
   */
  const handleRouteSelect = (routeId: string) => {
    const route = routes.find(r => r.id === routeId);
    if (!route) return;

    console.log('🎯 Route Selected:', route.name);

    // Add to route stack
    setSelectedRouteIds(prev => [...prev, routeId]);
    
    // Hide route selector
    setShowRouteSelector(false);
    
    // Reset step navigation
    setCurrentStepIndex(0);
    setCompletedSteps([]);
    setConditionPath([]);
    setSelectedConditionId(null);
  };

  /**
   * Show linked routes (when continue action has linkedRouteIds)
   */
  const showLinkedRoutes = (linkedRouteIds: string[]) => {
    const linkedRoutes = routes.filter(r => linkedRouteIds.includes(r.id) && r.isActive);
    
    console.log('🔗 Showing Linked Routes:', {
      linkedIds: linkedRouteIds,
      foundRoutes: linkedRoutes.map(r => r.name),
    });

    setAvailableRoutes(linkedRoutes);
    setShowRouteSelector(true);
  };

  // ====================================================================
  // Condition Handling
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
          linkedRoutes: selectedCondition.linkedRouteIds,
        });

        // For 'continue' action, check auto-navigation options
        if (selectedCondition.action === 'continue') {
          // Priority 1: Check for linked routes (via parentSteps or linkedRouteIds)
          const parentStepLinkedRoutes = routes.filter(r => 
            r.parentSteps.includes(selectedCondition.id) && r.isActive
          );
          const linkedRouteIds = selectedCondition.linkedRouteIds || [];
          const allLinkedRouteIds = [
            ...parentStepLinkedRoutes.map(r => r.id),
            ...linkedRouteIds,
          ];
          const uniqueLinkedRouteIds = [...new Set(allLinkedRouteIds)];

          if (uniqueLinkedRouteIds.length > 0) {
            console.log('🔗 Auto-navigating to linked routes...');
            setTimeout(() => {
              const newPath = [...conditionPath, selectedCondition];
              setConditionPath(newPath);

              // Record this step as completed
              const newCompletedSteps = [
                ...completedSteps,
                {
                  stepId: currentStep.id,
                  stepName: currentStep.name,
                  selectedSubCondition: selectedCondition,
                },
              ];
              setCompletedSteps(newCompletedSteps);

              // Show linked routes for selection
              const linkedRoutes = routes.filter(r => uniqueLinkedRouteIds.includes(r.id) && r.isActive);
              setAvailableRoutes(linkedRoutes);
              setShowRouteSelector(true);

              console.log('🔗 Navigated to linked routes:', linkedRoutes.map(r => r.name));
            }, 400);
            return;
          }

          // Priority 2: Check for child conditions
          if (selectedCondition.childConditions && selectedCondition.childConditions.length > 0) {
            console.log('🔄 Auto-navigating to child conditions...');
            setTimeout(() => {
              const newPath = [...conditionPath, selectedCondition];
              setConditionPath(newPath);

              setCurrentConditions(selectedCondition.childConditions);
              setBreadcrumbs(prev => [...prev, { 
                name: selectedCondition.name, 
                level: prev.length, 
                type: 'condition',
              }]);
              setSelectedConditionId(null);

              console.log('🔽 Navigated to children:', {
                parent: selectedCondition.name,
                children: selectedCondition.childConditions.map(c => c.name),
              });
            }, 400);
            return;
          }
        }
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
      alert('Please pick an option to continue.');
      return;
    }

    const selectedCondition = currentConditions.find(sc => sc.id === selectedConditionId);
    if (!selectedCondition) return;

    const newPath = [...conditionPath, selectedCondition];
    setConditionPath(newPath);

    console.log('🔍 handleProceed - Full Debug:', {
      stepId: currentStep.id,
      stepName: currentStep.name,
      routeId: currentRoute?.id,
      routeName: currentRoute?.name,
      subConditionId: selectedCondition.id,
      subConditionName: selectedCondition.name,
      subConditionAction: selectedCondition.action,
    });

    console.log('📊 All Routes in Context:', routes.map(r => ({
      id: r.id,
      name: r.name,
      isActive: r.isActive,
      parentSteps: r.parentSteps,
    })));

    // ✅ NEW: Check for routes linked via Route.parentSteps (same as GrayAreaWizard)
    const parentStepLinkedRoutes = routes.filter(r => {
      const hasParentSubCondition = r.parentSteps.includes(selectedCondition.id);
      console.log(`  - Checking route "${r.name}" (${r.id}): parentSteps=${JSON.stringify(r.parentSteps)}, includes(${selectedCondition.id})=${hasParentSubCondition}, isActive=${r.isActive}`);
      return hasParentSubCondition && r.isActive;
    });
    
    console.log('✅ SubCondition-linked routes found:', parentStepLinkedRoutes.map(r => ({ id: r.id, name: r.name })));
    
    // Also check SubCondition.linkedRouteIds (legacy method)
    const linkedRouteIds = selectedCondition.linkedRouteIds || [];
    
    console.log('🔗 Additional SubCondition-linked route IDs:', linkedRouteIds);
    
    // Combine both methods
    const allLinkedRouteIds = [
      ...parentStepLinkedRoutes.map(r => r.id),
      ...linkedRouteIds,
    ];
    
    // Remove duplicates
    const uniqueLinkedRouteIds = [...new Set(allLinkedRouteIds)];

    console.log('🎯 Final linked route IDs:', uniqueLinkedRouteIds);

    // Check for linked routes
    if (selectedCondition.action === 'continue' && uniqueLinkedRouteIds.length > 0) {
      console.log('🔗 Condition has linked routes!');
      
      // Record this step as completed
      const newCompletedSteps = [
        ...completedSteps,
        {
          stepId: currentStep.id,
          stepName: currentStep.name,
          selectedSubCondition: selectedCondition,
        },
      ];
      setCompletedSteps(newCompletedSteps);

      // Show linked routes for selection
      showLinkedRoutes(uniqueLinkedRouteIds);
      return;
    }

    // Check if this condition has child conditions
    if (selectedCondition.childConditions && selectedCondition.childConditions.length > 0) {
      // Navigate deeper
      setCurrentConditions(selectedCondition.childConditions);
      setBreadcrumbs(prev => [...prev, { 
        name: selectedCondition.name, 
        level: prev.length, 
        type: 'condition',
      }]);
      setSelectedConditionId(null);

      console.log('🔽 Navigating deeper:', {
        parent: selectedCondition.name,
        children: selectedCondition.childConditions.map(c => c.name),
      });
    } else if (selectedCondition.action === 'continue') {
      // No children and no linked routes, move to next step
      moveToNextStep(newPath);
    } else {
      // Force solution or Escalation
      handleFinishFlow(selectedCondition);
    }
  };

  /**
   * Move to next step
   */
  const moveToNextStep = (path: SubCondition[]) => {
    const finalCondition = path[path.length - 1];
    
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
    if (currentStepIndex < currentRouteSteps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
      setConditionPath([]);
      setSelectedConditionId(null);
    } else {
      // All steps in current route completed
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
    setSelectedRouteIds([]);
    setShowRouteSelector(true);
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
  const handleBreadcrumbClick = (level: number, type: BreadcrumbItem['type']) => {
    if (type === 'route') {
      // Back to route selection
      const targetRouteStack = selectedRouteIds.slice(0, level + 1);
      setSelectedRouteIds(targetRouteStack);
      setShowRouteSelector(false);
      setCurrentStepIndex(0);
      setCompletedSteps([]);
      setConditionPath([]);
      setSelectedConditionId(null);
    } else if (type === 'step') {
      // Back to step root
      setCurrentConditions(currentStep.subConditions);
      setBreadcrumbs(prev => prev.slice(0, level + 1));
      setConditionPath([]);
      setSelectedConditionId(null);
    } else {
      // Back to specific condition level
      const targetPath = conditionPath.slice(0, level - selectedRouteIds.length);
      const lastCondition = targetPath[targetPath.length - 1];
      
      if (lastCondition.childConditions) {
        setCurrentConditions(lastCondition.childConditions);
        setBreadcrumbs(prev => prev.slice(0, level + 1));
        setConditionPath(targetPath);
        setSelectedConditionId(null);
      }
    }
  };

  // ====================================================================
  // UI Helpers
  // ====================================================================

  const getActionBadge = (action: SubCondition['action']) => {
    const config = {
      continue: {
        label: 'Continue',
        color: 'bg-success/10 text-emerald-700 dark:bg-emerald-950 dark:text-success',
        icon: PlayCircle,
      },
      force_solution: {
        label: 'Stop & resolve',
        color: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400',
        icon: StopCircle,
      },
      escalation: {
        label: 'Escalate',
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

  // No routes available
  if (availableRoutes.length === 0) {
    return (
      <div className="glass-panel border-2 border-border rounded-xl p-6 text-center">
        <Search className="size-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground text-sm font-semibold">
          {isGrayAreaMode 
            ? 'No routes linked to this question.'
            : 'No routes available.'
          }
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          {isGrayAreaMode 
            ? 'Link routes to this question in Advanced Settings.'
            : 'Enable some routes in Settings.'
          }
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Route Selector */}
      {showRouteSelector && !flowFinished && (
            <div className="glass-panel border-2 border-primary/30 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-border">
                <Layers className="size-5 text-primary" />
                <h4 className="font-bold text-foreground">
                  {selectedRouteIds.length === 0 
                    ? 'Pick a route'
                    : 'Pick a sub-route'
                  }
                </h4>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {availableRoutes.map((route) => (
                  <button
                    key={route.id}
                    onClick={() => handleRouteSelect(route.id)}
                    className="glass-panel border-2 border-border hover:border-primary/50 rounded-lg p-4 text-left transition-all group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <MapPin className="size-4 text-primary" />
                          <h5 className="font-semibold text-foreground">
                            {route.name}
                          </h5>
                          <Badge className="bg-primary/10 text-primary dark:bg-primary-soft dark:text-primary border-0 text-[10px]">
                            Stage {route.order}
                          </Badge>
                        </div>
                        {route.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {route.description}
                          </p>
                        )}
                      </div>
                      <ArrowRight className="size-5 text-primary group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

      {/* Step Navigation (when route is selected) */}
      {!showRouteSelector && !flowFinished && currentRoute && currentStep && (
            <div className="glass-panel border-2 border-primary/30 rounded-xl p-5 space-y-4">
              {/* Step Header */}
              <div className="flex items-start gap-3 pb-3 border-b border-border">
                <div className="text-left flex-1">
                  {/* Breadcrumb Navigation */}
                  {breadcrumbs.length > 0 && (
                    <div className="flex items-center gap-1 mb-2 flex-wrap">
                      {breadcrumbs.map((crumb, index) => (
                        <div key={index} className="flex items-center gap-1">
                          {index > 0 && <ChevronLeft className="size-3 text-muted-foreground" />}
                          <button
                            onClick={() => handleBreadcrumbClick(crumb.level, crumb.type)}
                            className={`text-[10px] hover:underline ${
                              crumb.type === 'route' 
                                ? 'text-primary dark:text-primary font-bold'
                                : crumb.type === 'step'
                                ? 'text-primary font-semibold'
                                : 'text-success dark:text-success'
                            }`}
                          >
                            {crumb.name}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <ArrowRight className="size-4 text-primary" />
                    <h4 className="font-bold text-foreground">
                      {currentStep.name}
                    </h4>
                  </div>
                </div>
                <Badge className="bg-primary/10 text-primary dark:bg-primary-soft dark:text-primary border-0 text-xs">
                  {currentStepIndex + 1}/{currentRouteSteps.length}
                </Badge>
              </div>

              {/* Sub-conditions */}
              {currentConditions.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground mb-3">
                    No options for this stage.
                  </p>
                  <Button
                    onClick={() => moveToNextStep(conditionPath)}
                    className="bg-primary text-white"
                    size="sm"
                  >
                    Continue to next stage
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {currentConditions.map((subCond) => {
                    const isSelected = selectedConditionId === subCond.id;
                    const isActionStop = subCond.action !== 'continue';
                    const hasChildren = subCond.childConditions && subCond.childConditions.length > 0;
                    const hasLinkedRoutes = subCond.linkedRouteIds && subCond.linkedRouteIds.length > 0;

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
                          <div className="flex items-start gap-3 flex-1 text-left">
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
                                <p className="text-[10px] text-primary dark:text-primary mt-0.5">
                                  {subCond.childConditions!.length} available sub-option
                                </p>
                              )}
                              {hasLinkedRoutes && (
                                <p className="text-[10px] text-success dark:text-success mt-0.5">
                                  🔗 {subCond.linkedRouteIds!.length} linked route
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {isSelected && subCond.actionDetails && (
                          <div className={`mt-3 pt-3 border-t ${
                            isActionStop 
                              ? 'border-primary/30' 
                              : 'border-border'
                          }`}>
                            <p className="text-xs font-semibold text-foreground mb-1">
                              {subCond.action === 'escalation' 
                                ? '⚠️ Notes before escalation:' 
                                : subCond.action === 'force_solution'
                                ? '💡 Resolution guidance:'
                                : 'Details:'}
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

              {/* Continue Button */}
              {selectedConditionId && (() => {
                const selected = currentConditions.find(sc => sc.id === selectedConditionId);
                
                if (!selected) return null;

                if (selected.action === 'continue') {
                  const hasChildren = selected.childConditions && selected.childConditions.length > 0;
                  
                  if (hasChildren) {
                    return (
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">
                          ⏳ Sub-options are opening automatically…
                        </p>
                      </div>
                    );
                  }
                  
                  return (
                    <Button
                      onClick={handleProceed}
                      className="w-full bg-primary text-white hover:from-primary hover:to-primary"
                    >
                      {currentStepIndex < currentRouteSteps.length - 1 
                        ? '← Next stage'
                        : 'Finish & apply'
                      }
                    </Button>
                  );
                } else {
                  return (
                    <Button
                      onClick={() => handleFinishFlow(selected)}
                      className="w-full bg-gradient-to-r bg-primary text-white hover:from-orange-600 hover:to-red-600 font-bold"
                    >
                      {selected.action === 'force_solution' ? '✓ Apply resolution' : '✓ Apply escalation'}
                    </Button>
                  );
                }
              })()}
            </div>
          )}

      {/* Flow Finished */}
      {flowFinished && (
            <div className={`glass-panel rounded-xl p-5 border-2 ${
              finalAction === 'continue'
                ? 'border-success/50 bg-success/10/30 dark:bg-emerald-950/20'
                : finalAction === 'force_solution'
                ? 'border-primary/50 bg-orange-50/30 dark:bg-orange-950/20'
                : 'border-danger/50 bg-danger/10/30 dark:bg-red-950/20'
            }`}>
              <div className="flex items-center gap-3 mb-4">
                {finalAction === 'continue' ? (
                  <CheckCircle2 className="size-8 text-success dark:text-success" />
                ) : finalAction === 'force_solution' ? (
                  <StopCircle className="size-8 text-primary dark:text-orange-400" />
                ) : (
                  <AlertCircle className="size-8 text-danger dark:text-red-400" />
                )}
                <div className="text-left flex-1">
                  <h4 className="font-bold text-foreground">
                    {finalAction === 'continue' 
                      ? 'All steps completed.'
                      : finalAction === 'force_solution'
                      ? 'Stopped — resolution available.'
                      : 'Escalated to the relevant team.'
                    }
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Response created based on the selected route.
                  </p>
                </div>
              </div>

              <Button
                onClick={handleReset}
                variant="outline"
                size="sm"
                className="w-full"
              >
                🔄 Retry
              </Button>
            </div>
          )}
    </div>
  );
}