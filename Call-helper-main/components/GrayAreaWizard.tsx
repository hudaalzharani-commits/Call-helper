import { useState, useEffect } from 'react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  ListFilter,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  GitBranch,
  FolderTree,
  Target,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { useAdvancedSettings } from '../contexts/AdvancedSettingsContext';
import type { Route, Step, SubCondition } from '../contexts/AdvancedSettingsContext';

interface GrayAreaWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (flowPath: FlowPath) => void;
  isDarkMode: boolean;
}

export interface FlowPath {
  questionId: string;
  questionTitle: string;
  selectedRoute: Route | null;
  selectedSteps: Array<{
    route: Route;
    step: Step;
    subCondition: SubCondition;
  }>;
  finalAction: 'continue' | 'force_solution' | 'direct_answer' | 'escalation';
  finalStepDescription?: string;
}

type WizardStep = 
  | { type: 'question' }
  | { type: 'route'; questionId: string; availableRouteIds: string[] }
  | { type: 'subcondition'; route: Route; step: Step; previousSteps: Array<{ route: Route; step: Step; subCondition: SubCondition }> }
  | { type: 'child_subcondition'; route: Route; step: Step; parentCondition: SubCondition; previousSteps: Array<{ route: Route; step: Step; subCondition: SubCondition }> };

export function GrayAreaWizard({ isOpen, onClose, onComplete, isDarkMode }: GrayAreaWizardProps) {
  const { routes, steps, grayAreaSettings } = useAdvancedSettings();
  
  // Wizard navigation state
  const [wizardHistory, setWizardHistory] = useState<WizardStep[]>([{ type: 'question' }]);
  const [currentStep, setCurrentStep] = useState<WizardStep>({ type: 'question' });
  
  // Selection tracking
  const [selectedQuestion, setSelectedQuestion] = useState<{ id: string; title: string } | null>(null);
  const [flowPath, setFlowPath] = useState<Array<{
    route: Route;
    step: Step;
    subCondition: SubCondition;
  }>>([]);

  // Get enabled questions
  const enabledQuestions = grayAreaSettings.questions.filter(q => q.isEnabled);

  // Reset wizard when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setWizardHistory([{ type: 'question' }]);
      setCurrentStep({ type: 'question' });
      setSelectedQuestion(null);
      setFlowPath([]);
    }
  }, [isOpen]);

  // Handle question selection
  const handleQuestionSelect = (questionId: string, questionTitle: string) => {
    const question = grayAreaSettings.questions.find(q => q.id === questionId);
    if (!question || question.linkedRouteIds.length === 0) {
      return;
    }

    setSelectedQuestion({ id: questionId, title: questionTitle });
    
    const nextStep: WizardStep = {
      type: 'route',
      questionId,
      availableRouteIds: question.linkedRouteIds,
    };
    
    setCurrentStep(nextStep);
    setWizardHistory([...wizardHistory, nextStep]);
  };

  // Handle route selection
  const handleRouteSelect = (routeId: string) => {
    const route = routes.find(r => r.id === routeId);
    if (!route) return;

    // Find the step for this route
    const step = steps.find(s => s.routeId === route.id);
    if (!step) return;

    // Go directly to subcondition selection
    const nextStep: WizardStep = {
      type: 'subcondition',
      route,
      step,
      previousSteps: flowPath,
    };
    
    setCurrentStep(nextStep);
    setWizardHistory([...wizardHistory, nextStep]);
  };

  // Helper function to get all subcondition IDs from a step (including nested)
  const getAllSubConditionIds = (subConditions: SubCondition[]): string[] => {
    const ids: string[] = [];
    
    subConditions.forEach(sc => {
      ids.push(sc.id);
      if (sc.childConditions && sc.childConditions.length > 0) {
        ids.push(...getAllSubConditionIds(sc.childConditions));
      }
    });
    
    return ids;
  };

  // Handle subcondition selection
  const handleSubConditionSelect = (route: Route, step: Step, subCondition: SubCondition) => {
    const newFlowPath = [...flowPath, { route, step, subCondition }];
    setFlowPath(newFlowPath);

    console.log('🔍 handleSubConditionSelect - Full Debug:', {
      stepId: step.id,
      stepName: step.name,
      routeId: route.id,
      routeName: route.name,
      subConditionId: subCondition.id,
      subConditionName: subCondition.name,
      subConditionAction: subCondition.action,
    });

    console.log('📊 All Routes in Context:', routes.map(r => ({
      id: r.id,
      name: r.name,
      isActive: r.isActive,
      parentSteps: r.parentSteps,
    })));

    // ✅ FIX: Check for routes linked to this SUBCONDITION via parentSteps
    // parentSteps يحتوي على SubCondition IDs وليس Step IDs
    const subConditionLinkedRoutes = routes.filter(r => {
      const hasParentSubCondition = r.parentSteps.includes(subCondition.id);
      console.log(`  - Checking route "${r.name}" (${r.id}): parentSteps=${JSON.stringify(r.parentSteps)}, includes(${subCondition.id})=${hasParentSubCondition}, isActive=${r.isActive}`);
      return hasParentSubCondition && r.isActive;
    });
    
    console.log('✅ SubCondition-linked routes found:', subConditionLinkedRoutes.map(r => ({ id: r.id, name: r.name })));
    
    // Also check SubCondition.linkedRouteIds (if any)
    const additionalLinkedRouteIds = subCondition.linkedRouteIds || [];
    
    console.log('🔗 Additional SubCondition-linked route IDs:', additionalLinkedRouteIds);
    
    // Combine both
    const allLinkedRouteIds = [
      ...subConditionLinkedRoutes.map(r => r.id),
      ...additionalLinkedRouteIds,
    ];
    
    // Remove duplicates
    const uniqueLinkedRouteIds = [...new Set(allLinkedRouteIds)];

    console.log('🎯 Final linked route IDs:', uniqueLinkedRouteIds);

    // Check if we should show child conditions first (Priority 1)
    if (subCondition.action === 'continue' && subCondition.childConditions && subCondition.childConditions.length > 0) {
      console.log('✅ Showing child conditions (nested steps)');
      const nextStep: WizardStep = {
        type: 'child_subcondition',
        route,
        step,
        parentCondition: subCondition,
        previousSteps: newFlowPath,
      };
      
      setCurrentStep(nextStep);
      setWizardHistory([...wizardHistory, nextStep]);
    }
    // Check if we should show linked routes (Priority 2)
    else if (subCondition.action === 'continue' && uniqueLinkedRouteIds.length > 0) {
      console.log('✅ Showing linked routes (continue action with routes)');
      // Show linked routes
      const nextStep: WizardStep = {
        type: 'route',
        questionId: selectedQuestion?.id || '',
        availableRouteIds: uniqueLinkedRouteIds,
      };
      
      setCurrentStep(nextStep);
      setWizardHistory([...wizardHistory, nextStep]);
    } else if (
      subCondition.action === 'force_solution'
      || subCondition.action === 'direct_answer'
      || subCondition.action === 'escalation'
    ) {
      console.log('✅ Ending flow (force_solution or direct_answer or escalation)');
      // End of flow - complete wizard
      if (selectedQuestion) {
        onComplete({
          questionId: selectedQuestion.id,
          questionTitle: selectedQuestion.title,
          selectedRoute: route,
          selectedSteps: newFlowPath,
          finalAction: subCondition.action,
          finalStepDescription: subCondition.actionDetails || subCondition.name,
        });
      }
    } else {
      console.log('⚠️ Ending flow (continue action but no linked routes)');
      // Continue action but no linked routes - end flow
      if (selectedQuestion) {
        onComplete({
          questionId: selectedQuestion.id,
          questionTitle: selectedQuestion.title,
          selectedRoute: route,
          selectedSteps: newFlowPath,
          finalAction: 'continue',
          finalStepDescription: subCondition.actionDetails || subCondition.name,
        });
      }
    }
  };

  // Handle back navigation
  const handleBack = () => {
    if (wizardHistory.length > 1) {
      const newHistory = wizardHistory.slice(0, -1);
      const previousStep = newHistory[newHistory.length - 1];
      
      setWizardHistory(newHistory);
      setCurrentStep(previousStep);
      
      // Remove last step from flow path if going back from subcondition or child_subcondition view
      if ((currentStep.type === 'subcondition' || currentStep.type === 'child_subcondition') && flowPath.length > 0) {
        setFlowPath(flowPath.slice(0, -1));
      }
    }
  };

  // Render current step content
  const renderStepContent = () => {
    switch (currentStep.type) {
      case 'question':
        return (
          <div className="space-y-3 pt-4">
            {enabledQuestions.map((question) => {
              const hasLinkedRoutes = question.linkedRouteIds.length > 0;
              
              return (
                <button
                  key={question.id}
                  onClick={() => handleQuestionSelect(question.id, question.title)}
                  disabled={!hasLinkedRoutes}
                  className={`w-full p-4 rounded-xl transition-all duration-200 text-right border-2 glass-panel group ${
                    hasLinkedRoutes 
                      ? 'border-border hover:border-primary/50 hover:bg-accent/30 cursor-pointer'
                      : 'border-border/50 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    {hasLinkedRoutes ? (
                      <ArrowRight className="size-4 text-primary group-hover:translate-x-[-4px] transition-transform" />
                    ) : (
                      <AlertCircle className="size-4 text-muted-foreground" />
                    )}
                    <span className="font-semibold text-foreground">{question.title}</span>
                  </div>
                  {!hasLinkedRoutes && (
                    <p className="text-[10px] text-muted-foreground text-right mt-1">
                      لا توجد مسارات مربوطة
                    </p>
                  )}
                </button>
              );
            })}
            
            {enabledQuestions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">لا توجد أسئلة مفعلة حالياً</p>
              </div>
            )}
          </div>
        );

      case 'route': {
        const availableRoutes = routes.filter(r => 
          currentStep.availableRouteIds.includes(r.id) && r.isActive
        );

        return (
          <div className="space-y-3 pt-4">
            <div className="flex items-center gap-2 justify-end mb-2">
              <span className="text-xs text-muted-foreground">اختر المسار المناسب</span>
              <GitBranch className="size-4 text-primary" />
            </div>
            
            {availableRoutes.map((route) => {
              const routeSteps = steps.filter(s => s.routeId === route.id);
              const totalSubConditions = routeSteps.reduce((sum, s) => sum + s.subConditions.length, 0);
              
              return (
                <button
                  key={route.id}
                  onClick={() => handleRouteSelect(route.id)}
                  className="w-full p-4 rounded-xl transition-all duration-200 text-right border-2 glass-panel border-border hover:border-primary/50 hover:bg-accent/30 group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <ArrowRight className="size-4 text-primary group-hover:translate-x-[-4px] transition-transform" />
                    <span className="font-semibold text-foreground">{route.name}</span>
                  </div>
                  {route.description && (
                    <p className="text-xs text-muted-foreground text-right mb-2">
                      {route.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 justify-end flex-wrap">
                    {totalSubConditions > 0 && (
                      <Badge variant="outline" className="text-[10px]">
                        {totalSubConditions} خيار
                      </Badge>
                    )}
                    {route.parentSteps.length > 0 && (
                      <Badge className="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-0 text-[10px]">
                        مسار مربوط
                      </Badge>
                    )}
                  </div>
                </button>
              );
            })}
            
            {availableRoutes.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">لا توجد مسارات متاحة</p>
              </div>
            )}
          </div>
        );
      }

      case 'subcondition': {
        const { route, step } = currentStep;
        
        // ✅ FIX: Check for routes linked to ANY subcondition in this step
        const allSubConditionIds = getAllSubConditionIds(step.subConditions);
        const stepLinkedRoutes = routes.filter(r => {
          return r.parentSteps.some(parentId => allSubConditionIds.includes(parentId)) && r.isActive;
        });
        
        return (
          <div className="space-y-3 pt-4">
            <div className="flex items-center gap-2 justify-end mb-2">
              <span className="text-xs text-muted-foreground">
                اختر الحالة المناسبة للخطوة: {step.name}
              </span>
              <Target className="size-4 text-primary" />
            </div>
            
            {stepLinkedRoutes.length > 0 && (
              <div className="glass-panel rounded-lg p-3 border border-cyan-500/30 bg-cyan-500/5 mb-3">
                <div className="flex items-center gap-2 justify-end">
                  <p className="text-[11px] text-cyan-700 dark:text-cyan-300">
                    💡 هذه الخطوة مربوطة بـ {stepLinkedRoutes.length} مسار إضافي
                  </p>
                  <GitBranch className="size-3 text-cyan-600 dark:text-cyan-400" />
                </div>
              </div>
            )}
            
            {step.subConditions && step.subConditions.length > 0 ? (
              <div className="space-y-2">
                {step.subConditions.map((subCondition) => {
                  // Check if THIS specific subcondition has linked routes
                  const thisSubConditionLinkedRoutes = routes.filter(r => 
                    r.parentSteps.includes(subCondition.id) && r.isActive
                  );
                  const subConditionLinkedCount = (subCondition.linkedRouteIds || []).length;
                  const totalLinkedCount = thisSubConditionLinkedRoutes.length + subConditionLinkedCount;
                  
                  // Check for child conditions
                  const hasChildConditions = subCondition.childConditions && subCondition.childConditions.length > 0;
                  
                  return (
                    <button
                      key={subCondition.id}
                      onClick={() => handleSubConditionSelect(route, step, subCondition)}
                      className="w-full p-4 rounded-xl transition-all duration-200 text-right border-2 glass-panel border-border hover:border-primary/50 hover:bg-accent/30 group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <ArrowRight className="size-4 text-primary group-hover:translate-x-[-4px] transition-transform" />
                          {subCondition.action === 'continue' && totalLinkedCount > 0 && (
                            <GitBranch className="size-4 text-cyan-600 dark:text-cyan-400" />
                          )}
                          {hasChildConditions && (
                            <FolderTree className="size-4 text-blue-600 dark:text-blue-400" />
                          )}
                        </div>
                        <span className="font-semibold text-foreground">{subCondition.name}</span>
                      </div>
                      
                      {subCondition.actionDetails && grayAreaSettings.showActionDetails && (
                        <p className="text-[11px] text-muted-foreground text-right mb-2">
                          {subCondition.actionDetails}
                        </p>
                      )}
                      
                      {grayAreaSettings.showActionTags && (
                        <div className="flex items-center gap-2 justify-end flex-wrap">
                          {subCondition.action === 'force_solution' && (
                            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0 text-[10px]">
                              حل مباشر
                            </Badge>
                          )}
                          {subCondition.action === 'direct_answer' && (
                            <Badge className="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-0 text-[10px]">
                              إجابة مباشرة
                            </Badge>
                          )}
                          {subCondition.action === 'escalation' && (
                            <Badge className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-0 text-[10px]">
                              تصعيد
                            </Badge>
                          )}
                          {subCondition.action === 'continue' && (
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
                                  {subCondition.childConditions!.length} خطوة فرعية
                                </Badge>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">لا توجد خيارات متاحة لهذه الخطوة</p>
                <p className="text-xs mt-2">يرجى إضافة شروط فرعية من صفحة الإعدادات</p>
              </div>
            )}
          </div>
        );
      }

      case 'child_subcondition': {
        const { route, step, parentCondition } = currentStep;
        const childConditions = parentCondition.childConditions || [];
        
        // Check for routes linked to ANY child subcondition
        const allChildSubConditionIds = getAllSubConditionIds(childConditions);
        const childLinkedRoutes = routes.filter(r => {
          return r.parentSteps.some(parentId => allChildSubConditionIds.includes(parentId)) && r.isActive;
        });
        
        return (
          <div className="space-y-3 pt-4">
            <div className="flex items-center gap-2 justify-end mb-2">
              <span className="text-xs text-muted-foreground">
                اختر الحالة الفرعية من: {parentCondition.name}
              </span>
              <Target className="size-4 text-primary" />
            </div>
            
            {childLinkedRoutes.length > 0 && (
              <div className="glass-panel rounded-lg p-3 border border-cyan-500/30 bg-cyan-500/5 mb-3">
                <div className="flex items-center gap-2 justify-end">
                  <p className="text-[11px] text-cyan-700 dark:text-cyan-300">
                    💡 هذه الخطوة مربوطة بـ {childLinkedRoutes.length} مسار إضافي
                  </p>
                  <GitBranch className="size-3 text-cyan-600 dark:text-cyan-400" />
                </div>
              </div>
            )}
            
            {childConditions.length > 0 ? (
              <div className="space-y-2">
                {childConditions.map((childSubCondition) => {
                  // Check if THIS specific child subcondition has linked routes
                  const thisChildLinkedRoutes = routes.filter(r => 
                    r.parentSteps.includes(childSubCondition.id) && r.isActive
                  );
                  const childLinkedCount = (childSubCondition.linkedRouteIds || []).length;
                  const totalLinkedCount = thisChildLinkedRoutes.length + childLinkedCount;
                  
                  return (
                    <button
                      key={childSubCondition.id}
                      onClick={() => handleSubConditionSelect(route, step, childSubCondition)}
                      className="w-full p-4 rounded-xl transition-all duration-200 text-right border-2 glass-panel border-border hover:border-primary/50 hover:bg-accent/30 group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <ArrowRight className="size-4 text-primary group-hover:translate-x-[-4px] transition-transform" />
                          {childSubCondition.action === 'continue' && totalLinkedCount > 0 && (
                            <GitBranch className="size-4 text-cyan-600 dark:text-cyan-400" />
                          )}
                        </div>
                        <span className="font-semibold text-foreground">{childSubCondition.name}</span>
                      </div>
                      
                      {childSubCondition.actionDetails && grayAreaSettings.showActionDetails && (
                        <p className="text-[11px] text-muted-foreground text-right mb-2">
                          {childSubCondition.actionDetails}
                        </p>
                      )}
                      
                      {grayAreaSettings.showActionTags && (
                        <div className="flex items-center gap-2 justify-end flex-wrap">
                          {childSubCondition.action === 'force_solution' && (
                            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0 text-[10px]">
                              حل مباشر
                            </Badge>
                          )}
                          {childSubCondition.action === 'direct_answer' && (
                            <Badge className="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-0 text-[10px]">
                              إجابة مباشرة
                            </Badge>
                          )}
                          {childSubCondition.action === 'escalation' && (
                            <Badge className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-0 text-[10px]">
                              تصعيد
                            </Badge>
                          )}
                          {childSubCondition.action === 'continue' && (
                            <>
                              <Badge className="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-0 text-[10px]">
                                متابعة
                              </Badge>
                              {totalLinkedCount > 0 && (
                                <Badge variant="outline" className="text-[10px]">
                                  {totalLinkedCount} مسار متصل
                                </Badge>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">لا توجد خيارات متاحة لهذه الخطوة الفرعية</p>
              </div>
            )}
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <div className={isDarkMode ? 'dark' : ''}>
        <DialogContent className="glass-card max-w-lg shadow-2xl border-2 max-h-[80vh] flex flex-col" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right text-foreground flex items-center gap-2 justify-end text-lg">
              <span>
                {currentStep.type === 'question' && 'حدد نوع المشكلة'}
                {currentStep.type === 'route' && 'اختر المسار'}
                {currentStep.type === 'subcondition' && 'حدد الحالة'}
                {currentStep.type === 'child_subcondition' && 'حدد الحالة الفرعية'}
              </span>
              <ListFilter className="size-6 text-primary" />
            </DialogTitle>
            <DialogDescription className="text-right text-muted-foreground text-sm">
              {currentStep.type === 'question' && 'اختر النوع الأقرب لمشكلة العميل للحصول على نتائج أفضل'}
              {currentStep.type === 'route' && 'اختر المسار المناسب للمتابعة'}
              {currentStep.type === 'subcondition' && 'حدد الحالة التي تنطبق على العميل'}
              {currentStep.type === 'child_subcondition' && 'حدد الحالة الفرعية التي تنطبق على العميل'}
            </DialogDescription>
          </DialogHeader>

          {/* Breadcrumb */}
          {selectedQuestion && (
            <div className="glass-panel rounded-lg p-3 border">
              <div className="flex items-center gap-2 justify-end flex-wrap">
                <span className="text-[10px] text-muted-foreground">المسار الحالي:</span>
                <Badge className="bg-primary/10 text-primary border-0 text-[10px]">
                  {selectedQuestion.title}
                </Badge>
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

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto px-1">
            {renderStepContent()}
          </div>

          {/* Footer with Back Button */}
          {wizardHistory.length > 1 && (
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
        </DialogContent>
      </div>
    </Dialog>
  );
}