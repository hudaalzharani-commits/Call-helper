/**
 * ====================================================================
 * Add/Edit Step Dialog - حوار إضافة/تعديل الخطوات
 * ====================================================================
 * 
 * Dialog مخصص لإضافة وتعديل الخطوات (SubConditions) مع دعم:
 * 1. إضافة خطوة في مسارات متعددة دفعة واحدة
 * 2. تعديل مع خيار التطبيق على المسارات المرتبطة
 * 
 * ====================================================================
 */

import { useState, useEffect } from 'react';
import { useAdvancedSettings } from '../../contexts/AdvancedSettingsContext';
import type { Step, Route, SubCondition } from '../../contexts/AdvancedSettingsContext';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Plus, Check, X, Link2, PlayCircle, StopCircle, AlertCircle } from 'lucide-react';

interface AddStepDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (data: { name: string; action: 'continue' | 'force_solution' | 'direct_answer' | 'escalation'; actionDetails?: string; parentId?: string; selectedRoutes: string[] }) => void;
  onUpdate?: (data: { name: string; action: 'continue' | 'force_solution' | 'direct_answer' | 'escalation'; actionDetails?: string; applyToLinked: boolean }) => void;
  routes: Route[];
  steps: Step[];
  selectedStepId: string;
  editingSubCondition?: { stepId: string; subCondition: SubCondition; parentId?: string } | null;
}

export function AddStepDialog({
  open,
  onClose,
  onAdd,
  onUpdate,
  routes,
  steps,
  selectedStepId,
  editingSubCondition,
}: AddStepDialogProps) {
  const { getStepsBySubConditionName } = useAdvancedSettings();
  const [name, setName] = useState('');
  const [action, setAction] = useState<SubCondition['action']>('continue');
  const [actionDetails, setActionDetails] = useState('');
  const [parentId, setParentId] = useState('');
  const [selectedRoutes, setSelectedRoutes] = useState<string[]>([]);
  const [applyToLinked, setApplyToLinked] = useState(false);

  // Initialize form when editing
  useEffect(() => {
    if (editingSubCondition) {
      setName(editingSubCondition.subCondition.name);
      setAction(editingSubCondition.subCondition.action);
      setActionDetails(editingSubCondition.subCondition.actionDetails || '');
      setParentId(editingSubCondition.parentId || '');
    } else {
      setName('');
      setAction('continue');
      setActionDetails('');
      setParentId('');
    }
  }, [editingSubCondition]);

  const currentStep = steps.find(s => s.id === (editingSubCondition?.stepId || selectedStepId));
  
  // ✅ Check if THIS SPECIFIC SubCondition is linked (not just by name)
  // A SubCondition is linked ONLY if it exists in multiple steps with the SAME ID
  const linkedStepIds = currentStep?.linkedStepIds || [];
  
  let actualLinkedCount = 0;
  if (editingSubCondition && linkedStepIds.length > 0) {
    // Count how many linked steps actually have this subcondition with the same ID
    actualLinkedCount = linkedStepIds.filter(linkedStepId => {
      const linkedStep = steps.find(s => s.id === linkedStepId);
      // Check if the linked step has a subcondition with the SAME ID
      return linkedStep?.subConditions.some(sc => sc.id === editingSubCondition.subCondition.id);
    }).length;
  }
  
  const isLinked = actualLinkedCount > 0;
  const linkedCount = actualLinkedCount;

  // 🔍 Debug: Print step info when editing
  useEffect(() => {
    if (editingSubCondition && currentStep) {
      console.log('🔍 Edit Dialog - Step Info:', {
        stepId: currentStep.id,
        stepName: currentStep.name,
        subConditionId: editingSubCondition.subCondition.id,
        subConditionName: editingSubCondition.subCondition.name,
        linkedStepIds: currentStep.linkedStepIds,
        actualLinkedCount,
        isLinked,
      });
    }
  }, [editingSubCondition, currentStep, actualLinkedCount]);

  // Collect continue subconditions recursively
  const collectContinueSubConditions = (
    conditions: SubCondition[],
    level: number = 0
  ): Array<{ subCond: SubCondition; level: number }> => {
    let result: Array<{ subCond: SubCondition; level: number }> = [];
    
    conditions.forEach(cond => {
      if (cond.action === 'continue') {
        result.push({ subCond: cond, level });
        
        if (cond.childConditions && cond.childConditions.length > 0) {
          result = result.concat(
            collectContinueSubConditions(cond.childConditions, level + 1)
          );
        }
      }
    });
    
    return result;
  };

  const continueSubConditions = currentStep 
    ? collectContinueSubConditions(currentStep.subConditions)
    : [];

  const handleSubmit = () => {
    if (editingSubCondition && onUpdate) {
      onUpdate({
        name,
        action,
        actionDetails,
        applyToLinked,
      });
    } else {
      onAdd({
        name,
        action,
        actionDetails,
        parentId,
        selectedRoutes,
      });
    }

    // Reset
    handleReset();
  };

  const handleReset = () => {
    setName('');
    setAction('continue');
    setActionDetails('');
    setParentId('');
    setSelectedRoutes([]);
    setApplyToLinked(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleReset()}>
      <DialogContent className="glass-card border-2 max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">
            {editingSubCondition ? 'تعديل الخطوة' : 'إضافة خطوة جديدة'}
          </DialogTitle>
          <DialogDescription className="text-right">
            حدد الخطوة والإجراء المناسب
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Linked Warning - في حالة التعديل فقط */}
          {editingSubCondition && isLinked && (
            <div className="glass-card bg-cyan-50 dark:bg-cyan-950/30 border-2 border-cyan-500/50 p-4 rounded-xl">
              <div className="flex items-start gap-3">
                <Link2 className="size-5 text-cyan-600 dark:text-cyan-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-cyan-900 dark:text-cyan-100 text-sm mb-1">
                    ⚠️ خطوة مرتبطة بمسارات أخرى
                  </p>
                  <p className="text-xs text-cyan-800 dark:text-cyan-200">
                    هذه الخطوة موجودة في <strong>{linkedCount + 1}</strong> مسار. اختر نطاق التعديل أدناه.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* اسم الخطوة */}
          <div className="space-y-2">
            <Label htmlFor="sub-name">اسم الخطوة</Label>
            <Input
              id="sub-name"
              placeholder="مثال: دفع الفاتورة، تم الدفع..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="glass-card border-2 border-border text-right"
            />
          </div>

          {/* Multi-Route Selector - فقط عند الإضافة */}
          {!editingSubCondition && (
            <div className="space-y-3 glass-card bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/30 border-2 border-cyan-500/30 p-4 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Link2 className="size-5 text-cyan-600 dark:text-cyan-400" />
                <Label className="font-semibold text-foreground">إضافة في مسارات متعددة (جديد!)</Label>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                💡 اختر المسارات التي تريد إضافة هذه الخطوة فيها
              </p>

              <div className="glass-card border-2 border-border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                {routes.map((route) => {
                  const routeStep = steps.find(s => s.routeId === route.id);
                  if (!routeStep) return null;

                  const isCurrentRoute = routeStep.id === selectedStepId;
                  const isChecked = isCurrentRoute || selectedRoutes.includes(route.id);

                  return (
                    <label
                      key={route.id}
                      className={`flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer ${
                        isCurrentRoute ? 'bg-cyan-100 dark:bg-cyan-900/30' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={isCurrentRoute}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRoutes(prev => [...prev, route.id]);
                          } else {
                            setSelectedRoutes(prev => prev.filter(id => id !== route.id));
                          }
                        }}
                        className="w-4 h-4 rounded border-2 border-border"
                      />
                      <span className="text-sm text-foreground flex items-center gap-2">
                        {route.name}
                        {isCurrentRoute && (
                          <Badge className="bg-cyan-500 text-white text-xs">المسار الحالي</Badge>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>

              {selectedRoutes.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedRoutes.map((routeId) => {
                    const route = routes.find(r => r.id === routeId);
                    return route ? (
                      <Badge key={routeId} variant="outline" className="text-xs">
                        {route.name}
                        <button
                          onClick={() => setSelectedRoutes(prev => prev.filter(id => id !== routeId))}
                          className="mr-1 hover:text-red-500"
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          )}

          {/* Apply to Linked Options - فقط عند التعديل */}
          {editingSubCondition && isLinked && (
            <div className="space-y-3 glass-card bg-orange-50 dark:bg-orange-950/30 border-2 border-orange-500/30 p-4 rounded-xl">
              <Label className="font-semibold text-foreground">نطاق التعديل:</Label>
              
              <div className="space-y-2">
                <label className="flex items-start gap-2 p-2 rounded cursor-pointer hover:bg-muted/30">
                  <input
                    type="radio"
                    name="apply-mode"
                    checked={!applyToLinked}
                    onChange={() => setApplyToLinked(false)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">المسار الحالي فقط</p>
                    <p className="text-xs text-muted-foreground">
                      التعديل سيؤثر على هذا المسار فقط
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-2 p-2 rounded cursor-pointer hover:bg-muted/30">
                  <input
                    type="radio"
                    name="apply-mode"
                    checked={applyToLinked}
                    onChange={() => setApplyToLinked(true)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">جميع المسارات المرتبطة</p>
                    <p className="text-xs text-muted-foreground">
                      التعديل سيؤثر على <strong>{linkedCount + 1}</strong> مسار
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Parent Step Selector - only for single route mode */}
          {!editingSubCondition && selectedRoutes.length === 0 && continueSubConditions.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="parent-step">ربط بخطوة سابقة (اختياري)</Label>
              <Select 
                value={parentId || 'root'} 
                onValueChange={(val) => setParentId(val === 'root' ? '' : val)}
                dir="rtl"
              >
                <SelectTrigger className="glass-card border-2 border-border text-right">
                  <SelectValue placeholder="بدون ربط - خطوة رئيسية" />
                </SelectTrigger>
                <SelectContent className="glass-card" dir="rtl">
                  <SelectItem value="root" className="text-right">
                    بدون ربط - خطوة رئيسية
                  </SelectItem>
                  {continueSubConditions.map(({ subCond, level }) => {
                    const indent = '　'.repeat(level);
                    const arrow = level > 0 ? '↳ ' : '← ';
                    return (
                      <SelectItem key={subCond.id} value={subCond.id} className="text-right">
                        {indent}{arrow}{subCond.name}
                        {level > 0 && <span className="text-xs text-muted-foreground mr-1">({level})</span>}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                💡 اختر خطوة سابقة لجعل هذه الخطوة متداخلة تحتها
              </p>
            </div>
          )}

          {/* الإجراء */}
          <div className="space-y-2">
            <Label htmlFor="sub-action">الإجراء</Label>
            <Select value={action} onValueChange={(val: any) => setAction(val)} dir="rtl">
              <SelectTrigger className="glass-card border-2 border-border text-right">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass-card" dir="rtl">
                <SelectItem value="continue" className="text-right">
                  <div className="flex items-center gap-2">
                    <PlayCircle className="size-4 text-emerald-500" />
                    متابعة - الانتقال للخطوة التالية
                  </div>
                </SelectItem>
                <SelectItem value="force_solution" className="text-right">
                  <div className="flex items-center gap-2">
                    <StopCircle className="size-4 text-orange-500" />
                    إيقاف وحل - عرض الحل وإيقاف Flow
                  </div>
                </SelectItem>
                <SelectItem value="direct_answer" className="text-right">
                  <div className="flex items-center gap-2">
                    <Check className="size-4 text-cyan-500" />
                    إجابة مباشرة - استخدام توجيهات الحل مباشرة
                  </div>
                </SelectItem>
                <SelectItem value="escalation" className="text-right">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="size-4 text-red-500" />
                    تصعيد - إحالة لجهة مختصة
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* تفاصيل الإجراء */}
          {action !== 'continue' && (
            <div className="space-y-2">
              <Label htmlFor="sub-details">
                {action === 'force_solution' || action === 'direct_answer'
                  ? '💡 توجيهات الحل (اختياري)'
                  : '⚠️ ملاحظات التصعيد (اختياري)'}
              </Label>
              <Input
                id="sub-details"
                placeholder={
                  action === 'force_solution' || action === 'direct_answer'
                    ? 'مثال: التأكد من إكمال التسجيل أولاً'
                    : 'مثال: يحتاج رقم التأشيرة والمجموعة قبل التصعيد'
                }
                value={actionDetails}
                onChange={(e) => setActionDetails(e.target.value)}
                className="glass-card border-2 border-border text-right"
              />
            </div>
          )}
        </div>
        
        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleReset}>
            إلغاء
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
            disabled={!name.trim()}
          >
            {editingSubCondition ? (
              <>
                <Check className="size-4 ml-2" />
                حفظ التعديلات
              </>
            ) : (
              <>
                <Plus className="size-4 ml-2" />
                {selectedRoutes.length > 0 
                  ? `إضافة في ${selectedRoutes.length + 1} مسار` 
                  : 'إضافة'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}