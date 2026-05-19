/**
 * ====================================================================
 * Advanced Settings Page - لوحة إعدادات الوضع المتقدم
 * ====================================================================
 * 
 * هذه الصفحة تتحكم في جميع إعدادات زر "الوضع المتقدم" في صفحة Call Helper
 * 
 * الأقسام الرئيسية:
 * 1. Routing Rules - قواعد التوجيه (بدون keywords لأن الـ AI يتعامل معها)
 * 2. Steps - الخطوات (تنعكس تلقائياً من Routes + إضافة sub-conditions)
 * 3. Gray Area Settings - إعدادات عتبة الثقة
 * 4. Scoring Settings - {t('admin.advancedSettings.scoringTitle')}
 * 
 * ====================================================================
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { useAdvancedSettings } from '../../contexts/AdvancedSettingsContext';
import type { Route, Step, SubCondition } from '../../contexts/AdvancedSettingsContext';
import { CALL_HELPER_ENTITY_TYPES } from '../../constants/userTypes';
import { useUnsavedChangesWarning } from '../../utils/useUnsavedChangesWarning';
import { AddStepDialog } from './AddStepDialog';
import { AdminOperationalMonitoringSection } from './AdminOperationalMonitoringSection';
import { 
  Sliders, 
  Save, 
  RotateCcw, 
  Plus, 
  Trash2, 
  Edit2,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  GitBranch,
  Settings,
  Target,
  AlertTriangle,
  Award,
  ArrowRight,
  Power,
  PlayCircle,
  StopCircle,
  AlertCircle,
  Download,
  Upload,
  Link2,
  Copy,
  FolderTree,
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Badge } from '../ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { toast } from 'sonner';
import { useLanguage } from '../../contexts/LanguageContext';
import { routeMatchesPilgrimageScope } from '../../utils/pilgrimageRouteScope';
import { cn } from '../ui/utils';

export function AdvancedSettingsPage() {
  const { t, dir } = useLanguage();
  const {
    routes,
    steps,
    grayAreaSettings,
    scoringSettings,
    addRoute,
    updateRoute,
    deleteRoute,
    toggleRouteActive,
    addSubCondition,
    updateSubCondition,
    deleteSubCondition,
    addSubConditionToMultipleRoutes,
    updateLinkedSubCondition,
    deleteLinkedSubCondition,
    getLinkedSteps,
    updateGrayAreaSettings,
    updateScoringSettings,
    getStepsByRoute,
    exportSettings,
    importSettings,
    saveSettings,
  } = useAdvancedSettings();

  // ====================================================================
  // Local State
  // ====================================================================
  
  const [expandedRoutes, setExpandedRoutes] = useState<Set<string>>(new Set());
  const [expandedSubConditions, setExpandedSubConditions] = useState<Set<string>>(new Set());
  const [showAddRouteDialog, setShowAddRouteDialog] = useState(false);
  const [showAddSubConditionDialog, setShowAddSubConditionDialog] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [editingSubCondition, setEditingSubCondition] = useState<{
    stepId: string;
    subCondition: SubCondition;
  } | null>(null);
  const [selectedStepForSubCondition, setSelectedStepForSubCondition] = useState<string>('');

  // Form States
  const [newRouteName, setNewRouteName] = useState('');
  const [newRouteParentSteps, setNewRouteParentSteps] = useState<string[]>([]); // Parent steps for new route
  // 🎯 Route Targeting (نوع الجهة + فئة الحالة)
  const [newRouteCategories, setNewRouteCategories] = useState<string[]>([]);
  const [newRouteEntityTypes, setNewRouteEntityTypes] = useState<string[]>([]);
  const [routesViewScope, setRoutesViewScope] = useState<'umrah' | 'hajj'>('umrah');
  const [newRoutePilgrimageScope, setNewRoutePilgrimageScope] = useState<'umrah' | 'hajj'>('umrah');
  const [newRouteAppliesToBoth, setNewRouteAppliesToBoth] = useState(false);
  const [pendingCategoryInput, setPendingCategoryInput] = useState('');
  const [newSubConditionName, setNewSubConditionName] = useState('');
  const [newSubConditionAction, setNewSubConditionAction] = useState<SubCondition['action']>('continue');
  const [newSubConditionDetails, setNewSubConditionDetails] = useState('');
  const [newSubConditionParentId, setNewSubConditionParentId] = useState<string>(''); // NEW: Parent step
  
  // NEW: Linked Steps States
  const [selectedRoutesForStep, setSelectedRoutesForStep] = useState<string[]>([]);
  const [applyToLinked, setApplyToLinked] = useState(false);

  // NEW: Gray Area Question Route Linking
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);
  const [showRouteLinkDialog, setShowRouteLinkDialog] = useState(false);

  // File input ref for import
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredRoutes = useMemo(
    () => routes.filter((route) => routeMatchesPilgrimageScope(route, routesViewScope)),
    [routes, routesViewScope],
  );

  const openAddRouteDialog = () => {
    setNewRoutePilgrimageScope(routesViewScope);
    setNewRouteAppliesToBoth(false);
    setShowAddRouteDialog(true);
  };

  const resetRouteDialogForm = () => {
    setNewRouteName('');
    setNewRouteParentSteps([]);
    setNewRouteCategories([]);
    setNewRouteEntityTypes([]);
    setNewRoutePilgrimageScope(routesViewScope);
    setNewRouteAppliesToBoth(false);
    setPendingCategoryInput('');
  };

  const parseLocaleNumber = (value: string, fallback: number = 0): number => {
    const normalized = value
      .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 1632))
      .replace(/٫|,/g, '.')
      .trim();
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  // ====================================================================
  // Helper Functions
  // ====================================================================

  /**
   * Get all subconditions (including nested) with 'continue' action from a step
   */
  const getAllContinueSubConditions = (subConditions: SubCondition[]): Array<{ subCond: SubCondition; path: string[] }> => {
    const results: Array<{ subCond: SubCondition; path: string[] }> = [];
    
    const traverse = (subConds: SubCondition[], parentPath: string[] = []) => {
      subConds.forEach(sc => {
        const currentPath = [...parentPath, sc.name];
        
        if (sc.action === 'continue') {
          results.push({ subCond: sc, path: currentPath });
        }
        
        // Recursively check child conditions
        if (sc.childConditions && sc.childConditions.length > 0) {
          traverse(sc.childConditions, currentPath);
        }
      });
    };
    
    traverse(subConditions);
    return results;
  };

  /**
   * Find subcondition name and path by ID (searches nested conditions too)
   */
  const findSubConditionById = (stepsList: Step[], subCondId: string): { stepName: string; subCondName: string; path: string[] } | null => {
    for (const step of stepsList) {
      const result = findInSubConditions(step.subConditions, subCondId, step.name, []);
      if (result) return result;
    }
    return null;
  };

  const findInSubConditions = (
    subConds: SubCondition[], 
    targetId: string, 
    stepName: string, 
    parentPath: string[]
  ): { stepName: string; subCondName: string; path: string[] } | null => {
    for (const sc of subConds) {
      const currentPath = [...parentPath, sc.name];
      
      if (sc.id === targetId) {
        return { stepName, subCondName: sc.name, path: currentPath };
      }
      
      if (sc.childConditions && sc.childConditions.length > 0) {
        const found = findInSubConditions(sc.childConditions, targetId, stepName, currentPath);
        if (found) return found;
      }
    }
    return null;
  };

  const toggleRouteExpanded = (routeId: string) => {
    setExpandedRoutes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(routeId)) {
        newSet.delete(routeId);
      } else {
        newSet.add(routeId);
      }
      return newSet;
    });
  };

  const toggleSubConditionExpanded = (subCondId: string) => {
    setExpandedSubConditions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(subCondId)) {
        newSet.delete(subCondId);
      } else {
        newSet.add(subCondId);
      }
      return newSet;
    });
  };

  const handleAddRoute = () => {
    if (!newRouteName.trim()) {
      toast.error(t('admin.advancedSettings.enterRouteName'));
      return;
    }

    const normalizedCategories = newRouteCategories.map(c => c.trim()).filter(Boolean);
    const normalizedEntityTypes = newRouteEntityTypes.map(c => c.trim()).filter(Boolean);

    addRoute(
      newRouteName.trim(),
      newRouteParentSteps,
      {
        categories: normalizedCategories,
        entityTypes: normalizedEntityTypes,
        pilgrimageScope: newRouteAppliesToBoth ? 'both' : newRoutePilgrimageScope,
      },
    );
    resetRouteDialogForm();
    setShowAddRouteDialog(false);
    toast.success(t('admin.advancedSettings.routeAdded'));
  };

  const handleDeleteRoute = (routeId: string, routeName: string) => {
    if (confirm(t('admin.advancedSettings.deleteRouteConfirm', { name: routeName }))) {
      deleteRoute(routeId);
      toast.success(t('admin.advancedSettings.routeDeleted'));
    }
  };

  const handleEditRoute = (route: Route) => {
    setEditingRoute(route);
    setNewRouteName(route.name);
    setNewRouteParentSteps(route.parentSteps);
    setNewRouteCategories(Array.isArray(route.categories) ? [...route.categories] : []);
    setNewRouteEntityTypes(Array.isArray(route.entityTypes) ? [...route.entityTypes] : []);
    setNewRoutePilgrimageScope(route.pilgrimageScope === 'hajj' ? 'hajj' : 'umrah');
    setNewRouteAppliesToBoth(route.pilgrimageScope === 'both');
    setPendingCategoryInput('');
  };

  const handleUpdateRoute = () => {
    if (!editingRoute) return;
    
    if (!newRouteName.trim()) {
      toast.error(t('admin.advancedSettings.enterRouteName'));
      return;
    }

    const normalizedCategories = newRouteCategories.map(c => c.trim()).filter(Boolean);
    const normalizedEntityTypes = newRouteEntityTypes.map(c => c.trim()).filter(Boolean);

    updateRoute(editingRoute.id, {
      name: newRouteName.trim(),
      parentSteps: newRouteParentSteps,
      categories: normalizedCategories,
      entityTypes: normalizedEntityTypes,
      pilgrimageScope: newRouteAppliesToBoth ? 'both' : newRoutePilgrimageScope,
    });

    setEditingRoute(null);
    resetRouteDialogForm();
    toast.success(t('admin.advancedSettings.routeUpdated'));
  };

  // 🎯 إضافة/إزالة فئة من قائمة targeting (تجنب التكرار وtrim)
  const addCategoryToNewRoute = () => {
    const value = pendingCategoryInput.trim();
    if (!value) return;
    if (newRouteCategories.some(c => c.trim() === value)) {
      setPendingCategoryInput('');
      return;
    }
    setNewRouteCategories(prev => [...prev, value]);
    setPendingCategoryInput('');
  };

  const removeCategoryFromNewRoute = (category: string) => {
    setNewRouteCategories(prev => prev.filter(c => c !== category));
  };

  const toggleEntityTypeForNewRoute = (entityType: string) => {
    setNewRouteEntityTypes(prev =>
      prev.includes(entityType)
        ? prev.filter(e => e !== entityType)
        : [...prev, entityType],
    );
  };

  const handleAddSubCondition = () => {
    if (!newSubConditionName.trim()) {
      toast.error(t('admin.advancedSettings.enterStepName'));
      return;
    }

    if (newSubConditionAction !== 'continue' && !newSubConditionDetails.trim()) {
      toast.error(t('admin.advancedSettings.enterActionDetails'));
      return;
    }

    console.log('➕ Adding SubCondition:', {
      stepId: selectedStepForSubCondition,
      name: newSubConditionName.trim(),
      action: newSubConditionAction,
      parentId: newSubConditionParentId || 'root',
      selectedRoutes: selectedRoutesForStep,
    });

    // Check if multiple routes are selected
    if (selectedRoutesForStep.length > 1) {
      // Multi-route mode: Use addSubConditionToMultipleRoutes
      const stepIds = selectedRoutesForStep.map(routeId => {
        const step = steps.find(s => s.routeId === routeId);
        return step?.id || '';
      }).filter(Boolean);

      if (stepIds.length === 0) {
        toast.error(t('admin.advancedSettings.stepsNotFound'));
        return;
      }

      addSubConditionToMultipleRoutes(
        stepIds,
        {
          name: newSubConditionName.trim(),
          action: newSubConditionAction,
          actionDetails: newSubConditionDetails.trim() || undefined,
        },
        false,
        ''
      );

      toast.success(t('admin.advancedSettings.stepAddedMulti', { count: stepIds.length }));
    } else {
      // Single route mode: Use normal addSubCondition
      addSubCondition(
        selectedStepForSubCondition, 
        {
          name: newSubConditionName.trim(),
          action: newSubConditionAction,
          actionDetails: newSubConditionDetails.trim() || undefined,
        },
        newSubConditionParentId || undefined
      );

      toast.success(t('admin.advancedSettings.stepAdded'));
    }

    // Reset form
    setNewSubConditionName('');
    setNewSubConditionAction('continue');
    setNewSubConditionDetails('');
    setNewSubConditionParentId('');
    setSelectedRoutesForStep([]);
    setApplyToLinked(false);
    setShowAddSubConditionDialog(false);
  };

  const handleUpdateSubCondition = () => {
    if (!editingSubCondition) return;

    if (!newSubConditionName.trim()) {
      toast.error(t('admin.advancedSettings.enterConditionName'));
      return;
    }

    // Check if step is linked
    const currentStep = steps.find(s => s.id === editingSubCondition.stepId);
    const isLinked = currentStep?.linkedStepIds && currentStep.linkedStepIds.length > 0;

    if (isLinked && applyToLinked) {
      // Use linked update
      updateLinkedSubCondition(
        editingSubCondition.stepId,
        editingSubCondition.subCondition.id,
        {
          name: newSubConditionName.trim(),
          action: newSubConditionAction,
          actionDetails: newSubConditionDetails.trim() || undefined,
        },
        true // Apply to all linked
      );

      const linkedCount = currentStep?.linkedStepIds?.length || 0;
      toast.success(t('admin.advancedSettings.stepUpdatedMulti', { count: linkedCount + 1 }));
    } else {
      // Normal update (current only)
      updateSubCondition(
        editingSubCondition.stepId,
        editingSubCondition.subCondition.id,
        {
          name: newSubConditionName.trim(),
          action: newSubConditionAction,
          actionDetails: newSubConditionDetails.trim() || undefined,
        }
      );

      toast.success(t('admin.advancedSettings.conditionUpdated'));
    }

    // Reset
    setEditingSubCondition(null);
    setNewSubConditionName('');
    setNewSubConditionAction('continue');
    setNewSubConditionDetails('');
    setApplyToLinked(false);
  };

  const handleDeleteSubCondition = (stepId: string, subConditionId: string, name: string) => {
    // Check if step is linked
    const currentStep = steps.find(s => s.id === stepId);
    const linkedCount = currentStep?.linkedStepIds?.length || 0;
    
    if (linkedCount > 0) {
      // Show custom confirmation with options
      const message = `الخطوة "${name}" موجودة في ${linkedCount + 1} مسار.\n\nاختر الإجراء:\n- إلغاء: لا تحذف\n- OK: حذف من المسار الحالي فقط\n\n(لحذف من جميع المسارات، استخدم زر الحذف في Dialog التعديل)`;
      
      if (confirm(message)) {
        deleteLinkedSubCondition(stepId, subConditionId, false);
        toast.success(t('admin.advancedSettings.stepDeletedCurrent'));
      }
    } else {
      // Normal delete
      if (confirm(t('admin.advancedSettings.deleteConditionConfirm', { name }))) {
        deleteSubCondition(stepId, subConditionId);
        toast.success(t('admin.advancedSettings.conditionDeleted'));
      }
    }
  };

  const openEditSubCondition = (stepId: string, subCondition: SubCondition) => {
    setEditingSubCondition({ stepId, subCondition });
    setNewSubConditionName(subCondition.name);
    setNewSubConditionAction(subCondition.action);
    setNewSubConditionDetails(subCondition.actionDetails || '');
  };

  const handleSaveAllSettings = async () => {
    const saved = await saveSettings();
    if (saved) {
      toast.success(t('admin.advancedSettings.allSaved'));
      return;
    }
    toast.error(t('admin.toast.saveFailed'));
  };

  /** 
   * Export settings as JSON file
   */
  const handleExportSettings = () => {
    try {
      const settingsData = exportSettings();
      
      // Create blob
      const blob = new Blob([JSON.stringify(settingsData, null, 2)], {
        type: 'application/json',
      });
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      link.download = `advanced-settings-${timestamp}.json`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(t('admin.advancedSettings.exportSuccess'));
    } catch (error) {
      console.error('Export error:', error);
      toast.error(t('admin.advancedSettings.exportFailed'));
    }
  };

  /** 
   * Import settings from JSON file
   */
  const handleImportSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const settingsData = JSON.parse(content);
        
        // Validate and import
        const success = importSettings(settingsData);
        
        if (success) {
          toast.success(t('admin.advancedSettings.importSuccess'));
        } else {
          toast.error(t('admin.advancedSettings.importInvalid'));
        }
      } catch (error) {
        console.error('Import error:', error);
        toast.error(t('admin.advancedSettings.importReadFailed'));
      }
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };

    reader.readAsText(file);
  };

  // ====================================================================
  // Action Badge Component
  // ====================================================================
  
  const ActionBadge = ({ action }: { action: SubCondition['action'] }) => {
    const config = {
      continue: {
        label: t('admin.advancedSettings.actionContinue'),
        color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
        icon: PlayCircle,
      },
      force_solution: {
        label: t('admin.advancedSettings.actionForceSolution'),
        color: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400',
        icon: StopCircle,
      },
      direct_answer: {
        label: t('admin.advancedSettings.actionDirectAnswer'),
        color: 'bg-primary-soft text-primary',
        icon: Check,
      },
      escalation: {
        label: t('admin.advancedSettings.actionEscalation'),
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
  // Recursive SubCondition Renderer
  // ====================================================================

  const renderSubCondition = (
    stepId: string,
    subCond: SubCondition,
    level: number = 0
  ): React.ReactNode => {
    const marginRight = level * 24; // 24px لكل مستوى
    
    // 🔗 Check if THIS SPECIFIC SubCondition is linked (not just the step)
    // A SubCondition is linked if it exists in multiple steps with the same ID
    const currentStep = steps.find(s => s.id === stepId);
    
    // Count how many other steps have a SubCondition with the same ID
    let linkedStepsCount = 0;
    if (currentStep?.linkedStepIds && currentStep.linkedStepIds.length > 0) {
      linkedStepsCount = currentStep.linkedStepIds.filter(linkedStepId => {
        const linkedStep = steps.find(s => s.id === linkedStepId);
        // Check if the linked step has a subcondition with the same ID
        return linkedStep?.subConditions.some(sc => sc.id === subCond.id);
      }).length;
    }
    
    const isLinkedSubCondition = linkedStepsCount > 0;
    
    // Check for linked routes to this specific SubCondition
    const linkedRoutes = routes.filter(r => 
      r.parentSteps.includes(subCond.id) && r.isActive
    );
    const additionalLinkedRouteIds = subCond.linkedRouteIds || [];
    const totalLinkedRoutesCount = linkedRoutes.length + additionalLinkedRouteIds.length;
    
    // Check for child conditions
    const hasChildConditions = subCond.childConditions && subCond.childConditions.length > 0;
    const isExpanded = expandedSubConditions.has(subCond.id);

    return (
      <div key={`${stepId}-${subCond.id}`} className="space-y-2">
        <div
          className="glass-card p-3 rounded-lg border border-border flex items-start justify-between gap-3"
          style={{ marginRight: `${marginRight}px` }}
        >
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {/* Expand/Collapse button for child conditions */}
              {hasChildConditions && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleSubConditionExpanded(subCond.id)}
                  className="p-1 h-auto"
                >
                  {isExpanded ? (
                    <ChevronUp className="size-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="size-4 text-muted-foreground" />
                  )}
                </Button>
              )}
              <ArrowRight className="size-4 text-primary flex-shrink-0" />
              {/* Icons for linked routes or child conditions */}
              {subCond.action === 'continue' && totalLinkedRoutesCount > 0 && (
                <GitBranch className="size-4 text-primary" />
              )}
              {hasChildConditions && (
                <FolderTree className="size-4 text-blue-600 dark:text-blue-400" />
              )}
              <span className="font-medium text-foreground text-sm">
                {subCond.name}
              </span>
              <ActionBadge action={subCond.action} />
              {level > 0 && (
                <Badge variant="outline" className="text-xs">
                  {t('admin.advancedSettings.nestedLevel', { level })}
                </Badge>
              )}
              {/* 🔗 Linked SubCondition Badge - يظهر فقط للخطوات المضافة في مسارات متعددة */}
              {isLinkedSubCondition && level === 0 && (
                <Badge 
                  className="bg-primary-soft text-primary border-0 flex items-center gap-1 text-xs"
                  title={t('admin.advancedSettings.linkedWith', { count: linkedStepsCount, label: linkedStepsCount === 1 ? t('admin.advancedSettings.linkedRouteOther') : t('admin.advancedSettings.linkedRoutesOther') })}
                >
                  <Link2 className="size-3" />
                  {t('admin.advancedSettings.linkedBadge', { count: linkedStepsCount + 1 })}
                </Badge>
              )}
              {/* Badge for linked routes */}
              {subCond.action === 'continue' && totalLinkedRoutesCount > 0 && (
                <Badge variant="outline" className="text-xs">
                  {t('admin.advancedSettings.connectedRoutes', { count: totalLinkedRoutesCount })}
                </Badge>
              )}
              {/* Badge for child conditions */}
              {hasChildConditions && (
                <Badge variant="outline" className="text-xs">
                  {t('admin.advancedSettings.childSteps', { count: subCond.childConditions!.length })}
                </Badge>
              )}
            </div>
            {subCond.actionDetails && (
              <p className="text-xs text-muted-foreground mr-6">
                📋 {subCond.actionDetails}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openEditSubCondition(stepId, subCond)}
            >
              <Edit2 className="size-3 text-primary" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                handleDeleteSubCondition(stepId, subCond.id, subCond.name)
              }
            >
              <Trash2 className="size-3 text-red-500" />
            </Button>
          </div>
        </div>

        {/* Render child conditions recursively */}
        {subCond.childConditions && subCond.childConditions.length > 0 && isExpanded && (
          <div className="space-y-2">
            {subCond.childConditions.map((childCond) =>
              renderSubCondition(stepId, childCond, level + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  // ====================================================================
  // Render
  // ====================================================================

  return (
    <div className="space-y-6" dir={dir}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">{t('admin.advancedSettings.title')}</h2>
          <p className="text-muted-foreground">
            {t('admin.advancedSettings.subtitle')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="border-2"
            onClick={() => toast.info(t('admin.advancedSettings.resetInfo'))}
          >
            <RotateCcw className="size-4 ml-2" />
            {t('admin.advancedSettings.reset')}
          </Button>
          <Button 
            className="bg-primary text-primary-foreground hover:bg-primary-hover text-primary-foreground"
            onClick={handleSaveAllSettings}
          >
            <Save className="size-4 ml-2" />
            {t('admin.advancedSettings.saveChanges')}
          </Button>
        </div>
      </div>

      {/* مراقبة المشاكل (من المؤشرات اللحظية) — للأدمن */}
      <AdminOperationalMonitoringSection />

      {/* ====================================================================
          SECTION 1: Routing Rules
          ====================================================================
          
          قواعد التوجيه - المسارات الرئيسية بدون keywords
          (الـ AI يتعامل مع الـ keywords تلقائياً)
      */}
      <Card
        className={cn(
          'p-6 transition-[border-color,box-shadow,background] duration-300',
          routesViewScope === 'hajj'
            ? 'glass-panel border-2 border-amber-600/50 bg-gradient-to-br from-amber-950/35 via-card to-amber-950/[0.12] shadow-[0_0_0_1px_rgba(245,158,11,0.12),0_18px_48px_-24px_rgba(180,83,9,0.45)] dark:from-amber-950/40 dark:shadow-[0_0_0_1px_rgba(245,158,11,0.2)]'
            : 'glass-panel border-2 border-border bg-card/80 shadow-sm',
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <GitBranch className="size-6 text-primary shrink-0" />
            <div>
              <h3 className="text-lg font-bold text-foreground">{t('admin.advancedSettings.routesTitle')}</h3>
              <p className="text-xs text-muted-foreground">
                {t('admin.advancedSettings.routesDesc')}
              </p>
            </div>
          </div>
          <div
            className="flex flex-wrap items-center gap-2 shrink-0"
            role="radiogroup"
            aria-label={t('admin.advancedSettings.routesScopeSwitchAria')}
          >
            <div className="inline-flex rounded-xl border-2 border-border bg-muted/40 p-0.5 shadow-inner">
              <button
                type="button"
                role="radio"
                aria-checked={routesViewScope === 'umrah'}
                onClick={() => setRoutesViewScope('umrah')}
                className={cn(
                  'min-w-[4.5rem] rounded-lg px-3 py-1.5 text-sm font-bold transition-all',
                  routesViewScope === 'umrah'
                    ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-500/40 dark:bg-emerald-600'
                    : 'text-muted-foreground hover:bg-background/80 hover:text-foreground',
                )}
              >
                {t('admin.advancedSettings.pilgrimageScopeUmrah')}
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={routesViewScope === 'hajj'}
                onClick={() => setRoutesViewScope('hajj')}
                className={cn(
                  'min-w-[4.5rem] rounded-lg px-3 py-1.5 text-sm font-bold transition-all',
                  routesViewScope === 'hajj'
                    ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-500/40 dark:bg-amber-600'
                    : 'text-muted-foreground hover:bg-background/80 hover:text-foreground',
                )}
              >
                {t('admin.advancedSettings.pilgrimageScopeHajj')}
              </button>
            </div>
            <Button onClick={openAddRouteDialog} size="sm">
              <Plus className="size-4 ml-2 shrink-0" />
              {t('admin.advancedSettings.addRoute')}
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {filteredRoutes.length === 0 ? (
            <div
              className={cn(
                'text-center py-12 rounded-xl border',
                routesViewScope === 'hajj'
                  ? 'border-amber-500/35 bg-amber-950/15 dark:bg-amber-950/25'
                  : 'glass-card border-border',
              )}
            >
              <GitBranch
                className={cn(
                  'size-12 mx-auto mb-3',
                  routesViewScope === 'hajj' ? 'text-amber-400/80' : 'text-muted-foreground',
                )}
              />
              <p
                className={cn(
                  'text-muted-foreground',
                  routesViewScope === 'hajj' && 'text-amber-100/90',
                )}
              >
                {routes.length === 0
                  ? t('admin.advancedSettings.noRoutes')
                  : t('admin.advancedSettings.noRoutesForScope', {
                      scope:
                        routesViewScope === 'hajj'
                          ? t('admin.advancedSettings.pilgrimageScopeHajj')
                          : t('admin.advancedSettings.pilgrimageScopeUmrah'),
                    })}
              </p>
              <p
                className={cn(
                  'text-xs text-muted-foreground mt-1',
                  routesViewScope === 'hajj' && 'text-amber-200/70',
                )}
              >
                {routes.length === 0
                  ? t('admin.advancedSettings.noRoutesHint')
                  : t('admin.advancedSettings.noRoutesForScopeHint')}
              </p>
            </div>
          ) : (
            filteredRoutes.map((route) => {
              const step = getStepsByRoute(route.id);
              const isExpanded = expandedRoutes.has(route.id);

              return (
                <div
                  key={route.id}
                  className={cn(
                    'rounded-xl overflow-hidden border-2',
                    routesViewScope === 'hajj'
                      ? 'border-amber-600/35 bg-gradient-to-r from-amber-950/25 via-card to-card shadow-[inset_5px_0_0_0_rgba(217,119,6,0.75)]'
                      : 'glass-card border-border',
                  )}
                >
                  {/* Route Header */}
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleRouteExpanded(route.id)}
                        className="p-1 h-auto"
                      >
                        {isExpanded ? (
                          <ChevronUp className="size-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="size-4 text-muted-foreground" />
                        )}
                      </Button>

                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          #{route.order}
                        </Badge>
                        <span className="font-semibold text-foreground">{route.name}</span>
                      </div>

                      {route.isActive ? (
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border-0">
                          <Power className="size-3 ml-1" />
                          {t('admin.advancedSettings.active')}
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-0">
                          <Power className="size-3 ml-1" />
                          {t('admin.advancedSettings.disabled')}
                        </Badge>
                      )}

                      {/* Badge for linked parent route */}
                      {route.parentSteps.length > 0 && (
                        <Badge className="bg-primary-soft text-primary border-0 flex items-center gap-1">
                          <GitBranch className="size-3" />
                          {t('admin.advancedSettings.linkedRoute')}
                        </Badge>
                      )}

                      {/* 🎯 Targeting badges (categories + entityTypes) */}
                      {Array.isArray(route.categories) && route.categories.length > 0 && (
                        <Badge
                          className="bg-primary-soft text-primary border-0 flex items-center gap-1"
                          title={`فئات مرتبطة: ${route.categories.join('، ')}`}
                        >
                          <Target className="size-3" />
                          {route.categories.length === 1
                            ? route.categories[0]
                            : `${route.categories.length} فئات`}
                        </Badge>
                      )}
                      {Array.isArray(route.entityTypes) && route.entityTypes.length > 0 && (
                        <Badge
                          variant="outline"
                          className="text-xs flex items-center gap-1"
                          title={`جهات مرتبطة: ${route.entityTypes.join('، ')}`}
                        >
                          👤 {route.entityTypes.length === 1
                            ? route.entityTypes[0]
                            : `${route.entityTypes.length} جهات`}
                        </Badge>
                      )}
                      {route.pilgrimageScope === 'umrah' && (
                        <Badge
                          variant="outline"
                          className="text-xs border-emerald-500/40 text-emerald-700 dark:text-emerald-400"
                          title={t('admin.advancedSettings.badgePilgrimageUmrahTitle')}
                        >
                          {t('admin.advancedSettings.badgePilgrimageUmrah')}
                        </Badge>
                      )}
                      {route.pilgrimageScope === 'hajj' && (
                        <Badge
                          variant="outline"
                          className="text-xs border-amber-500/40 text-amber-800 dark:text-amber-400"
                          title={t('admin.advancedSettings.badgePilgrimageHajjTitle')}
                        >
                          {t('admin.advancedSettings.badgePilgrimageHajj')}
                        </Badge>
                      )}
                      {route.pilgrimageScope === 'both' && (
                        <Badge
                          variant="outline"
                          className="text-xs border-violet-500/40 text-violet-800 dark:text-violet-300"
                          title={t('admin.advancedSettings.badgePilgrimageBothTitle')}
                        >
                          {t('admin.advancedSettings.pilgrimageScopeAll')}
                        </Badge>
                      )}

                      <Badge variant="outline" className="text-xs">
                        {step?.subConditions.length || 0} {step?.subConditions.length === 1 ? t('admin.advancedSettings.stepOne') : t('admin.advancedSettings.stepsMany')}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={route.isActive}
                        onCheckedChange={() => toggleRouteActive(route.id)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditRoute(route)}
                        title={t('admin.advancedSettings.editRouteTitle')}
                      >
                        <Edit2 className="size-4 text-primary" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteRoute(route.id, route.name)}
                        title={t('admin.advancedSettings.deleteRouteTitle')}
                      >
                        <Trash2 className="size-4 text-red-500" />
                      </Button>
                    </div>
                  </div>

                  {/* Route Details (Expanded) */}
                  {isExpanded && step && (
                    <div
                      className={cn(
                        'border-t border-border p-4',
                        routesViewScope === 'hajj' ? 'bg-amber-950/20' : 'bg-muted/30',
                      )}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-semibold text-foreground">
                          {t('admin.advancedSettings.stepsAndActions')}
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedStepForSubCondition(step.id);
                            setShowAddSubConditionDialog(true);
                          }}
                        >
                          <Plus className="size-3 ml-1" />
                          {t('admin.advancedSettings.addStep')}
                        </Button>
                      </div>

                      {step.subConditions.length === 0 ? (
                        <div className="text-center py-6 glass-card rounded-lg border border-border">
                          <p className="text-xs text-muted-foreground">
                            {t('admin.advancedSettings.noSteps')}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {step.subConditions.map((subCond) => (
                            renderSubCondition(step.id, subCond)
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* ====================================================================
          SECTION 2: Gray Area Settings
          ====================================================================
      */}
      <Card className="glass-panel border-2 border-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="size-5 text-orange-500" />
          <div>
            <h3 className="text-base font-bold text-foreground">{t('admin.advancedSettings.grayAreaTitle')}</h3>
            <p className="text-xs text-muted-foreground">
              {t('admin.advancedSettings.grayAreaDesc')}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* {t('admin.advancedSettings.grayQuestions')} - 5 أسئلة ثابتة */}
          <div className="space-y-2">
            <Label className="text-sm text-foreground">{t('admin.advancedSettings.grayQuestions')}</Label>
            
            <div className="space-y-3">
              {grayAreaSettings.questions.map((question, index) => (
                <div
                  key={question.id}
                  className="glass-card border-2 border-border rounded-xl p-4 hover:border-primary/30 transition-all"
                >
                  <div className="flex items-start gap-4">
                    {/* رقم السؤال */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">{index + 1}</span>
                    </div>

                    {/* عنوان السؤال */}
                    <div className="flex-1 min-w-0">
                      <Input
                        type="text"
                        value={question.title}
                        onChange={(e) => {
                          const updatedQuestions = grayAreaSettings.questions.map(q =>
                            q.id === question.id ? { ...q, title: e.target.value } : q
                          );
                          updateGrayAreaSettings({ questions: updatedQuestions });
                        }}
                        className="glass-card border-2 border-border text-sm font-medium h-9"
                      />
                      
                      {/* المسارات المربوطة */}
                      {question.linkedRouteIds.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {question.linkedRouteIds.map(routeId => {
                            const route = routes.find(r => r.id === routeId);
                            return route ? (
                              <Badge key={routeId} variant="outline" className="text-[10px]">
                                {route.name}
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      )}
                    </div>

                    {/* الأزرار والتحكم */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {/* زر ربط المسارات */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedQuestion(question);
                          setShowRouteLinkDialog(true);
                        }}
                        className="h-9 text-xs"
                      >
                        <Link2 className="size-3 ml-1" />
                        {t('admin.advancedSettings.linkRoutes', { count: question.linkedRouteIds.length })}
                      </Button>

                      {/* Switch التفعيل */}
                      <div className="flex flex-col items-center gap-1">
                        <Switch
                          checked={question.isEnabled}
                          onCheckedChange={(checked) => {
                            const updatedQuestions = grayAreaSettings.questions.map(q =>
                              q.id === question.id ? { ...q, isEnabled: checked } : q
                            );
                            updateGrayAreaSettings({ questions: updatedQuestions });
                          }}
                        />
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {question.isEnabled ? t('admin.advancedSettings.enabled') : t('admin.advancedSettings.disabledSwitch')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <p className="text-[11px] text-muted-foreground">
              {t('admin.advancedSettings.grayQuestionsHint')}
            </p>
          </div>

          {/* Force Routing When Conflict Occurs */}
          <div className="flex items-center justify-between p-3 glass-card rounded-lg border border-border">
            <div>
              <p className="text-sm font-medium text-foreground">{t('admin.advancedSettings.forceRouting')}</p>
              <p className="text-[11px] text-muted-foreground">
                {t('admin.advancedSettings.forceRoutingDesc')}
              </p>
            </div>
            <Switch
              checked={grayAreaSettings.forceRoutingOnConflict}
              onCheckedChange={(checked) =>
                updateGrayAreaSettings({ forceRoutingOnConflict: checked })
              }
            />
          </div>

          {/* Show Hint Before Decision */}
          <div className="flex items-center justify-between p-3 glass-card rounded-lg border border-border">
            <div>
              <p className="text-sm font-medium text-foreground">{t('admin.advancedSettings.showHint')}</p>
              <p className="text-[11px] text-muted-foreground">
                {t('admin.advancedSettings.showHintDesc')}
              </p>
            </div>
            <Switch
              checked={grayAreaSettings.showHintBeforeDecision}
              onCheckedChange={(checked) =>
                updateGrayAreaSettings({ showHintBeforeDecision: checked })
              }
            />
          </div>

          {/* Show Action Tags */}
          <div className="flex items-center justify-between p-3 glass-card rounded-lg border border-border">
            <div>
              <p className="text-sm font-medium text-foreground">{t('admin.advancedSettings.showActionTag')}</p>
              <p className="text-[11px] text-muted-foreground">
                {t('admin.advancedSettings.showActionTagDesc')}
              </p>
            </div>
            <Switch
              checked={grayAreaSettings.showActionTags}
              onCheckedChange={(checked) =>
                updateGrayAreaSettings({ showActionTags: checked })
              }
            />
          </div>

          {/* Show Action Details */}
          <div className="flex items-center justify-between p-3 glass-card rounded-lg border border-border">
            <div>
              <p className="text-sm font-medium text-foreground">{t('admin.advancedSettings.showActionNotes')}</p>
              <p className="text-[11px] text-muted-foreground">
                {t('admin.advancedSettings.showActionNotesDesc')}
              </p>
            </div>
            <Switch
              checked={grayAreaSettings.showActionDetails}
              onCheckedChange={(checked) =>
                updateGrayAreaSettings({ showActionDetails: checked })
              }
            />
          </div>
        </div>
      </Card>

      {/* ====================================================================
          SECTION 3: Scoring Settings
          ====================================================================
      */}
      <Card className="glass-panel border-2 border-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <Award className="size-5 text-primary" />
          <div>
            <h3 className="text-base font-bold text-foreground">{t('admin.advancedSettings.scoringTitle')}</h3>
            <p className="text-xs text-muted-foreground">
              {t('admin.advancedSettings.scoringDesc')}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Score Thresholds */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-semibold text-foreground">{t('admin.advancedSettings.thresholdsTitle')}</Label>
              <Badge variant="outline" className="text-[10px]">
                {t('admin.advancedSettings.thresholdsDesc')}
              </Badge>
            </div>
            
            <div className="space-y-3">
              {/* Direct Answer Threshold */}
              <div className="glass-card p-4 rounded-xl border-2 border-emerald-500/30 bg-emerald-500/5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      <Label className="text-sm font-semibold text-foreground">{t('admin.advancedSettings.autoDirect')}</Label>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {t('admin.advancedSettings.autoDirectDesc')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-muted-foreground">≥</span>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={scoringSettings.scoreThresholds.directAnswer}
                      onChange={(e) =>
                        updateScoringSettings({
                          scoreThresholds: {
                            ...scoringSettings.scoreThresholds,
                            directAnswer: Math.max(0, Math.min(100, Math.round(parseLocaleNumber(e.target.value, 0)))),
                          },
                        })
                      }
                      className="glass-card border-2 border-border w-16 h-9 text-center font-bold"
                    />
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 min-w-[35px]">
                      {scoringSettings.scoreThresholds.directAnswer}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Show Advanced Threshold */}
              <div className="glass-card p-4 rounded-xl border border-primary/25 bg-primary-soft">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full bg-primary"></div>
                      <Label className="text-sm font-semibold text-foreground">{t('admin.advancedSettings.optionalAdvanced')}</Label>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {t('admin.advancedSettings.optionalAdvancedDesc')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-muted-foreground">≥</span>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={scoringSettings.scoreThresholds.showAdvanced}
                      onChange={(e) =>
                        updateScoringSettings({
                          scoreThresholds: {
                            ...scoringSettings.scoreThresholds,
                            showAdvanced: Math.max(0, Math.min(100, Math.round(parseLocaleNumber(e.target.value, 0)))),
                          },
                        })
                      }
                      className="glass-card border-2 border-border w-16 h-9 text-center font-bold"
                    />
                    <span className="text-sm font-bold text-primary min-w-[35px]">
                      {scoringSettings.scoreThresholds.showAdvanced}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Gray Area Threshold */}
              <div className="glass-card p-4 rounded-xl border-2 border-orange-500/30 bg-orange-500/5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                      <Label className="text-sm font-semibold text-foreground">{t('admin.advancedSettings.grayAreaThreshold')}</Label>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {t('admin.advancedSettings.grayAreaThresholdDesc')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-muted-foreground">&lt;</span>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={scoringSettings.scoreThresholds.grayArea}
                      onChange={(e) =>
                        updateScoringSettings({
                          scoreThresholds: {
                            ...scoringSettings.scoreThresholds,
                            grayArea: Math.max(0, Math.min(100, Math.round(parseLocaleNumber(e.target.value, 0)))),
                          },
                        })
                      }
                      className="glass-card border-2 border-border w-16 h-9 text-center font-bold"
                    />
                    <span className="text-sm font-bold text-orange-600 dark:text-orange-400 min-w-[35px]">
                      {scoringSettings.scoreThresholds.grayArea}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Guide */}
            <div className="glass-panel p-3 rounded-lg border border-border">
              <div className="text-[10px] text-muted-foreground space-y-1">
                <p className="font-semibold mb-2">📊 ملخص النطاقات:</p>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 dark:text-emerald-400">●</span>
                  <span>≥ {scoringSettings.scoreThresholds.directAnswer}% = رد تلقائي مباشر</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-primary">●</span>
                  <span>{scoringSettings.scoreThresholds.showAdvanced}% - {scoringSettings.scoreThresholds.directAnswer - 1}% = {t('admin.advancedSettings.optionalAdvanced')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-orange-600 dark:text-orange-400">●</span>
                  <span>&lt; {scoringSettings.scoreThresholds.grayArea}% = اختيار نوع المشكلة (إجباري)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Weights */}
          <div className="space-y-2 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-foreground">{t('admin.advancedSettings.weightsTitle')}</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const newName = prompt('أدخل اسم الوزن الجديد:');
                  if (newName && newName.trim()) {
                    updateScoringSettings({
                      weights: [...scoringSettings.weights, { name: newName.trim(), value: 0 }],
                    });
                    toast.success('تم إضافة الوزن بنجاح');
                  }
                }}
                className="text-xs h-8"
              >
                <Plus className="size-3 ml-1" />
                {t('admin.advancedSettings.addWeight')}
              </Button>
            </div>
            
            <div className="glass-card border border-border rounded-lg p-3 space-y-1.5 max-h-64 overflow-y-auto">
              {scoringSettings.weights.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">
                  {t('admin.advancedSettings.noWeights')}
                </p>
              ) : (
                scoringSettings.weights.map((weight, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 glass-panel rounded-md hover:bg-accent/30 group"
                  >
                    <Label className="text-sm text-foreground flex-1">{weight.name}</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={weight.value}
                      onChange={(e) => {
                        const newWeights = [...scoringSettings.weights];
                        newWeights[index] = {
                          ...weight,
                          value: Math.max(0, Math.min(100, parseLocaleNumber(e.target.value, 0))),
                        };
                        updateScoringSettings({ weights: newWeights });
                      }}
                      className="glass-card border-2 border-border w-20 h-8"
                    />
                    <span className="text-sm font-bold text-primary min-w-[50px]">
                      {weight.value.toFixed(2)}%
                    </span>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newName = prompt('تعديل اسم الوزن:', weight.name);
                          if (newName && newName.trim()) {
                            const newWeights = [...scoringSettings.weights];
                            newWeights[index] = { ...weight, name: newName.trim() };
                            updateScoringSettings({ weights: newWeights });
                            toast.success('تم تعديل الوزن بنجاح');
                          }
                        }}
                        className="h-6 w-6 p-0"
                      >
                        <Edit2 className="size-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm(`هل أنت متأكد من حذف "${weight.name}"؟`)) {
                            updateScoringSettings({
                              weights: scoringSettings.weights.filter((_, i) => i !== index),
                            });
                            toast.success('تم حذف الوزن بنجاح');
                          }
                        }}
                        className="h-6 w-6 p-0 hover:text-red-500"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Decay Rate */}
          <div className="flex items-center justify-between p-3 glass-card rounded-lg border border-border">
            <div>
              <p className="text-sm font-medium text-foreground">{t('admin.advancedSettings.decayRate')}</p>
              <p className="text-[11px] text-muted-foreground">
                {t('admin.advancedSettings.decayRateDesc')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="1"
                value={scoringSettings.decayRateDays}
                onChange={(e) =>
                  updateScoringSettings({
                    decayRateDays: Math.max(1, Math.round(parseLocaleNumber(e.target.value, 1))),
                  })
                }
                className="glass-card border-2 border-border w-20 h-8 text-center"
              />
              <span className="text-sm font-bold text-primary">يوم</span>
            </div>
          </div>
        </div>
      </Card>

      {/* ====================================================================
          DIALOGS
          ====================================================================
      */}

      {/* Add Route Dialog */}
      <Dialog open={showAddRouteDialog || editingRoute !== null} onOpenChange={(open) => {
        if (!open) {
          setShowAddRouteDialog(false);
          setEditingRoute(null);
          resetRouteDialogForm();
        }
      }}>
        <DialogContent
          className="glass-card flex max-h-[min(88vh,44rem)] w-full max-w-[min(100vw-2rem,32rem)] flex-col gap-0 overflow-hidden border-2 p-0 sm:max-w-xl"
          dir={dir}
        >
          <DialogHeader className="shrink-0 space-y-1.5 border-b border-border px-6 pb-4 pt-6 text-right pe-12 sm:text-right">
            <DialogTitle className="text-right text-lg">
              {editingRoute ? t('admin.advancedSettings.editRouteDialog') : t('admin.advancedSettings.addRouteDialog')}
            </DialogTitle>
            <DialogDescription className="text-right text-sm leading-relaxed">
              {editingRoute
                ? t('admin.advancedSettings.editRouteDesc')
                : t('admin.advancedSettings.addRouteDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="route-name">{t('admin.advancedSettings.routeNameLabel')}</Label>
              <Input
                id="route-name"
                placeholder={t('admin.advancedSettings.routeNamePlaceholder')}
                value={newRouteName}
                onChange={(e) => setNewRouteName(e.target.value)}
                className="glass-card border-2 border-border text-right"
              />
            </div>

            <div className="space-y-3 glass-card bento p-4 border border-primary/20">
              <Label className="text-sm font-semibold text-foreground">
                {t('admin.advancedSettings.pilgrimageScopeLabel')}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t('admin.advancedSettings.pilgrimageScopeSwitchHint')}
              </p>
              <div
                className={cn(
                  'grid grid-cols-1 gap-3 sm:grid-cols-2',
                  newRouteAppliesToBoth && 'opacity-50',
                )}
                role="radiogroup"
                aria-label={t('admin.advancedSettings.pilgrimageScopeLabel')}
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={!newRouteAppliesToBoth && newRoutePilgrimageScope === 'umrah'}
                  disabled={newRouteAppliesToBoth}
                  onClick={() => setNewRoutePilgrimageScope('umrah')}
                  className={cn(
                    'flex flex-col items-stretch rounded-xl border-2 p-4 text-right transition-all',
                    !newRouteAppliesToBoth && newRoutePilgrimageScope === 'umrah'
                      ? 'border-emerald-500 bg-emerald-500/15 shadow-md ring-2 ring-emerald-500/30 dark:bg-emerald-950/40'
                      : 'border-border bg-muted/20 hover:border-emerald-500/50',
                  )}
                >
                  <span
                    className={cn(
                      'text-base font-black',
                      !newRouteAppliesToBoth && newRoutePilgrimageScope === 'umrah'
                        ? 'text-emerald-800 dark:text-emerald-200'
                        : 'text-muted-foreground',
                    )}
                  >
                    {t('admin.advancedSettings.pilgrimageScopeUmrah')}
                  </span>
                  <span className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {t('admin.advancedSettings.pilgrimageScopeChipSubtitleUmrah')}
                  </span>
                  {!newRouteAppliesToBoth && newRoutePilgrimageScope === 'umrah' && (
                    <span className="mt-2 inline-flex w-fit rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white">
                      {t('admin.advancedSettings.pilgrimageScopeSelected')}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={!newRouteAppliesToBoth && newRoutePilgrimageScope === 'hajj'}
                  disabled={newRouteAppliesToBoth}
                  onClick={() => setNewRoutePilgrimageScope('hajj')}
                  className={cn(
                    'flex flex-col items-stretch rounded-xl border-2 p-4 text-right transition-all',
                    !newRouteAppliesToBoth && newRoutePilgrimageScope === 'hajj'
                      ? 'border-amber-500 bg-amber-500/15 shadow-md ring-2 ring-amber-500/30 dark:bg-amber-950/40'
                      : 'border-border bg-muted/20 hover:border-amber-500/50',
                  )}
                >
                  <span
                    className={cn(
                      'text-base font-black',
                      !newRouteAppliesToBoth && newRoutePilgrimageScope === 'hajj'
                        ? 'text-amber-900 dark:text-amber-200'
                        : 'text-muted-foreground',
                    )}
                  >
                    {t('admin.advancedSettings.pilgrimageScopeHajj')}
                  </span>
                  <span className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {t('admin.advancedSettings.pilgrimageScopeChipSubtitleHajj')}
                  </span>
                  {!newRouteAppliesToBoth && newRoutePilgrimageScope === 'hajj' && (
                    <span className="mt-2 inline-flex w-fit rounded-full bg-amber-600 px-2.5 py-1 text-[11px] font-bold text-white">
                      {t('admin.advancedSettings.pilgrimageScopeSelected')}
                    </span>
                  )}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="route-applies-to-both"
                  checked={newRouteAppliesToBoth}
                  onCheckedChange={setNewRouteAppliesToBoth}
                />
                <Label htmlFor="route-applies-to-both" className="text-xs cursor-pointer font-normal">
                  {t('admin.advancedSettings.pilgrimageScopeAll')}
                </Label>
              </div>
            </div>

            {/* 🎯 Route Targeting - Categories & Entity Types */}
            <div className="space-y-3 glass-card bento p-4 border border-primary/20">
              <div className="flex items-start gap-2">
                <Target className="size-4 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <Label className="text-sm font-semibold text-foreground">
                    {t('admin.advancedSettings.routeContextTitle')}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    عند ترك الحقول فارغة → ينطبق المسار على جميع الفئات وأنواع الجهات.
                    إذا حدّدت قيماً → يظهر المسار في الوضع المتقدم فقط عند تطابق فئة الحالة / نوع الجهة.
                  </p>
                  <p className="text-xs text-primary mt-1">
                    {t('admin.advancedSettings.routeContextExample')}
                  </p>
                </div>
              </div>

              {/* Categories */}
              <div className="space-y-2">
                <Label className="text-xs text-foreground">{t('admin.advancedSettings.linkedCategories')}</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder={t('admin.advancedSettings.categoryPlaceholder')}
                    value={pendingCategoryInput}
                    onChange={(e) => setPendingCategoryInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCategoryToNewRoute();
                      }
                    }}
                    className="glass-card border-2 border-border text-right text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addCategoryToNewRoute}
                    disabled={!pendingCategoryInput.trim()}
                  >
                    <Plus className="size-3 ml-1" />
                    إضافة
                  </Button>
                </div>
                {newRouteCategories.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    {t('admin.advancedSettings.noCategories')}
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {newRouteCategories.map((cat) => (
                      <Badge
                        key={cat}
                        className="bg-primary-soft text-primary border-0 gap-1"
                      >
                        {cat}
                        <button
                          type="button"
                          onClick={() => removeCategoryFromNewRoute(cat)}
                          className="hover:text-red-500"
                          aria-label={`حذف ${cat}`}
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Entity Types */}
              <div className="space-y-2">
                <Label className="text-xs text-foreground">{t('admin.advancedSettings.linkedEntities')}</Label>
                <div className="flex flex-wrap gap-1.5">
                  {CALL_HELPER_ENTITY_TYPES.map((entityType) => {
                    const isSelected = newRouteEntityTypes.includes(entityType);
                    return (
                      <button
                        key={entityType}
                        type="button"
                        onClick={() => toggleEntityTypeForNewRoute(entityType)}
                        className={`text-xs px-3 py-1.5 rounded-full border-2 transition-colors ${
                          isSelected
                            ? 'bg-primary text-white border-primary'
                            : 'bg-transparent text-foreground border-border hover:border-primary'
                        }`}
                      >
                        {isSelected && <Check className="size-3 inline ml-1" />}
                        {entityType}
                      </button>
                    );
                  })}
                </div>
                {newRouteEntityTypes.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">
                    {t('admin.advancedSettings.noEntities')}
                  </p>
                )}
              </div>
            </div>

            {/* Parent Steps Selector */}
            <div className="space-y-2">
              <Label>{t('admin.advancedSettings.parentStepsLabel')}</Label>
              <p className="text-xs text-muted-foreground mb-2">
                {t('admin.advancedSettings.parentStepsHint')}
              </p>
              
              <div className="glass-card border-2 border-border rounded-lg p-3 max-h-64 overflow-y-auto space-y-2">
                {steps.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    {t('admin.advancedSettings.noStepsToLink')}
                  </p>
                ) : (
                  steps
                    .filter(step => {
                      // ✅ استبعاد خطوات المسار الحالي
                      if (editingRoute && step.routeId === editingRoute.id) {
                        return false;
                      }
                      // ✅ عرض فقط Steps التي لها continue subconditions (including nested)
                      const continueSubConds = getAllContinueSubConditions(step.subConditions);
                      return continueSubConds.length > 0;
                    })
                    .map((step) => {
                      // Get all continue subconditions (including nested)
                      const continueSubConds = getAllContinueSubConditions(step.subConditions);
                      
                      return (
                        <div key={step.id} className="space-y-1">
                          <p className="text-xs font-semibold text-foreground">
                            {step.name}:
                          </p>
                          {continueSubConds.map(({ subCond, path }) => (
                            <label
                              key={subCond.id}
                              className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={newRouteParentSteps.includes(subCond.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setNewRouteParentSteps(prev => [...prev, subCond.id]);
                                  } else {
                                    setNewRouteParentSteps(prev => prev.filter(id => id !== subCond.id));
                                  }
                                }}
                                className="w-4 h-4 rounded border-2 border-border"
                              />
                              <span className="text-sm text-foreground">
                                ← {path.join(' → ')}
                              </span>
                            </label>
                          ))}
                        </div>
                      );
                    })
                )}
                
                {/* عرض رسالة إذا لم تكن هناك خطوات بعد التصفية */}
                {editingRoute && 
                 steps.filter(step => {
                   if (step.routeId === editingRoute.id) return false;
                   const continueSubConds = getAllContinueSubConditions(step.subConditions);
                   return continueSubConds.length > 0;
                 }).length === 0 && 
                 steps.length > 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    {t('admin.advancedSettings.noOtherRouteSteps')}
                  </p>
                )}
              </div>

              {newRouteParentSteps.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {newRouteParentSteps.map((stepId) => {
                    // Find the subcondition name and path (including nested)
                    const found = findSubConditionById(steps, stepId);
                    
                    if (!found) return null;

                    return (
                      <Badge key={stepId} variant="outline" className="text-xs">
                        {found.stepName} → {found.path.join(' → ')}
                        <button
                          onClick={() => setNewRouteParentSteps(prev => prev.filter(id => id !== stepId))}
                          className="mr-1 hover:text-red-500"
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="shrink-0 flex flex-row gap-2 border-t border-border bg-background px-6 py-4 sm:justify-end">
            <Button variant="outline" onClick={() => {
              setShowAddRouteDialog(false);
              setEditingRoute(null);
              resetRouteDialogForm();
            }}>
              {t('admin.advancedSettings.cancel')}
            </Button>
            <Button onClick={editingRoute ? handleUpdateRoute : handleAddRoute} className="bg-primary text-primary-foreground text-white">
              <Plus className="size-4 ml-2" />
              {editingRoute ? t('admin.advancedSettings.save') : t('admin.advancedSettings.add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit SubCondition Dialog */}
      <AddStepDialog
        open={showAddSubConditionDialog || editingSubCondition !== null}
        onClose={() => {
          setShowAddSubConditionDialog(false);
          setEditingSubCondition(null);
          setNewSubConditionName('');
          setNewSubConditionAction('continue');
          setNewSubConditionDetails('');
          setNewSubConditionParentId('');
          setSelectedRoutesForStep([]);
          setApplyToLinked(false);
        }}
        onAdd={(data) => {
          console.log('➕ Adding SubCondition:', data);

          // Check if multiple routes are selected
          if (data.selectedRoutes.length > 0) {
            // Multi-route mode: Use addSubConditionToMultipleRoutes
            const stepIds = [
              selectedStepForSubCondition,
              ...data.selectedRoutes.map(routeId => {
                const step = steps.find(s => s.routeId === routeId);
                return step?.id || '';
              })
            ].filter(Boolean);

            if (stepIds.length === 0) {
              toast.error(t('admin.advancedSettings.stepsNotFound'));
              return;
            }

            addSubConditionToMultipleRoutes(
              stepIds,
              {
                name: data.name,
                action: data.action,
                actionDetails: data.actionDetails,
              },
              false,
              ''
            );

            toast.success(t('admin.advancedSettings.stepAddedMulti', { count: stepIds.length }));
          } else {
            // Single route mode: Use normal addSubCondition
            addSubCondition(
              selectedStepForSubCondition,
              {
                name: data.name,
                action: data.action,
                actionDetails: data.actionDetails,
              },
              data.parentId || undefined
            );

            toast.success(t('admin.advancedSettings.stepAdded'));
          }
        }}
        onUpdate={(data) => {
          if (!editingSubCondition) return;

          // Check if step is linked
          const currentStep = steps.find(s => s.id === editingSubCondition.stepId);
          const isLinked = currentStep?.linkedStepIds && currentStep.linkedStepIds.length > 0;

          if (isLinked && data.applyToLinked) {
            // Use linked update
            updateLinkedSubCondition(
              editingSubCondition.stepId,
              editingSubCondition.subCondition.id,
              {
                name: data.name,
                action: data.action,
                actionDetails: data.actionDetails,
              },
              true // Apply to all linked
            );

            const linkedCount = currentStep?.linkedStepIds?.length || 0;
            toast.success(t('admin.advancedSettings.stepUpdatedMulti', { count: linkedCount + 1 }));
          } else {
            // Normal update (current only)
            updateSubCondition(
              editingSubCondition.stepId,
              editingSubCondition.subCondition.id,
              {
                name: data.name,
                action: data.action,
                actionDetails: data.actionDetails,
              }
            );

            toast.success(t('admin.advancedSettings.conditionUpdated'));
          }
        }}
        routes={filteredRoutes}
        steps={steps}
        selectedStepId={selectedStepForSubCondition}
        editingSubCondition={editingSubCondition}
      />

      {/* Gray Area Question Route Linking Dialog */}
      <Dialog open={showRouteLinkDialog} onOpenChange={setShowRouteLinkDialog}>
        <DialogContent className="glass-card border-2 max-h-[80vh] overflow-y-auto" dir={dir}>
          <DialogHeader>
            <DialogTitle className="text-right">
              ربط المسارات - {selectedQuestion?.title}
            </DialogTitle>
            <DialogDescription className="text-right">
              اختر المسارات التي سيتم عرضها عند اختيار هذا السؤال في Gray Area
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-4">
            {routes.map((route) => {
              const isLinked = selectedQuestion?.linkedRouteIds.includes(route.id) || false;
              
              return (
                <div
                  key={route.id}
                  className={`flex items-center justify-between p-3 glass-card rounded-lg border-2 transition-all cursor-pointer ${
                    isLinked ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                  }`}
                  onClick={() => {
                    if (!selectedQuestion) return;
                    
                    const updatedQuestions = grayAreaSettings.questions.map(q => {
                      if (q.id === selectedQuestion.id) {
                        const newLinkedIds = isLinked
                          ? q.linkedRouteIds.filter(id => id !== route.id)
                          : [...q.linkedRouteIds, route.id];
                        return { ...q, linkedRouteIds: newLinkedIds };
                      }
                      return q;
                    });
                    
                    updateGrayAreaSettings({ questions: updatedQuestions });
                    setSelectedQuestion({
                      ...selectedQuestion,
                      linkedRouteIds: isLinked
                        ? selectedQuestion.linkedRouteIds.filter((id: string) => id !== route.id)
                        : [...selectedQuestion.linkedRouteIds, route.id],
                    });
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      isLinked ? 'bg-primary border-primary' : 'border-border'
                    }`}>
                      {isLinked && <Check className="size-3 text-white" />}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{route.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        المرحلة {route.order}
                      </p>
                    </div>
                  </div>
                  
                  {route.isActive ? (
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border-0 text-[10px]">
                      نشط
                    </Badge>
                  ) : (
                    <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-0 text-[10px]">
                      معطل
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
          
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowRouteLinkDialog(false)}
            >
              إلغاء
            </Button>
            <Button
              className="bg-primary text-primary-foreground text-white"
              onClick={() => {
                setShowRouteLinkDialog(false);
                toast.success('تم حفظ ربط المسارات بنجاح');
              }}
            >
              <Check className="size-4 ml-2" />
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export/Import Settings */}
      <Card className="glass-panel border-2 border-border p-6">
        <div className="flex items-center gap-2 mb-6">
          <Download className="size-6 text-primary" />
          <div>
            <h3 className="text-lg font-bold text-foreground">تصدير/استيراد الإعدادات</h3>
            <p className="text-xs text-muted-foreground">
              تصدير وإعادة استيراد إعدادات الوضع المتقدم
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 glass-card rounded-xl border border-border">
            <div>
              <p className="text-foreground font-medium">تصدير الإعدادات</p>
              <p className="text-xs text-muted-foreground">
                تصدير إعدادات الوضع المتقدم كملف JSON
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleExportSettings}
            >
              <Download className="size-4 ml-2" />
              تصدير
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 glass-card rounded-xl border border-border">
            <div>
              <p className="text-foreground font-medium">استيراد الإعدادات</p>
              <p className="text-xs text-muted-foreground">
                استيراد إعدادات الوضع المتقدم من ملف JSON
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                className="hidden"
                onChange={handleImportSettings}
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="size-4 ml-2" />
                استيراد
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}