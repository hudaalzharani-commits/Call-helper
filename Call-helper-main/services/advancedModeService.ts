/**
 * إعدادات المسارات المتقدمة + التسليم من Gray Area إلى Advanced
 * -----------------------------------------------------------------------------
 *
 * Gray Area و Advanced Mode نظامان مختلفان:
 *
 * • Gray Area — تصنيف فقط (`grayAreaSettings.questions` + `linkedRouteIds` لكل سؤال).
 * • Advanced Mode — خطوات الحل (`routes` / `steps` / subConditions) بعد اختيار المسار.
 *
 * هذا الملف:
 * - يجلب ويحفظ الحزمة الكاملة من GET/PUT `/api/settings/advanced`.
 * - يوفّر `getLinkedRoutesAndStepsForGrayAreaQuestion`: بعد أن يختار المستخدم سؤال Gray Area،
 *   تُستخرج `linkedRouteIds` ثم تُصفّى المسارات والخطوات لتمريرها لواجهة Advanced (نطاق الحل فقط).
 *
 * لا يدمج منطق التصنيف مع منطق الخطوات؛ يحدّد النطاق فقط.
 * -----------------------------------------------------------------------------
 */

import type { GrayAreaSettings, Route, Step } from "../contexts/AdvancedSettingsContext";

const ADVANCED_SETTINGS_API_PATH = "/api/settings/advanced";

export interface AdvancedSettingsPayload {
  routes: Route[];
  steps: Step[];
  grayAreaSettings: GrayAreaSettings;
}

/** ناتج التسليم: نطاق مسارات/خطوات مسموح لـ Advanced بعد سؤال Gray Area */
export interface AdvancedOptionsResult {
  /** معرّف سؤال Gray Area المختار */
  problemTypeId: string;
  allRoutes: Route[];
  /** مسارات مرتبطة بالسؤال — مدخل لوحة Advanced */
  linkedRoutes: Route[];
  allSteps: Step[];
  linkedSteps: Step[];
}

function getAuthToken(): string | null {
  try {
    return localStorage.getItem("token");
  } catch {
    return null;
  }
}

export async function fetchAdvancedSettingsFromApi(): Promise<AdvancedSettingsPayload | null> {
  const token = getAuthToken();
  if (!token) return null;

  try {
    const response = await fetch(ADVANCED_SETTINGS_API_PATH, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) return null;

    const payload = await response.json();
    if (!payload?.success || !payload?.data) return null;

    return payload.data as AdvancedSettingsPayload;
  } catch (error) {
    console.warn("⚠️ Failed to fetch advanced settings from API:", error);
    return null;
  }
}

export async function persistAdvancedSettingsToApi(
  settings: AdvancedSettingsPayload
): Promise<boolean> {
  const token = getAuthToken();
  if (!token) return false;

  try {
    const response = await fetch(ADVANCED_SETTINGS_API_PATH, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(settings),
    });

    if (!response.ok) return false;

    const payload = await response.json();
    return Boolean(payload?.success);
  } catch (error) {
    console.warn("⚠️ Failed to persist advanced settings to API:", error);
    return false;
  }
}

/**
 * بعد اختيار سؤال Gray Area: يحدد المسارات والخطوات المرتبطة به (`linkedRouteIds`)
 * لتشغيل Advanced Mode داخل ذلك النطاق فقط.
 *
 * @param grayAreaQuestionId — `question.id` من `grayAreaSettings.questions`
 * @param localSettings — إعدادات السياق عند تعذّر الـ API
 */
export async function getLinkedRoutesAndStepsForGrayAreaQuestion(
  grayAreaQuestionId: string,
  localSettings: AdvancedSettingsPayload
): Promise<AdvancedOptionsResult> {
  const apiSettings = await fetchAdvancedSettingsFromApi();
  const effectiveSettings = apiSettings || localSettings;

  const selectedQuestion = effectiveSettings.grayAreaSettings.questions.find(
    (question) => question.id === grayAreaQuestionId
  );

  const linkedRouteIds = selectedQuestion?.linkedRouteIds || [];
  const linkedRoutes = effectiveSettings.routes.filter((route) =>
    linkedRouteIds.includes(route.id)
  );
  const linkedRouteIdSet = new Set(linkedRoutes.map((route) => route.id));
  const linkedSteps = effectiveSettings.steps.filter((step) =>
    linkedRouteIdSet.has(step.routeId)
  );

  return {
    problemTypeId: grayAreaQuestionId,
    allRoutes: effectiveSettings.routes,
    linkedRoutes,
    allSteps: effectiveSettings.steps,
    linkedSteps,
  };
}

/** اسم قديم — استخدم `getLinkedRoutesAndStepsForGrayAreaQuestion` */
export const getAdvancedOptionsForProblemType = getLinkedRoutesAndStepsForGrayAreaQuestion;
