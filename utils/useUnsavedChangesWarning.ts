/**
 * ====================================================================
 * useUnsavedChangesWarning Hook
 * ====================================================================
 * 
 * هذا الـ Hook يمنع المستخدم من مغادرة الصفحة إذا كانت هناك تغييرات غير محفوظة
 * 
 * الاستخدام:
 * ```tsx
 * const { hasUnsavedChanges, markAsChanged, markAsSaved } = useUnsavedChangesWarning();
 * 
 * // عند عمل أي تعديل:
 * const handleChange = () => {
 *   // ... logic
 *   markAsChanged();
 * };
 * 
 * // عند الحفظ:
 * const handleSave = () => {
 *   // ... save logic
 *   markAsSaved();
 * };
 * ```
 * 
 * ====================================================================
 */

import { useEffect, useState, useCallback } from 'react';

export function useUnsavedChangesWarning() {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // منع إغلاق الصفحة أو الانتقال لصفحة أخرى
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = ''; // Chrome requires this
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  const markAsChanged = useCallback(() => {
    setHasUnsavedChanges(true);
  }, []);

  const markAsSaved = useCallback(() => {
    setHasUnsavedChanges(false);
  }, []);

  return {
    hasUnsavedChanges,
    markAsChanged,
    markAsSaved,
  };
}
