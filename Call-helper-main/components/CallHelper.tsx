import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Label } from "./ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { Badge } from "./ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import {
  Sparkles,
  Copy,
  CheckCircle2,
  MessageCircle,
  RefreshCcw,
  Sliders,
  ThumbsUp,
  Wand2,
  HelpCircle,
  Send,
  Bot,
  Zap,
  Info,
  AlertTriangle,
  ListFilter,
} from "lucide-react";
import { 
  calculateConfidence, 
  PROBLEM_TYPES 
} from "../utils/mockConfidenceData";
import { descriptionImpliesCategory } from "../utils/categoryContextMatch";
import {
  CallHelperThinkingVisualization,
  estimateThinkingStepTypingMs,
  type CallHelperThinkingStep,
} from "./CallHelperThinkingVisualization";

// ============ NEW: Import Real Confidence API ============
import { analyzeConfidenceDebounced, cancelDebouncedAnalysis } from "../services/confidenceService";

// ============ NEW: Import Description Matching Functions ============
import {
  getResponseForProblem,
  type RegisteredProblem
} from "../services/mockData";

// ============ NEW: Import Real Database Search ============
import { 
  searchWithFallback, 
  getFormattedResponse,
  type KnowledgeSearchResult,
  type MatchingWeightsOptions,
} from "../services/knowledgeService";

// ============ NEW: Import Advanced Settings Context ============
import { useAdvancedSettings } from "../contexts/AdvancedSettingsContext";
import type { Route, Step, SubCondition } from "../contexts/AdvancedSettingsContext";
import {
  matchRoutesFromDescription,
  resolveActiveRouteIdsByKeywords,
  ROUTE_KEYWORDS,
} from "../utils/keywordMatcher";
import { buildAdvancedFlowSummary } from "../utils/advancedFlowSummary";
import {
  resolveCallHelperBriefingText,
  resolveFlowGuidanceFromFlowResult,
} from "../utils/briefingDisplay";

// ============ NEW: Import Debug Panel (Admin Only) ============
import { DebugPanel } from "./DebugPanel";

// ============ NEW: Import Auth Context (to check if user is admin) ============
import { useAuth } from "../contexts/AuthContext";

// ============ NEW: Import Advanced Flow Panel ============
import { AdvancedFlowPanelV2 } from "./AdvancedFlowPanelV2Simple";

// ============ NEW: Import AI Response Generator ============
import { generateAIResponse, simulateAIProcessing } from "../utils/mockAIResponses";

// ============ NEW: Import Gray Area Wizard ============
import { GrayAreaWizard, type FlowPath } from "./GrayAreaWizard";
import { useLanguage } from "../contexts/LanguageContext";
import {
  ENTITY_KEYS,
  entityForApi,
  entityKeyFromValue,
  pilgrimageScopeFromEntityType,
  tEntity,
} from "../i18n/translations";
import { routeMatchesPilgrimageScope } from "../utils/pilgrimageRouteScope";
import { isValidMongoObjectId } from "../utils/mongoId";
import { toast } from "sonner";
import { callHelperAr } from "../i18n/modules/callHelper";

/** صيغ الإفادات المحفوظة في السجل — عربي دائماً (لوحة الإفادات المؤكدة) */
const AR_CALL_TEMPLATES = callHelperAr.callHelper.templates;

/** صيغة ثابتة لجميع ردود «توجيه التصعيد» (لا تُستبدل بتفاصيل الشرط). */
const ESCALATION_GUIDANCE_RESPONSE =
  'يتم توجيه العميل لرفع بلاغ عن طريق النظام مع المرفقات اللازمة ليتسنى لنا التحقق.';

function scoreForCallLog(score: number | null | undefined): number | undefined {
  if (typeof score !== 'number' || !Number.isFinite(score)) return undefined;
  return Math.min(100, Math.max(0, Math.round(score)));
}

/** سكور التحليلات: إجابة مباشرة (≥ العتبة) تُسجَّل 100٪ كإفادة مؤكدة */
function analyticsFinalScore(
  score: number | null | undefined,
  directAnswerMin: number,
): number | undefined {
  const rounded = scoreForCallLog(score);
  if (rounded === undefined) return undefined;
  return rounded >= directAnswerMin ? 100 : rounded;
}

export function CallHelper({
  isDarkMode,
  callHelperLaunch,
  onConsumeCallHelperLaunch,
}: {
  isDarkMode: boolean;
  /** فتح من صفحات أخرى (مثل المشاكل العامة) مع تعبئة وصف أولي */
  callHelperLaunch?: { seed: string; nonce: number } | null;
  onConsumeCallHelperLaunch?: () => void;
}) {
  const { t, dir, isRtl } = useLanguage();
  const ENABLE_AI = import.meta.env.VITE_ENABLE_AI === "true";

  /** آخر سجل مكالمة في هذه الجلسة — يُحدَّث عند إكمال الوضع المتقدم بدل إنشاء سجل مكرر */
  const lastCallLogIdRef = useRef<string | null>(null);

  // =========================
  // Real call logging (for analytics)
  // =========================
  const logCallToBackend = async (params: {
    generatedResponse: string;
    status: "pending" | "resolved" | "escalated" | "closed";
    flowResult?: unknown;
    advancedFlowSummary?: ReturnType<typeof buildAdvancedFlowSummary>;
    matchedCaseDbId?: string | null;
    matchedCaseCode?: string | null;
    matchedAt?: string | null;
    category?: string | null;
    /** سكور العرض الأخير (0–100) — للتحليلات والإفادات المؤكدة */
    finalDisplayScore?: number | null;
    /** إنشاء سجل جديد دائماً (مثلاً أول توليد) بدل تحديث السجل الحالي */
    forceNewLog?: boolean;
  }) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      // Only log when we have the minimum required fields for CallLog
      if (!customerName || !entityType || !problemSummary) return;

      const advancedFlowSummary =
        params.advancedFlowSummary ??
        (params.flowResult
          ? buildAdvancedFlowSummary(params.flowResult, { routes, steps })
          : null);

      const payload: Record<string, unknown> = {
        customerName,
        entityType: entityForApi(entityType) || entityType,
        problemType: selectedProblemType || "general",
        problemSummary,
        category: params.category && params.category.trim() ? params.category.trim() : null,
        matchedCase:
          params.matchedCaseDbId && isValidMongoObjectId(params.matchedCaseDbId)
            ? params.matchedCaseDbId
            : null,
        matchedCaseCode: params.matchedCaseCode || null,
        matchedAt: params.matchedAt || null,
        generatedResponse: params.generatedResponse,
        status: params.status,
      };
      if (params.flowResult !== undefined) payload.flowResult = params.flowResult;
      if (advancedFlowSummary) payload.advancedFlowSummary = advancedFlowSummary;
      const score = scoreForCallLog(params.finalDisplayScore);
      if (score !== undefined) payload.finalDisplayScore = score;

      const wantsPatch =
        !params.forceNewLog &&
        Boolean(lastCallLogIdRef.current) &&
        (params.flowResult !== undefined || advancedFlowSummary);

      const requestInit = {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      };

      let response = await fetch(
        wantsPatch ? `/api/calls/${lastCallLogIdRef.current}` : "/api/calls",
        { ...requestInit, method: wantsPatch ? "PATCH" : "POST" },
      );

      if (wantsPatch && (response.status === 404 || response.status === 405)) {
        lastCallLogIdRef.current = null;
        response = await fetch("/api/calls", {
          ...requestInit,
          method: "POST",
        });
      }

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        console.warn("⚠️ Failed to save call log:", response.status, errorBody);
        toast.error(
          isRtl
            ? "تعذّر حفظ الإفادة في السجل. تأكد أن الخادم محدّث وأعد التوليد."
            : "Could not save briefing to the log. Restart the backend and try again.",
        );
        return;
      }

      const saved = await response.json().catch(() => null);
      const id = saved?.data?._id ?? saved?.data?.id;
      if (id) lastCallLogIdRef.current = String(id);
      window.dispatchEvent(new CustomEvent("rafeeq:call-log-saved"));
    } catch (error) {
      // Don't block the UX for logging failures
      console.warn("⚠️ Failed to log call for analytics", error);
    }
  };
  const [customerName, setCustomerName] = useState("");
  const [entityType, setEntityType] = useState("");
  const [problemDescription, setProblemDescription] = useState("");
  const [problemSummary, setProblemSummary] = useState("");

  const selectedEntityKey = entityKeyFromValue(entityType) || entityType;
  const entityTypeApi = entityForApi(entityType) || entityType;
  /** يُستنتج من «مقدم الخدمة» بنفس منطق Service Type في قاعدة البيانات (عمرة vs حج) */
  const callPilgrimageScope = useMemo<"umrah" | "hajj">(
    () => pilgrimageScopeFromEntityType(entityType),
    [entityType],
  );

  useEffect(() => {
    if (!callHelperLaunch?.seed?.trim()) return;
    setProblemSummary(callHelperLaunch.seed.trim());
    onConsumeCallHelperLaunch?.();
  }, [callHelperLaunch?.nonce, callHelperLaunch?.seed, onConsumeCallHelperLaunch]);
  const [generatedText, setGeneratedText] = useState("");
  /** نص الإرشاد من مسار الوضع المتقدم — يُعرض في «تم إفادة العميل» (أولوية على قاعدة المعرفة) */
  const [flowBriefingGuidance, setFlowBriefingGuidance] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [activeButton, setActiveButton] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [onTeachPage, setOnTeachPage] = useState(false);
  const [showWhyPopup, setShowWhyPopup] = useState(false);
  const [isAlternativeFormat, setIsAlternativeFormat] = useState(false);
  const [showRafeeqChat, setShowRafeeqChat] = useState(false);
  const [isRafeeqActive, setIsRafeeqActive] = useState(false);
  const [chatMessage, setChatMessage] = useState("");

  // ============ NEW: Gray Area & Advanced Mode States ============
  /**
   * Confidence score (0-100) calculated from problem description
   * TODO: Replace with backend API response
   */
  const [confidenceScore, setConfidenceScore] = useState<number>(100);

  /**
   * Shows Gray Area dialog when confidence < 40%
   */
  const [showGrayAreaDialog, setShowGrayAreaDialog] = useState(false);

  /**
   * Selected problem type from Gray Area
   */
  const [selectedProblemType, setSelectedProblemType] = useState<string>("");

  /**
   * Whether advanced mode is enabled (auto-enabled after Gray Area selection)
   */
  const [isAdvancedModeEnabled, setIsAdvancedModeEnabled] = useState(false);

  /**
   * Track if user resolved Gray Area by selecting problem type
   * This overrides the direct answer route logic
   */
  const [wasGrayAreaResolved, setWasGrayAreaResolved] = useState(false);

  /**
   * Advanced mode options (will be populated based on problem type)
   * TODO: Connect to decision tree backend
   */
  const [advancedOptions, setAdvancedOptions] = useState<any>(null);

  // ============ NEW: Description Matching States ============
  /**
   * Match percentage from description matching (0-100)
   */
  const [descriptionMatchPercentage, setDescriptionMatchPercentage] = useState<number>(0);

  /**
   * Matched problem from registered problems database
   */
  const [matchedProblem, setMatchedProblem] = useState<RegisteredProblem | null>(null);

  /**
   * Whether the generated text is from a matched problem (not AI generated)
   */
  const [isMatchedResponse, setIsMatchedResponse] = useState(false);


  // ============ NEW: Advanced Settings Context ============
  const { routes, steps, grayAreaSettings, scoringSettings, getStepsByRoute, getRoutesForContext } = useAdvancedSettings();

  // ============ NEW: Auth Context ============
  const { user, isAdmin } = useAuth();

  // ============ NEW: Get enabled questions only for Gray Area Dialog ============
  const enabledQuestions = grayAreaSettings.questions.filter(q => q.isEnabled);

  // ============ NEW: Selected question's linked routes ============
  const [selectedQuestionLinkedRoutes, setSelectedQuestionLinkedRoutes] = useState<string[]>([]);

  // ============ NEW: Score Thresholds from Settings ============
  const directAnswerThreshold = scoringSettings.scoreThresholds.directAnswer;
  const showAdvancedThreshold = scoringSettings.scoreThresholds.showAdvanced;
  const grayAreaThreshold = scoringSettings.scoreThresholds.grayArea;

  // ============ NEW: Debug Panel States (Admin Only) ============
  /**
   * Active route in advanced mode flow
   */
  const [debugActiveRoute, setDebugActiveRoute] = useState<string | null>(null);

  /**
   * Current step in flow
   */
  const [debugCurrentStep, setDebugCurrentStep] = useState<{ name: string; order: number } | null>(null);

  /**
   * Selected sub-condition
   */
  const [debugSubCondition, setDebugSubCondition] = useState<string | null>(null);

  /**
   * Action taken
   */
  const [debugAction, setDebugAction] = useState<'continue' | 'force_solution' | 'direct_answer' | 'escalation' | null>(null);

  /**
   * Flow log for debugging
   */
  const [debugFlowLog, setDebugFlowLog] = useState<Array<{
    step: string;
    subCondition: string;
    action: string;
    timestamp: Date;
  }>>([]);
  const [debugScoringBreakdown, setDebugScoringBreakdown] = useState<KnowledgeSearchResult['debugBreakdown'] | null>(null);
  /** رسالة «تفكير» واحدة ظاهرة في كل لحظة (يُستبدل النص عند كل مرحلة حقيقية) */
  const [thinkingSteps, setThinkingSteps] = useState<CallHelperThinkingStep[]>([]);
  /** تحليل جارٍ — لا يُعرض الحل حتى تنتهي عبارات التفكير */
  const isAnalysisInProgress = isGenerating || thinkingSteps.length > 0;
  const showGeneratedOutput =
    Boolean(generatedText?.trim()) && !isAnalysisInProgress;

  const getScoringWeightValue = (weightName: string, fallback: number): number => {
    const normalizedTarget = weightName.trim().toLowerCase();
    const reversedWeights = [...scoringSettings.weights].reverse();
    const matchedWeight = reversedWeights.find(
      (weight) => weight.name.trim().toLowerCase() === normalizedTarget
    );
    const parsedValue = Number(matchedWeight?.value);
    if (!Number.isFinite(parsedValue)) return fallback;
    return Math.max(0, Math.min(100, parsedValue));
  };
  const buildMatcherOptions = (
    extraOptions: Partial<MatchingWeightsOptions> = {}
  ): MatchingWeightsOptions => {
    const keywordMatchWeight = getScoringWeightValue('keywordMatch', 100);
    const caseUsageFrequencyWeight = getScoringWeightValue('caseUsageFrequency', 0);
    const caseFreshnessWeight = getScoringWeightValue('caseFreshness', 0);
    const caseMetadataMatchWeight = getScoringWeightValue('caseMetadataMatch', 0);
    const decayRateDays = Math.max(1, Number(scoringSettings.decayRateDays || 30));
    const userTypeHint = entityTypeApi || '';
    const includeDebugBreakdown = Boolean(isAdmin);

    return {
      keywordMatchWeight,
      caseUsageFrequencyWeight,
      caseFreshnessWeight,
      caseMetadataMatchWeight,
      decayRateDays,
      userTypeHint,
      includeDebugBreakdown,
      ...extraOptions,
    };
  };

  /** رسالة واحدة؛ ننتظر حتى تنتهي كتابة السطر الإنجليزي للمرحلة ثم pauseMs كحد أدنى */
  const appendThinkingStep = useCallback(
    async (text: string, pauseMs: number, enLine: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      setThinkingSteps([{ id, text, enLine }]);
      const typingMs = estimateThinkingStepTypingMs(enLine);
      await new Promise<void>((r) => setTimeout(r, Math.max(pauseMs, typingMs)));
    },
    [],
  );

  const appendPostSearchThinking = useCallback(
    async (searchResult: KnowledgeSearchResult, opts?: { includeGrayAreaHint?: boolean }) => {
      const breakdown = searchResult.debugBreakdown;
      if (breakdown?.preFilter?.skippedByUserTypeOrServiceType?.length) {
        await appendThinkingStep(
          "تضييق الاحتمالات بعد فلترة نوع الجهة أو نوع الخدمة وفق المعطيات.",
          520,
          "NARROWING BY USER TYPE AND SERVICE FILTERS",
        );
      }
      const kw = breakdown?.keyword?.findings;
      if (
        kw &&
        (kw.matchedMainKeywords.length > 0 ||
          kw.matchedExtraKeywords.length > 0 ||
          kw.matchedSynonyms.length > 0 ||
          kw.matchedUserWordsInCaseText.length > 0)
      ) {
        await appendThinkingStep(
          "مطابقة الكلمات المفتاحية مع نصوص الحالات المسجّلة.",
          480,
          "MATCHING KEYWORD SIGNALS ON REGISTERED CASES",
        );
      }
      if (!searchResult.isMatched && searchResult.matchPercentage > 0) {
        await appendThinkingStep(
          "مراجعة الحالات القريبة — السكور لم يصل بعد لعتبة اعتماد التطابق في النظام.",
          520,
          "REVIEWING BORDERLINE SCORES BELOW CONFIRM THRESHOLD",
        );
      }
      if (searchResult.isMatched && searchResult.matchPercentage >= 85) {
        await appendThinkingStep(
          "تم رصد تشابه مرتفع مع حالة مسجّلة في قاعدة البيانات.",
          460,
          "HIGH SIMILARITY LOCK ON DATABASE CASE",
        );
      } else if (searchResult.isMatched) {
        await appendThinkingStep(
          "تم التعرف على تشابه مع حالة قريبة.",
          440,
          "PARTIAL MATCH ANCHORED TO CLOSEST CASE",
        );
      }
      const meta = breakdown?.metadata?.findings;
      if (
        meta &&
        ((meta.categoryMatchedTokens?.length ?? 0) > 0 ||
          (meta.subCategoryMatchedTokens?.length ?? 0) > 0 ||
          meta.userTypeMatched === true)
      ) {
        await appendThinkingStep(
          "ربط السياق (فئة / تصنيف فرعي / نوع حساب) ضمن مطابقة البيانات الوصفية.",
          480,
          "BINDING CATEGORY SUBTYPE AND ACCOUNT CONTEXT",
        );
      }
      if (opts?.includeGrayAreaHint) {
        const previewText =
          searchResult.isMatched && searchResult.problem
            ? getFormattedResponse(searchResult.problem, customerName, entityTypeApi)
            : `السلام عليكم ورحمة الله وبركاته،\n\nتم استقبال بلاغ من العميل: ${customerName}\nنوع الجهة: ${entityType}\n\nوصف المشكلة:\n${problemSummary}\n\nتم تسجيل البلاغ في النظام وسيتم المتابعة مع الفريق المختص.\n\nشكراً لتواصلكم معنا.`;
        const simDesc = searchResult.matchPercentage;
        const simConf = searchResult.matchPercentage;
        const simDisplayed = simDesc > 40 ? simDesc : simConf;
        if (simDisplayed < grayAreaThreshold && previewText.trim()) {
          await appendThinkingStep(
            "الحالة تحتاج تفاصيل إضافية — قد تُفعَّل منطقة الغموض قبل اعتماد الرد النهائي.",
            540,
            "AMBIGUOUS MAY REQUIRE MORE DETAIL",
          );
        }
      }
    },
    [appendThinkingStep, customerName, entityType, grayAreaThreshold, problemSummary],
  );

  const rerunMatchWithFlowContext = async (context: {
    routeNames?: string[];
    stepNames?: string[];
    subConditionNames?: string[];
    problemTypeName?: string;
  }): Promise<KnowledgeSearchResult | null> => {
    const routeNames = (context.routeNames || []).map((value) => value.trim()).filter(Boolean);
    const stepNames = (context.stepNames || []).map((value) => value.trim()).filter(Boolean);
    const subConditionNames = (context.subConditionNames || []).map((value) => value.trim()).filter(Boolean);
    const problemTypeName = (context.problemTypeName || '').trim();
    const contextTokens = [
      ...new Set([
        ...subConditionNames,
        ...stepNames,
        ...routeNames,
        problemTypeName,
      ].filter(Boolean)),
    ];
    const enhancedProblemDescription = [problemSummary, ...contextTokens]
      .map((value) => value.trim())
      .filter(Boolean)
      .join(' ');
    if (!enhancedProblemDescription) return null;

    const categoryHint = [...new Set([...routeNames, problemTypeName].filter(Boolean))].join(' ');
    const subCategoryHint = [...new Set([...stepNames, ...subConditionNames].filter(Boolean))].join(' ');
    const rematchResult = await searchWithFallback(enhancedProblemDescription, false, buildMatcherOptions({
      categoryHint: categoryHint || undefined,
      subCategoryHint: subCategoryHint || undefined,
    }));
    setDebugScoringBreakdown(rematchResult.debugBreakdown || null);
    return rematchResult;
  };

  /**
   * Calculate confidence score whenever problem description changes
   * Uses real backend API with debouncing (500ms delay after user stops typing)
   */
  useEffect(() => {
    if (problemSummary.trim()) {
      // Use debounced API call to backend
      analyzeConfidenceDebounced(problemSummary, (result) => {
        if (result.success && result.data) {
          setConfidenceScore(result.data.confidenceScore);
          
          // Log provider for debugging (optional)
          if (result.metadata?.provider === 'fallback') {
            console.log('ℹ️ Using fallback confidence calculation:', result.metadata.reason);
          } else if (result.metadata?.provider === 'openai') {
            console.log('✅ OpenAI confidence analysis:', result.data.confidenceScore + '%');
          }
        } else {
          // Fallback to local calculation on error
          console.warn('⚠️ Confidence API failed, using local fallback');
          const score = calculateConfidence(problemSummary);
          setConfidenceScore(score);
        }
      });
    } else {
      // Reset all matching/score UI when description is cleared
      setConfidenceScore(0);
      setDescriptionMatchPercentage(0);
      setMatchedProblem(null);
      setIsMatchedResponse(false);
      setGeneratedText('');
      setFlowBriefingGuidance(null);
      setActiveButton(null);
      setWasGrayAreaResolved(false);
      setSelectedProblemType('');
      setDebugScoringBreakdown(null);
      lastCallLogIdRef.current = null;
      cancelDebouncedAnalysis(); // Cancel pending analysis
    }
    
    // Cleanup: cancel pending analysis when component unmounts
    return () => {
      cancelDebouncedAnalysis();
    };
  }, [problemSummary]);

  const handleGenerate = async () => {
    if (!customerName || !entityType || !problemSummary) {
      return;
    }

    setIsGenerating(true);
    setThinkingSteps([]);
    setGeneratedText('');
    setIsAlternativeFormat(false);
    lastCallLogIdRef.current = null;
    setFlowBriefingGuidance(null);

    // ✅ Reset Gray Area states when generating new response
    setWasGrayAreaResolved(false);
    setSelectedProblemType("");
    setIsAdvancedModeEnabled(false);
    setActiveButton(null);
    setDebugScoringBreakdown(null);

    try {
      if (customerName.trim() || entityType.trim()) {
        await appendThinkingStep(
          "رفيق يربط المعطيات (اسم العميل ونوع الجهة) مع إعدادات المطابقة.",
          520,
          "LINKING INPUT FIELDS TO MATCHER CONTEXT",
        );
      }
      await appendThinkingStep(
        "رفيق يحلل الكلمات المفتاحية ويبحث في الحالات المسجّلة.",
        540,
        "THINKING IN NEXT MOVE",
      );

      // ============ NEW: Search real database only (no mock fallback) ============
      console.log('🔍 Searching knowledge base for:', problemSummary);
      const matcherOptions = buildMatcherOptions();
      const searchResult = await searchWithFallback(problemSummary, false, matcherOptions);

      await appendPostSearchThinking(searchResult, { includeGrayAreaHint: true });

      setDebugScoringBreakdown(searchResult.debugBreakdown || null);
      if (matcherOptions.includeDebugBreakdown && searchResult.debugBreakdown) {
        console.log('🧪 Matcher debug breakdown:', searchResult.debugBreakdown);
      }

      // If we found a match with good percentage (> 40%), use it
      if (searchResult.isMatched && searchResult.problem) {
        console.log('✅ Match found:', searchResult.matchPercentage + '%');
        
        const formattedText = getFormattedResponse(
          searchResult.problem,
          customerName,
          entityTypeApi,
        );
        
        setGeneratedText(formattedText);
        // Forward the matched case category so the backend can update the
        // daily frequency bucket (used by the admin-only dashboard section).
        const matchedCategory = (searchResult.problem.category || '').trim();
        const matchScore = searchResult.matchPercentage;
        const isConfirmedBriefing = matchScore >= directAnswerThreshold;
        void logCallToBackend({
          generatedResponse: formattedText,
          status: isConfirmedBriefing ? 'resolved' : 'pending',
          matchedCaseDbId: searchResult.problem.id,
          matchedCaseCode: searchResult.problem.description,
          matchedAt: new Date().toISOString(),
          category: matchedCategory || null,
          finalDisplayScore: analyticsFinalScore(matchScore, directAnswerThreshold),
          forceNewLog: true,
        });
        setDescriptionMatchPercentage(searchResult.matchPercentage);
        // Update confidence score to match percentage to prevent gray area warning
        setConfidenceScore(searchResult.matchPercentage);
        setMatchedProblem({
          id: searchResult.problem.id,
          title: searchResult.problem.title,
          description: searchResult.problem.description,
          response: searchResult.problem.solution,
          keywords: searchResult.problem.keywords,
          category: searchResult.problem.category,
          confidence: searchResult.problem.confidence,
          why: (searchResult.problem.why || '').trim(),
        } as RegisteredProblem);
        setIsMatchedResponse(true);
      } else {
        // No match found - generate generic response
        console.log('❌ No match found, using generic response');
        
      const entityTypeArabic = entityTypeApi;

        const generated = `السلام عليكم ورحمة الله وبركاته،\n\nتم استقبال بلاغ من العميل: ${customerName}\nنوع الجهة: ${entityTypeArabic}\n\nوصف المشكلة:\n${problemSummary}\n\nتم تسجيل البلاغ في النظام وسيتم المتابعة مع الفريق المختص.\n\nشكراً لتواصلكم معنا.`;

        setGeneratedText(generated);
        void logCallToBackend({
          generatedResponse: generated,
          status: "pending",
          finalDisplayScore: analyticsFinalScore(
            searchResult.matchPercentage,
            directAnswerThreshold,
          ),
          forceNewLog: true,
        });
        setDescriptionMatchPercentage(searchResult.matchPercentage);
        // Keep displayed score consistent with weighted keyword matching result
        setConfidenceScore(searchResult.matchPercentage);
        setMatchedProblem(null);
        setIsMatchedResponse(false);
      }
    } catch (error) {
      console.error('❌ Error during knowledge base search:', error);
      await appendThinkingStep(
        "تعذّر إكمال المطابقة من الخادم — جاري تجهيز رد احتياطي.",
        540,
        "MATCH FAILED USING SAFE FALLBACK RESPONSE",
      );
      
      // Fallback to generic response on error
      const entityTypeArabic = entityTypeApi;

      const generated = `السلام عليكم ورحمة الله وبركاته،\n\nتم استقبال بلاغ من العميل: ${customerName}\nنوع الجهة: ${entityTypeArabic}\n\nوصف المشكلة:\n${problemSummary}\n\nتم تسجيل البلاغ في النظام وسيتم المتابعة مع الفريق المختص.\n\nشكراً لتواصلكم معنا.`;

      setGeneratedText(generated);
      void logCallToBackend({
        generatedResponse: generated,
        status: "pending",
        finalDisplayScore: 0,
      });
      setDescriptionMatchPercentage(0);
      setConfidenceScore(0);
      setMatchedProblem(null);
      setIsMatchedResponse(false);
      setDebugScoringBreakdown(null);
    } finally {
      await new Promise<void>((r) => setTimeout(r, 480));
      setThinkingSteps([]);
      setIsGenerating(false);
    }
  };

  const handleGenerateAlternative = () => {
    setIsAlternativeFormat(true);
    setThinkingSteps([]);
    void (async () => {
      setIsGenerating(true);
      setGeneratedText('');
      await appendThinkingStep(
        "مراجعة السكور الحالي وتجهيز صيغة بديلة وفق نفس السياق.",
        480,
        "REBUILDING ALTERNATE REPLY FROM CURRENT SCORE",
      );

      const scoreSnapshot =
        descriptionMatchPercentage > 40
          ? descriptionMatchPercentage
          : confidenceScore;

      await new Promise<void>((r) => setTimeout(r, 400));

      const entityTypeArabic = entityTypeApi;

      const alternativeGenerated = `مرحباً،\n\nنفيدكم باستلام بلاغكم بخصوص:\nاسم المبلغ: ${customerName}\nطبيعة الجهة: ${entityTypeArabic}\n\nتفاصيل البلاغ:\n${problemSummary}\n\nسيتم دراسة الموضوع والرد عليكم في أقرب وقت.\n\nمع التقدير،`;

      setGeneratedText(alternativeGenerated);
      void logCallToBackend({
        generatedResponse: alternativeGenerated,
        status: "pending",
        finalDisplayScore: analyticsFinalScore(
          Number(scoreSnapshot) || 0,
          directAnswerThreshold,
        ),
      });
      await new Promise<void>((r) => setTimeout(r, 280));
      setThinkingSteps([]);
      setIsGenerating(false);
    })();
  };

  const handleCopy = () => {
    if (!generatedText?.trim()) return;
    const textarea = document.createElement("textarea");
    textarea.value = generatedText;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();

    try {
      document.execCommand("copy");
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    } finally {
      document.body.removeChild(textarea);
    }
  };

  /** ينتقل إلى لوحة «علّم رفيق من تجربتك» مع تعبئة الحقول من المكالمة الحالية */
  const openTeachRafeeqFromExperience = () => {
    const dbResponse =
      isMatchedResponse && matchedProblem?.response?.trim()
        ? matchedProblem.response.trim()
        : "";
    const matchedCaseId =
      (matchedProblem?.description || "").trim() ||
      (debugScoringBreakdown?.caseId || "").trim();
    window.dispatchEvent(
      new CustomEvent("app:navigate", {
        detail: {
          view: "teach-rafeeq",
          prefill: {
            entityType: selectedEntityKey || entityKeyFromValue(entityType) || entityType,
            problemDetails: problemSummary,
            correctInfo: dbResponse,
            caseId: matchedCaseId,
          },
        },
      }),
    );
  };

  /**
   * Handle Gray Area problem type selection
   * Activates advanced mode and passes problem type
   * 
   * UPDATED: Don't generate response or update confidence here
   * Wait until user completes the advanced flow (escalation or force_solution)
   */
  const handleProblemTypeSelect = (typeId: string) => {
    setSelectedProblemType(typeId);
    
    // Get linked routes for the selected question
    const selectedQuestion = grayAreaSettings.questions.find(q => q.id === typeId);
    if (selectedQuestion) {
      setSelectedQuestionLinkedRoutes(selectedQuestion.linkedRouteIds);
    }
    
    // Auto-enable advanced mode
    setIsAdvancedModeEnabled(true);
    setActiveButton("advanced");

    // ❌ DON'T update confidence score here - wait for flow completion
    // setConfidenceScore(100); 

    // Mark Gray Area as resolved (to show buttons and hide warning)
    setWasGrayAreaResolved(true);

    // TODO: Fetch advanced options from backend based on selected problem type
    // For now, using mock structure
    const mockAdvancedOptions = {
      problemType: typeId,
      availableActions: [
        "إجراء فوري",
        "تصعيد للإدارة",
        "متابعة لاحقة"
      ],
      suggestedPriority: "عالية"
    };
    setAdvancedOptions(mockAdvancedOptions);

    // Close Gray Area dialog
    setShowGrayAreaDialog(false);

    // ❌ DON'T re-generate here - wait for advanced flow completion
    // Just keep the existing generated text (if any) or show placeholder
  };

  /**
   * Determine if we should show Gray Area (low confidence)
   * Uses grayAreaThreshold from settings instead of hardcoded value
   * IMPORTANT: Hide Gray Area if wasGrayAreaResolved is true (user already selected problem type)
   */
  const isLowConfidence =
    !wasGrayAreaResolved && confidenceScore < grayAreaThreshold && showGeneratedOutput;

  /**
   * Calculate the actual displayed score (for consistency)
   * Use descriptionMatchPercentage if > 40, otherwise use confidenceScore
   * This ensures button logic matches what user sees
   */
  const displayedScore = descriptionMatchPercentage > 40 ? descriptionMatchPercentage : confidenceScore;

  /**
   * Button visibility from displayed score (matches badge):
   * >= directAnswerThreshold (default 80): hide «صيغة أخرى» + «وضع متقدم» — only «أفدتك؟»
   * >= showAdvancedThreshold and < directAnswerThreshold: show all three action buttons
   * < grayAreaThreshold: Gray Area warning (above)
   */
  const hasGeneratedAnswer = showGeneratedOutput;

  const clientBriefingText = useMemo(
    () =>
      resolveCallHelperBriefingText({
        flowBriefingGuidance,
        generatedText,
        matchedKbResponse:
          isMatchedResponse && matchedProblem?.response?.trim()
            ? matchedProblem.response.trim()
            : null,
      }),
    [flowBriefingGuidance, generatedText, isMatchedResponse, matchedProblem],
  );
  const isHighConfidenceAnswer =
    hasGeneratedAnswer && displayedScore >= directAnswerThreshold;
  const isDirectAnswerRoute = isHighConfidenceAnswer;
  const showAllButtons =
    hasGeneratedAnswer &&
    !isHighConfidenceAnswer &&
    (displayedScore >= showAdvancedThreshold && displayedScore < directAnswerThreshold);

  /**
   * استنتاج فئة الحالة من وصف المشكلة عندما لا يوجد تطابق قاعدة معرفة،
   * بمطابقة نص الوصف مع أسماء الفئات المعرّفة على المسارات (مثال: "التأشيرة").
   */
  const inferredCategoryFromDescription = useMemo(() => {
    const text = problemSummary.trim();
    if (!text) return '';

    const keywordMatches = matchRoutesFromDescription(text, Object.keys(ROUTE_KEYWORDS));
    if (keywordMatches.length > 0) {
      return keywordMatches[0].routeName;
    }

    const candidates = new Set<string>();
    for (const route of routes) {
      if (!route.isActive) continue;
      if (!routeMatchesPilgrimageScope(route, callPilgrimageScope)) continue;
      for (const c of route.categories || []) {
        const t = (c || '').trim();
        if (t.length >= 2) candidates.add(t);
      }
      const routeName = (route.name || '').trim();
      if (routeName.length >= 2) candidates.add(routeName);
    }
    const sorted = [...candidates].sort((a, b) => b.length - a.length);
    for (const cat of sorted) {
      if (descriptionImpliesCategory(text, cat)) return cat;
    }
    return '';
  }, [problemSummary, routes, callPilgrimageScope]);

  /**
   * 🎯 مسارات الوضع المتقدم / Gray Area
   *
   * - `undefined`: لا نفلتر بعد — يعرض المعالج كل المسارات النشطة (قبل اكتمال السياق).
   * - مصفوفة (قد تكون فارغة): سياق محدد — عرض هذه المسارات فقط (أو لا شيء إن []).
   *
   * يُفعَّل إخفاء المسارات غير المرتبطة بالفئة عندما:
   *   - نتيجة السكور/المطابقة جاهزة (وضع متقدم ≥ عتبة Advanced، أو مطابقة وصف ≥ 40٪، أو بعد حل Gray Area)، و
   *   - فئة الحالة معروفة (من قاعدة المعرفة أو من استنتاج الكلمات في الوصف)، و
   *   - نوع الجهة (مقدم الخدمة) محدد في النموذج.
   *
   * مسار Gray Area مع مسارات مربوطة بالسؤال: يُستخدم الرابط مباشرة دون اشتراط أعلاه.
   */
  const targetedRouteIds = useMemo<string[] | undefined>(() => {
    if (selectedQuestionLinkedRoutes.length > 0) {
      return selectedQuestionLinkedRoutes.filter((id) => {
        const route = routes.find((r) => r.id === id);
        if (!route?.isActive) return false;
        return routeMatchesPilgrimageScope(route, callPilgrimageScope);
      });
    }

    const summaryText = problemSummary.trim();
    const keywordRouteIds = resolveActiveRouteIdsByKeywords(summaryText, routes);
    const scopeKeywordRoutes = (ids: string[]): string[] => {
      if (ids.length === 0) return [];
      if (entityType.trim()) {
        const entityAllowed = getRoutesForContext({
          entityType: entityTypeApi,
          category: '',
          pilgrimageScope: callPilgrimageScope,
        }).map((route) => route.id);
        return ids.filter((id) => entityAllowed.includes(id));
      }
      return ids.filter((id) => {
        const route = routes.find((r) => r.id === id);
        return Boolean(route?.isActive && routeMatchesPilgrimageScope(route, callPilgrimageScope));
      });
    };

    /** أولوية الكلمات المفتاحية في الوصف (مثال: «تصريح» → مسار التسجيل وليس التأشيرة) */
    if (summaryText && keywordRouteIds.length > 0) {
      const scoped = scopeKeywordRoutes(keywordRouteIds);
      if (scoped.length > 0) return scoped;
    }

    const keywordCategory =
      summaryText && keywordRouteIds.length > 0
        ? matchRoutesFromDescription(summaryText, Object.keys(ROUTE_KEYWORDS))[0]?.routeName || ''
        : '';
    const resolvedCategory =
      keywordCategory ||
      inferredCategoryFromDescription ||
      (matchedProblem?.category || '').trim();
    const hasCategory = Boolean(resolvedCategory);
    const hasEntity = Boolean(entityType.trim());
    const hasGenerated = Boolean(generatedText?.trim());
    /** بعد توليد الرد: نعتبر السكور/المطابقة جاهزة لفرض فلترة المسارات */
    const scoreContextReady =
      wasGrayAreaResolved ||
      displayedScore >= showAdvancedThreshold ||
      descriptionMatchPercentage >= 40;

    let applyContextFilter = false;
    if (wasGrayAreaResolved) {
      applyContextFilter = hasCategory && hasGenerated && scoreContextReady;
    } else {
      applyContextFilter =
        hasCategory && hasEntity && hasGenerated && scoreContextReady;
    }

    if (!applyContextFilter) {
      return undefined;
    }

    if (keywordRouteIds.length > 0) {
      const entityScoped = scopeKeywordRoutes(keywordRouteIds);
      if (entityScoped.length > 0) return entityScoped;
    }

    if (!resolvedCategory) {
      return undefined;
    }

    const contextRoutes = getRoutesForContext({
      entityType: entityTypeApi,
      category: resolvedCategory,
      pilgrimageScope: callPilgrimageScope,
    });
    if (contextRoutes.length === 0) {
      return undefined;
    }
    return contextRoutes.map((route) => route.id);
  }, [
    problemSummary,
    routes,
    selectedQuestionLinkedRoutes,
    wasGrayAreaResolved,
    matchedProblem,
    inferredCategoryFromDescription,
    entityType,
    entityTypeApi,
    callPilgrimageScope,
    generatedText,
    displayedScore,
    showAdvancedThreshold,
    descriptionMatchPercentage,
    getRoutesForContext,
  ]);

  /** إغلاق «صيغة أخرى» / «وضع متقدم» عند وصول السكور لعتبة الرد المباشر (≥80 افتراضياً) */
  useEffect(() => {
    if (!hasGeneratedAnswer) return;
    if (displayedScore < directAnswerThreshold) return;
    setActiveButton((prev) =>
      prev === "advanced" || prev === "retry" ? null : prev,
    );
  }, [hasGeneratedAnswer, displayedScore, directAnswerThreshold]);

  /** ضمان تسجيل إفادة مؤكدة إذا وُجد رد عالي الثقة ولم يُحفظ سجل (مثلاً فشل طلب سابق) */
  useEffect(() => {
    if (!hasGeneratedAnswer) return;
    if (displayedScore < directAnswerThreshold) return;
    if (lastCallLogIdRef.current) return;
    if (!customerName.trim() || !entityType.trim() || !problemSummary.trim()) return;

    const storedText = generatedText.trim();
    if (!storedText) return;

    void logCallToBackend({
      generatedResponse: storedText,
      status: 'resolved',
      finalDisplayScore: 100,
      category: matchedProblem?.category?.trim() || null,
      matchedCaseDbId: matchedProblem?.id ?? null,
      matchedCaseCode: matchedProblem?.description ?? null,
      matchedAt: matchedProblem ? new Date().toISOString() : null,
      forceNewLog: true,
    });
  }, [
    hasGeneratedAnswer,
    displayedScore,
    directAnswerThreshold,
    customerName,
    entityType,
    problemSummary,
    generatedText,
    matchedProblem,
  ]);

  /**
   * Handle Advanced Mode toggle
   * TODO: Connect to decision tree backend when enabled
   */
  const handleAdvancedModeToggle = () => {
    const newState = activeButton === "advanced" ? null : "advanced";
    setActiveButton(newState);
    
    if (newState === "advanced" && !isAdvancedModeEnabled) {
      // First time enabling advanced mode
      // TODO: Fetch decision tree options from backend
      setIsAdvancedModeEnabled(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 text-center shadow-lg border-2 border-border">
        <h1 className="text-2xl sm:text-4xl font-black gradient-text">{t("callHelper.title")}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Left Panel - Input Form */}
        <Card className="glass-card border-0 rounded-3xl overflow-hidden shadow-lg">
          <div className="bg-surface-2 border-b border-border p-4 sm:p-6" dir={dir}>
            <h2 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2 text-start">
              <MessageCircle className="size-5 sm:size-6 text-primary shrink-0" />
              {t("callHelper.form.title")}
            </h2>
          </div>
          <CardContent className="p-4 sm:p-6 lg:p-8 space-y-5" dir={dir}>
            {/* Customer Name */}
            <div className="space-y-2">
              <Label htmlFor="customerName" className="block text-start text-foreground font-semibold text-sm">
                {t("callHelper.form.customerName")}
              </Label>
              <Input
                id="customerName"
                type="text"
                placeholder={t("callHelper.form.customerNamePlaceholder")}
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="text-start glass-panel border focus:border-primary rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground transition-all"
              />
            </div>

            {/* Entity Type */}
            <div className="space-y-2">
              <Label htmlFor="entityType" className="block text-start text-foreground font-semibold text-sm">
                {t("callHelper.form.entityType")}
              </Label>
              <Select
                value={selectedEntityKey || undefined}
                onValueChange={setEntityType}
                dir={dir}
              >
                <SelectTrigger
                  id="entityType"
                  className="glass-panel border focus:border-primary rounded-xl px-4 py-3 text-foreground text-start [&>span]:text-start"
                >
                  <SelectValue placeholder={t("callHelper.form.entityPlaceholder")}>
                    {selectedEntityKey ? tEntity(t, selectedEntityKey) : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent
                  className="glass-card"
                  dir={dir}
                >
                  {ENTITY_KEYS.map((key) => (
                    <SelectItem
                      key={key}
                      value={key}
                      className="cursor-pointer rounded-lg text-start"
                    >
                      {tEntity(t, key)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Problem Summary */}
            <div className="space-y-2">
              <Label htmlFor="problemSummary" className="block text-start text-foreground font-semibold text-sm">
                {t("callHelper.form.problemSummary")}
              </Label>
              <Textarea
                id="problemSummary"
                placeholder={t("callHelper.form.problemPlaceholder")}
                value={problemSummary}
                onChange={(e) => setProblemSummary(e.target.value)}
                className="text-start glass-panel border focus:border-primary rounded-xl px-4 py-3 min-h-[100px] text-foreground placeholder:text-muted-foreground resize-none transition-all"
              />
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={!customerName || !entityType || !problemSummary}
              className={`w-full group relative overflow-hidden rounded-xl py-3.5 transition-all duration-300 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed ${
                isGenerating
                  ? "bg-primary"
                  : "bg-primary text-primary-foreground hover:opacity-95 active:scale-[0.98]"
              }`}
            >
              {isGenerating && (
                <div className="absolute inset-0 bg-primary/20 animate-pulse" />
              )}
              <div className="relative flex items-center justify-center gap-2.5 text-white font-bold text-sm">
                <Wand2 className={`size-4 ${isGenerating ? "animate-spin" : ""}`} />
                <span>{isGenerating ? t("callHelper.form.generating") : t("callHelper.form.generate")}</span>
              </div>
            </button>

            {thinkingSteps.length > 0 && (
              <CallHelperThinkingVisualization steps={thinkingSteps} />
            )}
          </CardContent>
        </Card>

        {/* Right Panel - Generated Output */}
        <Card className="glass-card border-0 rounded-3xl overflow-hidden shadow-lg">
          <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 dark:from-blue-500/5 dark:to-indigo-500/5 p-4 sm:p-6 border-b">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-foreground">{t("callHelper.output.title")}</h2>
                {showGeneratedOutput && !isLowConfidence && (
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className="p-2 hover:bg-accent/50 rounded-lg transition-all"
                        >
                          <HelpCircle className="size-4 text-primary" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent 
                        side="bottom" 
                        className="glass-card border p-3 max-w-sm"
                        dir="rtl"
                      >
                        <div className="space-y-2 text-right">
                          <p className="text-xs font-semibold text-foreground">
                            {t("callHelper.output.whyTitle")}
                          </p>
                          {matchedProblem?.why?.trim() ? (
                            <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                              {matchedProblem.why.trim()}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              {t("callHelper.output.whyEmpty")}
                            </p>
                          )}
                          <button
                            onClick={() => {
                              if (ENABLE_AI) {
                                setShowWhyPopup(false);
                                setShowRafeeqChat(true);
                              } else {
                                setShowRafeeqChat(false);
                                setShowWhyPopup(true);
                              }
                            }}
                            className="w-full px-3 py-2 text-xs bg-primary text-primary-foreground text-white rounded-lg hover:opacity-95 transition-all font-medium shadow-md flex items-center justify-center gap-1.5"
                          >
                            <Info className="size-3" />
                            {t("callHelper.output.moreDetails")}
                          </button>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              {isAlternativeFormat && (
                <Badge className="bg-primary text-primary-foreground text-white border-0 shadow-md text-xs">
                  {t("callHelper.output.alternativeBadge")}
                </Badge>
              )}
            </div>
          </div>
          <CardContent className="p-4 sm:p-6 lg:p-8 space-y-4" dir={dir}>
            {/* ============ GRAY AREA WARNING (shows when confidence < 40%) ============ */}
            {isLowConfidence && (
              <div className="glass-panel border-2 border-orange-500/50 dark:border-orange-400/50 rounded-xl p-4 space-y-3 bg-orange-50/50 dark:bg-orange-950/20">
                <div className="flex items-start gap-3 text-right">
                  <AlertTriangle className="size-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <p className="text-sm font-semibold text-orange-900 dark:text-orange-300">
                      الوصف غير واضح بما يكفي
                    </p>
                    <p className="text-xs text-orange-800 dark:text-orange-400">
                      ساعدنا بتحديد نوع المشكلة للحصول على نتائج أفضل وأكثر دقة
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowGrayAreaDialog(true)}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  <ListFilter className="size-4" />
                  <span>حدد نوع المشكلة</span>
                </button>
              </div>
            )}

            {/* ============ DESCRIPTION MATCH INDICATOR (shows above generated text box) ============ */}
            {/* Shows either descriptionMatchPercentage OR confidenceScore */}
            {showGeneratedOutput && !isLowConfidence && (
              <div className={`glass-panel rounded-xl p-3 border-2 ${
                // If we have description match, use it; otherwise use confidence score
                descriptionMatchPercentage > 40 ? (
                  descriptionMatchPercentage >= 90 
                    ? 'border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20' 
                    : descriptionMatchPercentage >= 80 
                    ? 'border-primary/30 bg-primary-soft'
                    : 'border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20'
                ) : (
                  // Use confidence score colors
                  confidenceScore >= 90
                    ? 'border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20'
                    : confidenceScore >= 80
                    ? 'border-primary/30 bg-primary-soft'
                    : 'border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20'
                )
              }`}>
                <div className="flex items-center justify-between text-right">
                  <div className="flex items-center gap-2">
                    <div className={`size-2 rounded-full animate-pulse ${
                      descriptionMatchPercentage > 40 ? (
                        descriptionMatchPercentage >= 90 
                          ? 'bg-emerald-500' 
                          : descriptionMatchPercentage >= 80 
                          ? 'bg-primary'
                          : 'bg-yellow-500'
                      ) : (
                        confidenceScore >= 90
                          ? 'bg-emerald-500'
                          : confidenceScore >= 80
                          ? 'bg-primary'
                          : 'bg-yellow-500'
                      )
                    }`} />
                    <span className={`text-xs font-semibold ${
                      descriptionMatchPercentage > 40 ? (
                        descriptionMatchPercentage >= 90 
                          ? 'text-emerald-700 dark:text-emerald-400' 
                          : descriptionMatchPercentage >= 80 
                          ? 'text-primary'
                          : 'text-yellow-700 dark:text-yellow-400'
                      ) : (
                        confidenceScore >= 90
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : confidenceScore >= 80
                          ? 'text-primary'
                          : 'text-yellow-700 dark:text-yellow-400'
                      )
                    }`}>
                      {descriptionMatchPercentage > 40 ? (
                        descriptionMatchPercentage >= 90 
                          ? 'تطابق ممتاز' 
                          : descriptionMatchPercentage >= 80 
                          ? 'تطابق جيد'
                          : 'تطابق متوسط'
                      ) : (
                        confidenceScore >= 90
                          ? 'دقة ممتازة'
                          : confidenceScore >= 80
                          ? 'دقة جيدة'
                          : 'دقة متوسطة'
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isMatchedResponse && descriptionMatchPercentage > 40 && (
                      <Badge className="bg-primary/10 text-primary border-0 text-[10px]">
                        رد جاهز
                      </Badge>
                    )}
                    <span className={`font-bold text-sm ${
                      descriptionMatchPercentage > 40 ? (
                        descriptionMatchPercentage >= 90 
                          ? 'text-emerald-600 dark:text-emerald-400' 
                          : descriptionMatchPercentage >= 80 
                          ? 'text-primary'
                          : 'text-yellow-600 dark:text-yellow-400'
                      ) : (
                        confidenceScore >= 90
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : confidenceScore >= 80
                          ? 'text-primary'
                          : 'text-yellow-600 dark:text-yellow-400'
                      )
                    }`}>
                      {descriptionMatchPercentage > 40 ? descriptionMatchPercentage : confidenceScore}%
                    </span>
                  </div>
                </div>
                {matchedProblem && descriptionMatchPercentage > 40 && (
                  <div className="mt-2 pt-2 border-t border-current/10">
                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="text-[10px] text-muted-foreground text-right cursor-help truncate">
                            مطابق مع: {matchedProblem.description}
                          </p>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="glass-card border max-w-sm" dir="rtl">
                          <div className="space-y-1 text-right">
                            <p className="text-xs font-semibold text-foreground">المشكلة المسجلة:</p>
                            <p className="text-xs text-muted-foreground">{matchedProblem.description}</p>
                            <div className="flex items-center gap-2 pt-1">
                              <Badge className="bg-primary/10 text-primary border-0 text-[10px]">
                                {matchedProblem.category}
                              </Badge>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                matchedProblem.priority === 'high' 
                                  ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                                  : matchedProblem.priority === 'medium'
                                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400'
                                  : 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400'
                              }`}>
                                {matchedProblem.priority === 'high' ? 'أولوية عالية' : matchedProblem.priority === 'medium' ? 'أولوية متوسطة' : 'أولوية منخفضة'}
                              </span>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}
              </div>
            )}

            {/* Generated response — يظهر بعد انتهاء عبارات التحليل */}
            <div
              className={`relative ${isLowConfidence ? "pointer-events-none" : ""}`}
            >
              {isAnalysisInProgress ? (
                <div
                  className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-primary/30 bg-primary/[0.06] px-4 py-14 min-h-[240px]"
                  role="status"
                  aria-live="polite"
                >
                  <Wand2 className="size-8 text-primary animate-spin" aria-hidden />
                  <p className="text-sm font-semibold text-muted-foreground">
                    {t("callHelper.form.generating")}
                  </p>
                </div>
              ) : showGeneratedOutput ? (
                <div
                  className={`text-start rounded-xl border border-border/80 bg-card/40 shadow-sm overflow-hidden ${
                    isLowConfidence ? "blur-sm select-none" : ""
                  }`}
                  dir={dir}
                >
                  <div className="border-b border-border/60 bg-muted/25 px-4 sm:px-5 py-4 space-y-3.5">
                    <div className="space-y-1">
                      <p className="text-[11px] font-bold text-muted-foreground tracking-wide">
                        اسم العميل
                      </p>
                      <p className="text-sm sm:text-[15px] font-semibold text-foreground leading-snug">
                        {customerName.trim() || "—"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-bold text-muted-foreground tracking-wide">
                        نوع الجهة
                      </p>
                      <p className="text-sm sm:text-[15px] font-semibold text-foreground leading-snug">
                        {selectedEntityKey ? tEntity(t, selectedEntityKey) : "—"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-bold text-muted-foreground tracking-wide">
                        يستفسر عن
                      </p>
                      <p className="text-sm sm:text-[15px] font-semibold text-foreground leading-snug whitespace-pre-wrap break-words">
                        {problemSummary.trim() || "—"}
                      </p>
                    </div>
                  </div>
                  <div className="px-4 sm:px-5 py-4 space-y-3 bg-background/60">
                    <p className="text-[11px] font-bold text-primary/90 border-r-2 border-primary pr-2 -mr-0.5">
                      تم إفادة العميل بالتالي:
                    </p>
                    <div className="rounded-lg border border-border/70 bg-muted/20 px-3 sm:px-4 py-3 min-h-[180px]">
                      <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-foreground m-0 text-start">
                        {clientBriefingText}
                      </pre>
                    </div>
                  </div>
                </div>
              ) : (
                <Textarea
                  value={generatedText}
                  readOnly
                  dir={dir}
                  placeholder={t('callHelper.output.placeholder')}
                  className={`text-start glass-panel border rounded-xl px-4 py-3 min-h-[240px] resize-none text-foreground placeholder:text-muted-foreground transition-all ${
                    isLowConfidence ? "blur-sm select-none" : ""
                  }`}
                />
              )}
              {isLowConfidence && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/5 rounded-xl">
                  <div className="text-center space-y-2">
                    <AlertTriangle className="size-8 text-orange-500 mx-auto" />
                    <p className="text-sm font-semibold text-muted-foreground">حدد نوع المشكلة أولاً</p>
                  </div>
                </div>
              )}
            </div>

            {showGeneratedOutput && !isLowConfidence && (
              <>
                {/* Copy Button */}
                <button
                  type="button"
                  onClick={handleCopy}
                  title="نسخ الصيغة المعروضة"
                  className={`w-full py-3 rounded-xl transition-all duration-300 font-semibold flex items-center justify-center gap-2 shadow-md text-sm ${
                    isCopied
                      ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white"
                      : "glass-panel hover:bg-accent/50 text-foreground border"
                  }`}
                >
                  {isCopied ? (
                    <>
                      <CheckCircle2 className="size-4" />
                      <span>تم النسخ بنجاح!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-4" />
                      <span>نسخ النص</span>
                    </>
                  )}
                </button>

                {/* Action Buttons */}
                {/* 
                  NEW LOGIC based on scoring thresholds:
                  - >= 80%: Direct Answer - Show ONLY "أفدتك؟" button
                  - >= 50% and < 80%: Show Advanced + other solution - Show ALL 3 buttons
                  - < 50%: Gray Area - handled above with warning
                */}
                {isDirectAnswerRoute ? (
                  /* ============ DIRECT ANSWER ROUTE (>= 80%) ============ */
                  /* Only show "أفدتك؟" button */
                  <div className="flex justify-center">
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={openTeachRafeeqFromExperience}
                            className="w-full max-w-xs py-3 rounded-xl transition-all duration-300 font-semibold flex items-center justify-center gap-2 shadow-md glass-panel hover:bg-accent/50 border"
                          >
                            <ThumbsUp className="size-5 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-sm text-emerald-700 dark:text-emerald-300">أفدتك؟</span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="border-2 border-border bg-gray-900 dark:bg-gray-100 shadow-xl">
                          <p className="text-xs text-gray-100 dark:text-gray-900 font-medium">
                            {t('callHelper.feedback.helpedTooltip')}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                ) : showAllButtons ? (
                  /* ============ SHOW ADVANCED + OTHER SOLUTION (>= 50% and < 80%) ============ */
                  /* Show all 3 buttons */
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    <button
                      onClick={() => {
                        setActiveButton(activeButton === "retry" ? null : "retry");
                        handleGenerateAlternative();
                      }}
                      className={`py-2.5 sm:py-3 rounded-xl transition-all duration-300 font-semibold flex flex-col items-center justify-center gap-1 shadow-md ${
                        activeButton === "retry"
                          ? "bg-primary text-primary-foreground text-white"
                          : "glass-panel hover:bg-accent/50 border"
                      }`}
                    >
                      <RefreshCcw className={`size-4 ${activeButton === "retry" ? "rotate-180" : ""} transition-transform ${activeButton === "retry" ? "" : "text-primary"}`} />
                      <span className={`text-[10px] sm:text-xs ${activeButton === "retry" ? "" : "text-primary"}`}>صيغة أخرى</span>
                    </button>

                    {/* ============ ADVANCED MODE BUTTON ============ */}
                    <button
                            onClick={handleAdvancedModeToggle}
                            className={`py-2.5 sm:py-3 rounded-xl transition-all duration-300 font-semibold flex flex-col items-center justify-center gap-1 shadow-md relative ${
                                activeButton === "advanced"
                                  ? "bg-primary text-primary-foreground text-white"
                                  : "glass-panel hover:bg-accent/50 border"
                            }`}
                          >
                            {isAdvancedModeEnabled && (
                              <div className="absolute -top-1 -right-1 size-3 bg-primary rounded-full border-2 border-background" />
                            )}
                            <Sliders className={`size-4 ${activeButton === "advanced" ? "rotate-12" : ""} transition-transform ${activeButton === "advanced" ? "" : "text-blue-600 dark:text-blue-400"}`} />
                            <span className={`text-[10px] sm:text-xs ${activeButton === "advanced" ? "" : "text-blue-700 dark:text-blue-300"}`}>وضع متقدم</span>
                    </button>

                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={openTeachRafeeqFromExperience}
                            className="py-2.5 sm:py-3 rounded-xl transition-all duration-300 font-semibold flex flex-col items-center justify-center gap-1 shadow-md glass-panel hover:bg-accent/50 border"
                          >
                            <ThumbsUp className="size-4 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-[10px] sm:text-xs text-emerald-700 dark:text-emerald-300">أفدتك؟</span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="border-2 border-border bg-gray-900 dark:bg-gray-100 shadow-xl">
                          <p className="text-xs text-gray-100 dark:text-gray-900 font-medium">
                            {t('callHelper.feedback.helpedTooltip')}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                ) : null}

                {/* ============ ADVANCED MODE PANEL ============ */}
                {/* Shows when advanced mode is active */}
                {activeButton === "advanced" && isAdvancedModeEnabled && !isHighConfidenceAnswer && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    {selectedProblemType && (
                      <div className="flex items-center justify-between text-xs glass-panel rounded-lg p-3 border">
                        <span className="text-muted-foreground">نوع المشكلة المحدد:</span>
                        <Badge className="bg-primary/10 text-primary border-0">
                          {grayAreaSettings.questions.find(q => q.id === selectedProblemType)?.title || PROBLEM_TYPES.find(t => t.id === selectedProblemType)?.name || 'عام'}
                        </Badge>
                      </div>
                    )}

                    {/* Advanced Flow Panel */}
                    <AdvancedFlowPanelV2
                      routes={routes}
                      steps={steps}
                      problemDescription={problemSummary}
                      isGrayAreaMode={wasGrayAreaResolved} // true = Gray Area (< 50%), false = Advanced Mode (50-79%)
                      initialFilteredRouteIds={targetedRouteIds}
                      onFlowComplete={async (result) => {
                        console.log('🏁 Advanced Flow Complete:', result);
                        
                        // ✅ NOW update confidence score to 100% (flow completed successfully)
                        setConfidenceScore(100);
                        
                        // Get the last SubCondition to generate the response
                        const lastStep = result.completedSteps[result.completedSteps.length - 1];
                        const lastSubCondition = lastStep.selectedSubCondition;
                        
                        console.log('📝 Generating response based on last SubCondition:', {
                          name: lastSubCondition.name,
                          action: lastSubCondition.action,
                          actionDetails: lastSubCondition.actionDetails,
                        });
                        
                        // Generate response based on final action
                        // Common variables
                        const entityTypeArabic = entityTypeApi;
                        const problemTypeName = selectedProblemType 
                          ? (PROBLEM_TYPES.find(t => t.id === selectedProblemType)?.name || '')
                          : '';
                        const routeNames = result.completedSteps
                          .map((completedStep) => {
                            const matchedStep = steps.find((stepItem) => stepItem.id === completedStep.stepId);
                            const matchedRoute = routes.find((routeItem) => routeItem.id === matchedStep?.routeId);
                            return matchedRoute?.name || '';
                          })
                          .filter(Boolean);
                        const stepNames = result.completedSteps.map((completedStep) => completedStep.stepName).filter(Boolean);
                        const subConditionNames = result.completedSteps
                          .map((completedStep) => completedStep.selectedSubCondition?.name || '')
                          .filter(Boolean);

                        const fillFlowTemplate = (
                          template: string,
                          vars: Record<string, string>,
                        ) =>
                          template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? '');

                        const flowGuidanceText =
                          resolveFlowGuidanceFromFlowResult(
                            result,
                            lastSubCondition,
                          ) || AR_CALL_TEMPLATES.defaultSolution;

                        const applyGuidanceToBriefingBox = () => {
                          setFlowBriefingGuidance(flowGuidanceText);
                          setIsMatchedResponse(false);
                          setMatchedProblem(null);
                        };

                        if (result.finalAction === 'direct_answer') {
                          applyGuidanceToBriefingBox();
                          const newGeneratedText = fillFlowTemplate(
                            AR_CALL_TEMPLATES.flowDirectAnswer,
                            {
                              customerName,
                              entityType: entityTypeArabic,
                              problemType: problemTypeName || '—',
                              condition: lastSubCondition.name,
                              solution: flowGuidanceText,
                            },
                          );
                          setGeneratedText(newGeneratedText);
                          setDescriptionMatchPercentage(0);
                          void logCallToBackend({
                            generatedResponse: newGeneratedText,
                            status: 'resolved',
                            flowResult: result,
                            finalDisplayScore: 100,
                          });
                          result.completedSteps.forEach((step) => {
                            setDebugFlowLog(prev => [
                              ...prev,
                              {
                                step: step.stepName,
                                subCondition: step.selectedSubCondition.name,
                                action: step.selectedSubCondition.action,
                                timestamp: new Date(),
                              },
                            ]);
                          });
                          return;
                        }

                        /** إيقاف المسار + حل إجباري: توجيه الحل من الإعدادات وليس قاعدة المعرفة */
                        if (result.finalAction === 'force_solution') {
                          applyGuidanceToBriefingBox();
                          const newGeneratedText = fillFlowTemplate(
                            AR_CALL_TEMPLATES.flowForceSolution,
                            {
                              customerName,
                              entityType: entityTypeArabic,
                              problemType: problemTypeName || '—',
                              condition: lastSubCondition.name,
                              solution: flowGuidanceText,
                            },
                          );
                          setGeneratedText(newGeneratedText);
                          setDescriptionMatchPercentage(0);
                          void logCallToBackend({
                            generatedResponse: newGeneratedText,
                            status: 'resolved',
                            flowResult: result,
                            finalDisplayScore: 100,
                          });
                          result.completedSteps.forEach((step) => {
                            setDebugFlowLog(prev => [
                              ...prev,
                              {
                                step: step.stepName,
                                subCondition: step.selectedSubCondition.name,
                                action: step.selectedSubCondition.action,
                                timestamp: new Date(),
                              },
                            ]);
                          });
                          return;
                        }

                        if (result.finalAction === 'escalation') {
                          const escalationGuidance =
                            resolveFlowGuidanceFromFlowResult(
                              result,
                              lastSubCondition,
                            ) || AR_CALL_TEMPLATES.defaultEscalation;
                          setFlowBriefingGuidance(escalationGuidance);
                          setIsMatchedResponse(false);
                          setMatchedProblem(null);
                          const newGeneratedText = fillFlowTemplate(
                            AR_CALL_TEMPLATES.flowEscalation,
                            {
                              customerName,
                              entityType: entityTypeArabic,
                              problemType: problemTypeName || '—',
                              condition: lastSubCondition.name,
                              solution: escalationGuidance,
                            },
                          );
                          setGeneratedText(newGeneratedText);
                          setDescriptionMatchPercentage(0);
                          void logCallToBackend({
                            generatedResponse: newGeneratedText,
                            status: 'escalated',
                            flowResult: result,
                            finalDisplayScore: 100,
                          });
                          result.completedSteps.forEach((step) => {
                            setDebugFlowLog(prev => [
                              ...prev,
                              {
                                step: step.stepName,
                                subCondition: step.selectedSubCondition.name,
                                action: step.selectedSubCondition.action,
                                timestamp: new Date(),
                              },
                            ]);
                          });
                          return;
                        }

                        const enhancedSearchResult = await rerunMatchWithFlowContext({
                          routeNames,
                          stepNames,
                          subConditionNames,
                          problemTypeName,
                        });
                        if (enhancedSearchResult?.isMatched && enhancedSearchResult.problem) {
                          const matchedText = getFormattedResponse(
                            enhancedSearchResult.problem,
                            customerName,
                            entityTypeApi,
                          );
                          setFlowBriefingGuidance(null);
                          setGeneratedText(matchedText);
                          setDescriptionMatchPercentage(enhancedSearchResult.matchPercentage);
                          setConfidenceScore(100);
                          setMatchedProblem({
                            id: enhancedSearchResult.problem.id,
                            title: enhancedSearchResult.problem.title,
                            description: enhancedSearchResult.problem.description,
                            response: enhancedSearchResult.problem.solution,
                            keywords: enhancedSearchResult.problem.keywords,
                            category: enhancedSearchResult.problem.category,
                            confidence: enhancedSearchResult.problem.confidence,
                            why: (enhancedSearchResult.problem.why || '').trim(),
                          } as RegisteredProblem);
                          setIsMatchedResponse(true);
                          const rematchScore = enhancedSearchResult.matchPercentage;
                          const rematchConfirmed = rematchScore >= directAnswerThreshold;
                          void logCallToBackend({
                            generatedResponse: matchedText,
                            status:
                              result.finalAction === 'force_solution' || rematchConfirmed
                                ? 'resolved'
                                : 'pending',
                            matchedCaseDbId: enhancedSearchResult.problem.id,
                            matchedCaseCode: enhancedSearchResult.problem.description,
                            matchedAt: new Date().toISOString(),
                            category: enhancedSearchResult.problem.category?.trim() || null,
                            flowResult: result,
                            finalDisplayScore: analyticsFinalScore(
                              rematchScore,
                              directAnswerThreshold,
                            ),
                          });
                          result.completedSteps.forEach((step) => {
                            setDebugFlowLog(prev => [
                              ...prev,
                              {
                                step: step.stepName,
                                subCondition: step.selectedSubCondition.name,
                                action: step.selectedSubCondition.action,
                                timestamp: new Date(),
                              },
                            ]);
                          });
                          return;
                        }
                        setIsMatchedResponse(false);
                        setMatchedProblem(null);
                        setDescriptionMatchPercentage(0);
                        setFlowBriefingGuidance(null);

                        // Continue action — generate success message
                        const continueMessage = fillFlowTemplate(
                          AR_CALL_TEMPLATES.flowContinue,
                          {
                            customerName,
                            entityType: entityTypeArabic,
                            problemType: problemTypeName || '—',
                            condition: lastSubCondition.name,
                            solution: lastSubCondition.name,
                          },
                        );

                        setGeneratedText(continueMessage);
                        void logCallToBackend({
                          generatedResponse: continueMessage,
                          status: 'pending',
                          flowResult: result,
                          finalDisplayScore: 100,
                        });

                        // Add to flow log
                        result.completedSteps.forEach((step) => {
                          setDebugFlowLog(prev => [
                            ...prev,
                            {
                              step: step.stepName,
                              subCondition: step.selectedSubCondition.name,
                              action: step.selectedSubCondition.action,
                              timestamp: new Date(),
                            },
                          ]);
                        });
                      }}
                      onDebugUpdate={(data) => {
                        setDebugActiveRoute(data.activeRoute);
                        setDebugCurrentStep(data.currentStep);
                        setDebugSubCondition(data.subCondition);
                        setDebugAction(data.action);
                      }}
                    />
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ============ GRAY AREA WIZARD (Problem Type & Route Selection) ============ */}
      <GrayAreaWizard
        isOpen={showGrayAreaDialog}
        onClose={() => setShowGrayAreaDialog(false)}
        isDarkMode={isDarkMode}
        onComplete={async (flowPath: FlowPath) => {
          console.log('🎯 Gray Area Wizard Complete:', flowPath);
          
          // Update states
          setSelectedProblemType(flowPath.questionId);
          setWasGrayAreaResolved(true);
          setConfidenceScore(100);
          setShowGrayAreaDialog(false);
          
          // Show loading state
          setIsGenerating(true);
          setThinkingSteps([]);
          setGeneratedText('');
          setFlowBriefingGuidance(null);
          try {
          await appendThinkingStep(
            "رفيق يربط نوع المشكلة مع المسارات والخطوات التي اخترتها.",
            520,
            "MERGING PROBLEM TYPE WITH SELECTED ROUTE PATH",
          );

          // Optional AI simulation (can be disabled)
          if (ENABLE_AI) {
            await simulateAIProcessing();
          }
          
          // Generate response based on flow path
          const entityTypeArabic = entityTypeApi;
          const problemTypeName = flowPath.questionTitle;
          const routeNames = flowPath.selectedSteps.map((item) => item.route.name).filter(Boolean);
          const stepNames = flowPath.selectedSteps.map((item) => item.step.name).filter(Boolean);
          const subConditionNames = flowPath.selectedSteps.map((item) => item.subCondition.name).filter(Boolean);
          if (flowPath.finalAction === 'direct_answer') {
            await appendThinkingStep(
              "بناء الرد من خطوة الإجابة المباشرة في المسار المختار.",
              460,
              "COMPOSING DIRECT ANSWER FROM FLOW NODE",
            );
            const directAnswerText = flowPath.finalStepDescription || 'تم تقديم الإجابة المباشرة';
            const generatedResponse = `السلام عليكم ورحمة الله وبركاته،\n\nعزيزي/عزيزتي ${customerName}،\n\nتم استلام بلاغكم بخصوص: ${problemTypeName}\nنوع الجهة: ${entityTypeArabic}\n\n💡 توجيهات الحل:\n${directAnswerText}\n\nتفاصيل المشكلة:\n${problemSummary}\n\nتمت المعالجة بنجاح.\n\nمع تحياتنا،`;
            setGeneratedText(generatedResponse);
            setIsMatchedResponse(false);
            setMatchedProblem(null);
            setDescriptionMatchPercentage(0);
            void logCallToBackend({
              generatedResponse,
              status: 'resolved',
              flowResult: flowPath,
              finalDisplayScore: 100,
            });
            setIsGenerating(false);
            flowPath.selectedSteps.forEach((item) => {
              setDebugFlowLog(prev => [
                ...prev,
                {
                  step: item.step.name,
                  subCondition: item.subCondition.name,
                  action: item.subCondition.action,
                  timestamp: new Date(),
                },
              ]);
            });
            return;
          }
          await appendThinkingStep(
            "رفيق يعيد المطابقة من قاعدة الحالات مع موسّع السياق بعد المسار.",
            540,
            "RESCORING WITH EXPANDED FLOW CONTEXT",
          );
          const enhancedSearchResult = await rerunMatchWithFlowContext({
            routeNames,
            stepNames,
            subConditionNames,
            problemTypeName,
          });
          if (enhancedSearchResult) {
            await appendPostSearchThinking(enhancedSearchResult, { includeGrayAreaHint: false });
          }
          if (
            flowPath.finalAction !== 'escalation'
            && enhancedSearchResult?.isMatched
            && enhancedSearchResult.problem
          ) {
            const matchedText = getFormattedResponse(
              enhancedSearchResult.problem,
              customerName,
              entityTypeApi,
            );
            setGeneratedText(matchedText);
            setDescriptionMatchPercentage(enhancedSearchResult.matchPercentage);
            setConfidenceScore(100);
            setMatchedProblem({
              id: enhancedSearchResult.problem.id,
              title: enhancedSearchResult.problem.title,
              description: enhancedSearchResult.problem.description,
              response: enhancedSearchResult.problem.solution,
              keywords: enhancedSearchResult.problem.keywords,
              category: enhancedSearchResult.problem.category,
              confidence: enhancedSearchResult.problem.confidence,
              why: (enhancedSearchResult.problem.why || '').trim(),
            } as RegisteredProblem);
            setIsMatchedResponse(true);
            void logCallToBackend({
              generatedResponse: matchedText,
              status: flowPath.finalAction === 'force_solution' ? 'resolved' : 'pending',
              matchedCaseDbId: enhancedSearchResult.problem.id,
              matchedCaseCode: enhancedSearchResult.problem.description,
              matchedAt: new Date().toISOString(),
              flowResult: flowPath,
              finalDisplayScore: analyticsFinalScore(
                enhancedSearchResult.matchPercentage,
                directAnswerThreshold,
              ),
            });
            setIsGenerating(false);
            flowPath.selectedSteps.forEach((item) => {
              setDebugFlowLog(prev => [
                ...prev,
                {
                  step: item.step.name,
                  subCondition: item.subCondition.name,
                  action: item.subCondition.action,
                  timestamp: new Date(),
                },
              ]);
            });
            return;
          }
          setIsMatchedResponse(false);
          setMatchedProblem(null);
          setDescriptionMatchPercentage(0);

          if (flowPath.finalAction === "force_solution") {
            await appendThinkingStep(
              "اعتماد نص الرد وفق إجراء «فرض الحل» المختار في المسار.",
              460,
              "APPLYING FORCED SOLUTION MESSAGE FROM ROUTE",
            );
          } else if (flowPath.finalAction === "escalation") {
            await appendThinkingStep(
              "اعتماد نص الرد وفق توجيه «تصعيد» المختار في المسار (لا إحالة آلية).",
              460,
              "APPLYING ESCALATION MESSAGE FROM ROUTE",
            );
          } else {
            await appendThinkingStep(
              "اعتماد نص الرد وفق إجراء المتابعة في المسار.",
              440,
              "APPLYING CONTINUE MESSAGE FROM ROUTE",
            );
          }
          
          // Build flow path description
          const flowPathText = flowPath.selectedSteps
            .map(s => `${s.route.name} > ${s.step.name} > ${s.subCondition.name}`)
            .join('\\n');
          
          let generatedResponse = '';
          
          if (flowPath.finalAction === 'force_solution') {
            generatedResponse = `السلام عليكم ورحمة الله وبركاته،\\n\\nعزيزي/عزيزتي ${customerName}،\\n\\nتم استلام بلاغكم بخصوص: ${problemTypeName}\\nنوع الجهة: ${entityTypeArabic}\\n\\n`;
            
            if (flowPath.finalStepDescription) {
              generatedResponse += `✅ ${flowPath.finalStepDescription}\\n\\n`;
            }
            
            generatedResponse += `تفاصيل المشكلة:\\n${problemSummary}\\n\\nتم معالجة طلبكم بنجاح. في حال وجود أي استفسار، لا تترددوا بالتواصل معنا.\\n\\nمع تحياتنا،`;
            
          } else if (flowPath.finalAction === 'escalation') {
            generatedResponse = ESCALATION_GUIDANCE_RESPONSE;
          } else {
            // continue action
            generatedResponse = `السلام عليكم ورحمة الله وبركاته،\\n\\nعزيزي/عزيزتي ${customerName}،\\n\\nتم استلام بلاغكم بخصوص: ${problemTypeName}\\nنوع الجهة: ${entityTypeArabic}\\n\\n`;
            
            if (flowPath.finalStepDescription) {
              generatedResponse += `${flowPath.finalStepDescription}\\n\\n`;
            }
            
            generatedResponse += `تفاصيل المشكلة:\\n${problemSummary}\\n\\nتمت المعالجة بنجاح.\\n\\nمع تحياتنا،`;
          }
          
          setGeneratedText(generatedResponse);
          void logCallToBackend({
            generatedResponse,
            status:
              flowPath.finalAction === "force_solution"
                ? "resolved"
                : flowPath.finalAction === "escalation"
                  ? "escalated"
                  : "pending",
            flowResult: flowPath,
            finalDisplayScore: 100,
          });
          setIsGenerating(false);
          
          // Add to flow log
          flowPath.selectedSteps.forEach((item) => {
            setDebugFlowLog(prev => [
              ...prev,
              {
                step: item.step.name,
                subCondition: item.subCondition.name,
                action: item.subCondition.action,
                timestamp: new Date(),
              },
            ]);
          });
          } finally {
            await new Promise<void>((r) => setTimeout(r, 480));
            setThinkingSteps([]);
          }
        }}
      />

      {/* Why Popup */}
      <Dialog open={showWhyPopup} onOpenChange={setShowWhyPopup}>
        <div className={isDarkMode ? 'dark' : ''}>
          <DialogContent className="glass-card max-w-md shadow-2xl" dir="rtl">
            <DialogHeader>
              <DialogTitle className="sr-only">سبب اختيار الصيغة</DialogTitle>
            </DialogHeader>
            <div className="text-right pt-0">
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {matchedProblem?.why?.trim() || "لا يوجد سبب محفوظ في حقل why لهذه الحالة."}
              </p>
            </div>
          </DialogContent>
        </div>
      </Dialog>

      {/* Rafeeq Chat */}
      <Dialog open={showRafeeqChat} onOpenChange={setShowRafeeqChat}>
        <div className={isDarkMode ? 'dark' : ''}>
          <DialogContent className="border-2 border-border max-w-2xl h-[600px] flex flex-col shadow-2xl bg-background dark:bg-gray-900" dir="rtl">
            <DialogHeader className="border-b border-border pb-4 bg-background dark:bg-gray-900">
              <DialogTitle className="text-right flex items-center gap-3 justify-end text-lg">
                <span className="text-foreground">محادثة رفيق</span>
                <div className="p-3 bg-primary rounded-xl shadow-lg border-2 border-primary/30">
                  <Bot className="size-6 text-white" />
                </div>
              </DialogTitle>
              <DialogDescription className="text-right text-muted-foreground text-sm">
                مساعدك الذكي للإجابة على استفساراتك
              </DialogDescription>
            </DialogHeader>

            {!isRafeeqActive ? (
              <div className="flex-1 flex items-center justify-center p-8 bg-background dark:bg-gray-900">
                <div className="text-center space-y-6">
                  <div className="mx-auto w-20 h-20 bg-primary rounded-full flex items-center justify-center shadow-2xl floating">
                    <Bot className="size-10 text-white" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-foreground">مرحباً بك!</h3>
                    <p className="text-sm text-muted-foreground">اضغط للبدء في المحادثة مع رفيق</p>
                  </div>
                  <button
                    onClick={() => setIsRafeeqActive(true)}
                    className="px-8 py-3.5 bg-primary text-primary-foreground text-white rounded-xl font-bold hover:opacity-95 transition-all flex items-center gap-3 mx-auto shadow-lg"
                  >
                    <Bot className="size-5" />
                    <span>تشغيل رفيق</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0 bg-background dark:bg-gray-900">
                <div className="flex-1 overflow-y-auto p-4 space-y-4 rounded-2xl mb-4 bg-gray-50 dark:bg-gray-800 border border-border">
                  <div className="flex items-start gap-3 justify-end">
                    <div className="p-4 rounded-2xl max-w-[80%] shadow-md bg-white dark:bg-gray-700 border border-border">
                      <p className="text-sm text-foreground">
                        مرحباً! أنا رفيق، مساعدك الذكي. كيف يمكنني مساعدتك؟
                      </p>
                    </div>
                    <div className="p-2 bg-primary rounded-full flex-shrink-0 shadow-lg">
                      <Bot className="size-5 text-white" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-border bg-background dark:bg-gray-900">
                  <button
                    onClick={() => {
                      if (chatMessage.trim()) {
                        setChatMessage("");
                      }
                    }}
                    disabled={!chatMessage.trim()}
                    className="p-3.5 bg-primary text-primary-foreground hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-lg"
                  >
                    <Send className="size-5" />
                  </button>
                  <Input
                    type="text"
                    placeholder="اكتب رسالتك هنا..."
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && chatMessage.trim()) {
                        setChatMessage("");
                      }
                    }}
                    className="flex-1 border rounded-xl px-4 py-3 text-right text-foreground placeholder:text-muted-foreground bg-white dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
              </div>
            )}
          </DialogContent>
        </div>
      </Dialog>

      {/* ============ DEBUG PANEL (Admin Only) ============ */}
      {isAdmin && (
        <DebugPanel
          activeRoute={debugActiveRoute}
          currentStep={debugCurrentStep}
          subCondition={debugSubCondition}
          action={debugAction}
          finalScore={descriptionMatchPercentage}
          flowLog={debugFlowLog}
          scoringBreakdown={debugScoringBreakdown}
        />
      )}
    </div>
  );
}