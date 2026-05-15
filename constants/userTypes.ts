/**
 * ====================================================================
 * Call Helper - User / Entity Types
 * ====================================================================
 * Single source of truth for the 5 service-provider entity types
 * that appear in the CallHelper "نوع الجهة" selector.
 *
 * Used by:
 *  - components/CallHelper.tsx          (entityType dropdown)
 *  - components/admin/AdvancedSettingsPage.tsx (route targeting UI)
 *  - contexts/AdvancedSettingsContext.tsx (route filtering helper)
 *
 * Adding a new type? Add it here in one place.
 * ====================================================================
 */

export const CALL_HELPER_ENTITY_TYPES = [
  'وكيل خارجي',
  'شركة عمرة',
  'مقدم خدمة سكن',
  'مكتب شؤون',
  'منظم تابع',
] as const;

export type CallHelperEntityType = typeof CALL_HELPER_ENTITY_TYPES[number];
