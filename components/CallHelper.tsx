import { useState, useEffect, useMemo } from "react";
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

import { useI18nLayout } from "../hooks/useI18nLayout";
import {
  ENTITY_KEYS,
  entityForApi,
  entityKeyFromValue,
  tEntity,
} from "../i18n/translations";

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
  const { t, dir, textAlign, textAlignBlock, justifyEnd, locale } = useI18nLayout();
  const ENABLE_AI = import.meta.env.VITE_ENABLE_AI === "true";

  const reportTemplate = (
    key:
      | "callHelper.templates.primary"
      | "callHelper.templates.alternative"
      | "callHelper.templates.flowDirectAnswer"
      | "callHelper.templates.flowEscalation"
      | "callHelper.templates.flowForceSolution"
      | "callHelper.templates.flowContinue"
      | "callHelper.templates.grayDirectAnswer"
      | "callHelper.templates.grayForceSolution"
      | "callHelper.templates.grayEscalation"
      | "callHelper.templates.grayContinue",
    params: Record<string, string>,
  ) => t(key, params);

  // =========================
  // Real call logging (for analytics)
  // =========================
  const logCallToBackend = async (params: {
    generatedResponse: string;
    status: "pending" | "resolved" | "escalated" | "closed";
    flowResult?: unknown;
    matchedCaseDbId?: string | null;
    matchedCaseCode?: string | null;
    matchedAt?: string | null;
    category?: string | null;
    /** سكور العرض الأخير (0–100) — للتحليلات والإفادات المؤكدة */
    finalDisplayScore?: number | null;
  }) => {
    try {
      const token = localStorage.getItem("token");
      if (!token || token === "local-auth-token") return;

      // Only log when we have the minimum required fields for CallLog
      if (!customerName || !entityType || !problemSummary) return;

      const response = await fetch("/api/calls", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customerName,
          entityType: apiEntityType,
          problemType: selectedProblemType || "general",
          problemSummary,
          // Category at log time enables the daily frequency bucket (used by the admin-only dashboard section). Empty string normalized to null.
          category: params.category && params.category.trim() ? params.category.trim() : null,
          matchedCase: params.matchedCaseDbId || null,
          matchedCaseCode: params.matchedCaseCode || null,
          matchedAt: params.matchedAt || null,
          flowResult: params.flowResult,
          generatedResponse: params.generatedResponse,
          status: params.status,
          ...(typeof params.finalDisplayScore === "number" &&
          Number.isFinite(params.finalDisplayScore)
            ? {
                finalDisplayScore: Math.min(
                  100,
                  Math.max(0, Math.round(params.finalDisplayScore)),
                ),
              }
            : {}),
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        console.warn("⚠️ Failed to save call log:", response.status, errorBody);
      }
    } catch (error) {
      // Don't block the UX for logging failures
      console.warn("⚠️ Failed to log call for analytics", error);
    }
  };
  const [customerName, setCustomerName] = useState("");
  const [entityType, setEntityType] = useState("");
  const entitySelectValue = entityKeyFromValue(entityType);
  const entityLabel = (value: string) => tEntity(t, value);
  const apiEntityType = entityForApi(entityType);
  const [problemDescription, setProblemDescription] = useState("");
  const [problemSummary, setProblemSummary] = useState("");

  useEffect(() => {
    if (!callHelperLaunch?.seed?.trim()) return;
    setProblemSummary(callHelperLaunch.seed.trim());
    onConsumeCallHelperLaunch?.();
  }, [callHelperLaunch?.nonce, callHelperLaunch?.seed, onConsumeCallHelperLaunch]);
  const [generatedText, setGeneratedText] = useState("");
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
    const userTypeHint = apiEntityType || '';
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
      setActiveButton(null);
      setWasGrayAreaResolved(false);
      setSelectedProblemType('');
      setDebugScoringBreakdown(null);
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
    setIsAlternativeFormat(false);

    // ✅ Reset Gray Area states when generating new response
    setWasGrayAreaResolved(false);
    setSelectedProblemType("");
    setIsAdvancedModeEnabled(false);
    setActiveButton(null);
    setDebugScoringBreakdown(null);

    try {
      // ============ NEW: Search real database only (no mock fallback) ============
      console.log('🔍 Searching knowledge base for:', problemSummary);
      const matcherOptions = buildMatcherOptions();
      const searchResult = await searchWithFallback(problemSummary, false, matcherOptions);
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
          apiEntityType
        );
        
        setGeneratedText(formattedText);
        // Forward the matched case category so the backend can update the
        // daily frequency bucket (used by the admin-only dashboard section).
        const matchedCategory = (searchResult.problem.category || '').trim();
        void logCallToBackend({
          generatedResponse: formattedText,
          status: "pending",
          matchedCaseDbId: searchResult.problem.id,
          matchedCaseCode: searchResult.problem.description,
          matchedAt: new Date().toISOString(),
          category: matchedCategory || null,
          finalDisplayScore: searchResult.matchPercentage,
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
        
        const generated = reportTemplate("callHelper.templates.primary", {
          customerName,
          entityType: entityLabel(entityType),
          problemSummary,
        });

        setGeneratedText(generated);
        void logCallToBackend({
          generatedResponse: generated,
          status: "pending",
          finalDisplayScore: searchResult.matchPercentage,
        });
        setDescriptionMatchPercentage(searchResult.matchPercentage);
        // Keep displayed score consistent with weighted keyword matching result
        setConfidenceScore(searchResult.matchPercentage);
        setMatchedProblem(null);
        setIsMatchedResponse(false);
      }
    } catch (error) {
      console.error('❌ Error during knowledge base search:', error);
      
      const generated = reportTemplate("callHelper.templates.primary", {
        customerName,
        entityType: entityLabel(entityType),
        problemSummary,
      });

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
      setIsGenerating(false);
    }
  };

  const handleGenerateAlternative = () => {
    setIsGenerating(true);
    setIsAlternativeFormat(true);

    const scoreSnapshot =
      descriptionMatchPercentage > 40
        ? descriptionMatchPercentage
        : confidenceScore;

    setTimeout(() => {
      const alternativeGenerated = reportTemplate("callHelper.templates.alternative", {
        customerName,
        entityType: entityLabel(entityType),
        problemSummary,
      });

      setGeneratedText(alternativeGenerated);
      void logCallToBackend({
        generatedResponse: alternativeGenerated,
        status: "pending",
        finalDisplayScore: Math.min(
          100,
          Math.max(0, Math.round(Number(scoreSnapshot) || 0)),
        ),
      });
      setIsGenerating(false);
    }, 500);
  };

  const handleCopy = () => {
    if (!generatedText?.trim()) return;
    const displayedForCopy =
      descriptionMatchPercentage > 40 ? descriptionMatchPercentage : confidenceScore;
    if (Math.round(displayedForCopy) < 100) return;
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
    window.dispatchEvent(
      new CustomEvent("app:navigate", {
        detail: {
          view: "teach-rafeeq",
          prefill: {
            entityType,
            problemDetails: problemSummary,
            correctInfo: dbResponse,
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
        t("callHelper.actions.immediate"),
        t("callHelper.actions.escalate"),
        t("callHelper.actions.followUp"),
      ],
      suggestedPriority: t("common.priority.highShort"),
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
  const isLowConfidence = !wasGrayAreaResolved && confidenceScore < grayAreaThreshold && generatedText;

  /**
   * Calculate the actual displayed score (for consistency)
   * Use descriptionMatchPercentage if > 40, otherwise use confidenceScore
   * This ensures button logic matches what user sees
   */
  const displayedScore = descriptionMatchPercentage > 40 ? descriptionMatchPercentage : confidenceScore;

  /**
   * NEW: Determine button visibility based on DISPLAYED score and settings thresholds
   * Uses directAnswerThreshold and showAdvancedThreshold from settings
   * >= directAnswerThreshold: Direct Answer route - Only show "أفدتك؟" button
   * >= showAdvancedThreshold and < directAnswerThreshold: Show Advanced + other solution - Show all buttons
   * < grayAreaThreshold: Gray Area - Show "حدد نوع المشكلة" warning
   * EXCEPTION: If wasGrayAreaResolved is true, always show all buttons
   */
  const isDirectAnswerRoute = !wasGrayAreaResolved && displayedScore >= directAnswerThreshold;
  const showAllButtons = wasGrayAreaResolved || (displayedScore >= showAdvancedThreshold && displayedScore < directAnswerThreshold);

  /** إظهار نص الصيغة الكامل فقط عند سكور العرض = 100٪ (بعد التوليد وغير Gray Area) */
  const isFullConfidenceDisplay = Math.round(displayedScore) >= 100;
  const isAnswerMaskedUntilFullScore = Boolean(
    generatedText?.trim() && !isLowConfidence && !isFullConfidenceDisplay,
  );

  /**
   * استنتاج فئة الحالة من وصف المشكلة عندما لا يوجد تطابق قاعدة معرفة،
   * بمطابقة نص الوصف مع أسماء الفئات المعرّفة على المسارات (مثال: "التأشيرة").
   */
  const inferredCategoryFromDescription = useMemo(() => {
    const text = problemSummary.trim();
    if (!text) return '';
    const candidates = new Set<string>();
    for (const route of routes) {
      if (!route.isActive) continue;
      for (const c of route.categories || []) {
        const t = (c || '').trim();
        if (t.length >= 2) candidates.add(t);
      }
    }
    const sorted = [...candidates].sort((a, b) => b.length - a.length);
    for (const cat of sorted) {
      if (descriptionImpliesCategory(text, cat)) return cat;
    }
    return '';
  }, [problemSummary, routes]);

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
      return selectedQuestionLinkedRoutes;
    }

    const resolvedCategory =
      (matchedProblem?.category || '').trim() || inferredCategoryFromDescription;
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

    const contextRoutes = getRoutesForContext({
      entityType: apiEntityType,
      category: resolvedCategory,
    });
    return contextRoutes.map((route) => route.id);
  }, [
    selectedQuestionLinkedRoutes,
    wasGrayAreaResolved,
    matchedProblem,
    inferredCategoryFromDescription,
    entityType,
    generatedText,
    displayedScore,
    showAdvancedThreshold,
    descriptionMatchPercentage,
    getRoutesForContext,
  ]);

  /** فئة السياق المعروضة في الوضع المتقدم (معرفة أو مستنتجة من الوصف) */
  const advancedCategoryScope = useMemo(() => {
    const cat =
      (matchedProblem?.category || '').trim() || inferredCategoryFromDescription || '';
    if (!cat) return null;
    const fromKb = Boolean((matchedProblem?.category || '').trim());
    return { category: cat, fromKb };
  }, [matchedProblem, inferredCategoryFromDescription]);

  const advancedCategoryScopeBanner = useMemo(() => {
    if (targetedRouteIds === undefined || !advancedCategoryScope) return null;
    return {
      title: t("callHelper.advanced.categoryScope", {
        category: advancedCategoryScope.category,
      }),
      subtitle: advancedCategoryScope.fromKb
        ? t("callHelper.advanced.sourceKb")
        : t("callHelper.advanced.sourceInferred"),
    };
  }, [targetedRouteIds, advancedCategoryScope, t]);

  const advancedScopedEmptyMessage = useMemo(() => {
    if (
      targetedRouteIds === undefined ||
      !advancedCategoryScope ||
      targetedRouteIds.length > 0
    ) {
      return null;
    }
    return advancedCategoryScope.fromKb
      ? t("callHelper.advanced.noRouteKb", {
          category: advancedCategoryScope.category,
        })
      : t("callHelper.advanced.noRouteInferred", {
          category: advancedCategoryScope.category,
        });
  }, [targetedRouteIds, advancedCategoryScope, t]);

  const liveRoutingMode = !generatedText
    ? null
    : isLowConfidence
      ? 'gray_area'
      : isDirectAnswerRoute
        ? 'direct_answer'
        : showAllButtons
          ? 'advanced_mode'
          : 'unknown';

  /**
   * Handle Advanced Mode toggle
   * TODO: Connect to decision tree backend when enabled
   */
  const displayScoreLabel = () => {
    if (descriptionMatchPercentage > 40) {
      if (descriptionMatchPercentage >= 90) return t("callHelper.match.excellent");
      if (descriptionMatchPercentage >= 80) return t("callHelper.match.good");
      return t("callHelper.match.fair");
    }
    if (confidenceScore >= 90) return t("callHelper.match.accuracyExcellent");
    if (confidenceScore >= 80) return t("callHelper.match.accuracyGood");
    return t("callHelper.match.accuracyFair");
  };

  const priorityLabel = (priority: string | undefined) => {
    if (priority === "high") return t("common.priority.high");
    if (priority === "medium") return t("common.priority.medium");
    return t("common.priority.low");
  };

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
    <div dir="rtl" className="space-y-6">
      {/* Hero Header */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 text-center shadow-lg border-2 border-border">
        <h1 className="text-2xl sm:text-4xl font-black gradient-text">{t("callHelper.title")}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Left Panel - Input Form */}
        <Card className="glass-card border-0 rounded-3xl overflow-hidden shadow-lg">
          <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 dark:from-cyan-500/5 dark:to-blue-500/5 p-4 sm:p-6 border-b">
            <h2 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
              <MessageCircle className="size-5 sm:size-6 text-primary" />
              {t("callHelper.form.title")}
            </h2>
          </div>
          <CardContent className="p-4 sm:p-6 lg:p-8 space-y-5">
            {/* Customer Name */}
            <div className="space-y-2">
              <Label htmlFor="customerName" className={`${textAlignBlock} text-foreground font-semibold text-sm`}>
                {t("callHelper.form.customerName")}
              </Label>
              <Input
                id="customerName"
                type="text"
                placeholder={t("callHelper.form.customerNamePlaceholder")}
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className={`${textAlign} glass-panel border focus:border-primary rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground transition-all`}
              />
            </div>

            {/* Entity Type */}
            <div className="space-y-2">
              <Label htmlFor="entityType" className={`${textAlignBlock} text-foreground font-semibold text-sm`}>
                {t("callHelper.form.entityType")}
              </Label>
              <Select value={entitySelectValue || entityType} onValueChange={setEntityType} dir="rtl">
                <SelectTrigger
                  id="entityType"
                  className={`${textAlign} glass-panel border focus:border-primary rounded-xl px-4 py-3 [&>span]:${textAlign} text-foreground`}
                >
                  <SelectValue placeholder={t("callHelper.form.entityPlaceholder")} />
                </SelectTrigger>
                <SelectContent className="glass-card" dir="rtl">
                  {ENTITY_KEYS.map((key) => (
                    <SelectItem key={key} value={key} className={`${textAlign} cursor-pointer rounded-lg`}>
                      {tEntity(t, key)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Problem Summary */}
            <div className="space-y-2">
              <Label htmlFor="problemSummary" className={`${textAlignBlock} text-foreground font-semibold text-sm`}>
                {t("callHelper.form.problemSummary")}
              </Label>
              <Textarea
                id="problemSummary"
                placeholder={t("callHelper.form.problemPlaceholder")}
                value={problemSummary}
                onChange={(e) => setProblemSummary(e.target.value)}
                className={`${textAlign} glass-panel border focus:border-primary rounded-xl px-4 py-3 min-h-[100px] text-foreground placeholder:text-muted-foreground resize-none transition-all`}
              />
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={!customerName || !entityType || !problemSummary}
              className={`w-full group relative overflow-hidden rounded-xl py-3.5 transition-all duration-300 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed ${
                isGenerating
                  ? "bg-gradient-to-r from-cyan-400 to-blue-400"
                  : "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 active:scale-[0.98]"
              }`}
            >
              {isGenerating && (
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-300/50 to-blue-300/50 animate-pulse" />
              )}
              <div className="relative flex items-center justify-center gap-2.5 text-white font-bold text-sm">
                <Wand2 className={`size-4 ${isGenerating ? "animate-spin" : ""}`} />
                <span>{isGenerating ? t("callHelper.form.generating") : t("callHelper.form.generate")}</span>
              </div>
            </button>
          </CardContent>
        </Card>

        {/* Right Panel - Generated Output */}
        <Card className="glass-card border-0 rounded-3xl overflow-hidden shadow-lg">
          <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 dark:from-blue-500/5 dark:to-indigo-500/5 p-4 sm:p-6 border-b">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-foreground">{t("callHelper.output.title")}</h2>
                {generatedText && !isLowConfidence && (
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
                        <div className={`space-y-2 ${textAlign}`}>
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
                            className="w-full px-3 py-2 text-xs bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all font-medium shadow-md flex items-center justify-center gap-1.5"
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
                <Badge className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-0 shadow-md text-xs">
                  {t("callHelper.output.alternativeBadge")}
                </Badge>
              )}
            </div>
          </div>
          <CardContent className="p-4 sm:p-6 lg:p-8 space-y-4">
            {/* ============ GRAY AREA WARNING (shows when confidence < 40%) ============ */}
            {isLowConfidence && (
              <div className="glass-panel border-2 border-orange-500/50 dark:border-orange-400/50 rounded-xl p-4 space-y-3 bg-orange-50/50 dark:bg-orange-950/20">
                <div className={`flex items-start gap-3 ${textAlign}`}>
                  <AlertTriangle className="size-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <p className="text-sm font-semibold text-orange-900 dark:text-orange-300">
                      {t("callHelper.grayArea.unclearTitle")}
                    </p>
                    <p className="text-xs text-orange-800 dark:text-orange-400">
                      {t("callHelper.grayArea.unclearHint")}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowGrayAreaDialog(true)}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  <ListFilter className="size-4" />
                  <span>{t("callHelper.grayArea.selectType")}</span>
                </button>
              </div>
            )}

            {/* ============ DESCRIPTION MATCH INDICATOR (shows above generated text box) ============ */}
            {/* Shows either descriptionMatchPercentage OR confidenceScore */}
            {generatedText && !isLowConfidence && (
              <div className={`glass-panel rounded-xl p-3 border-2 ${
                // If we have description match, use it; otherwise use confidence score
                descriptionMatchPercentage > 40 ? (
                  descriptionMatchPercentage >= 90 
                    ? 'border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20' 
                    : descriptionMatchPercentage >= 80 
                    ? 'border-cyan-500/50 bg-cyan-50/50 dark:bg-cyan-950/20'
                    : 'border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20'
                ) : (
                  // Use confidence score colors
                  confidenceScore >= 90
                    ? 'border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20'
                    : confidenceScore >= 80
                    ? 'border-cyan-500/50 bg-cyan-50/50 dark:bg-cyan-950/20'
                    : 'border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20'
                )
              }`}>
                <div className={`flex items-center justify-between ${textAlign}`}>
                  <div className="flex items-center gap-2">
                    <div className={`size-2 rounded-full animate-pulse ${
                      descriptionMatchPercentage > 40 ? (
                        descriptionMatchPercentage >= 90 
                          ? 'bg-emerald-500' 
                          : descriptionMatchPercentage >= 80 
                          ? 'bg-cyan-500'
                          : 'bg-yellow-500'
                      ) : (
                        confidenceScore >= 90
                          ? 'bg-emerald-500'
                          : confidenceScore >= 80
                          ? 'bg-cyan-500'
                          : 'bg-yellow-500'
                      )
                    }`} />
                    <span className={`text-xs font-semibold ${
                      descriptionMatchPercentage > 40 ? (
                        descriptionMatchPercentage >= 90 
                          ? 'text-emerald-700 dark:text-emerald-400' 
                          : descriptionMatchPercentage >= 80 
                          ? 'text-cyan-700 dark:text-cyan-400'
                          : 'text-yellow-700 dark:text-yellow-400'
                      ) : (
                        confidenceScore >= 90
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : confidenceScore >= 80
                          ? 'text-cyan-700 dark:text-cyan-400'
                          : 'text-yellow-700 dark:text-yellow-400'
                      )
                    }`}>
                      {displayScoreLabel()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isMatchedResponse && descriptionMatchPercentage > 40 && (
                      <Badge className="bg-primary/10 text-primary border-0 text-[10px]">
                        {t("callHelper.match.readyResponse")}
                      </Badge>
                    )}
                    <span className={`font-bold text-sm ${
                      descriptionMatchPercentage > 40 ? (
                        descriptionMatchPercentage >= 90 
                          ? 'text-emerald-600 dark:text-emerald-400' 
                          : descriptionMatchPercentage >= 80 
                          ? 'text-cyan-600 dark:text-cyan-400'
                          : 'text-yellow-600 dark:text-yellow-400'
                      ) : (
                        confidenceScore >= 90
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : confidenceScore >= 80
                          ? 'text-cyan-600 dark:text-cyan-400'
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
                          <p className={`text-[10px] text-muted-foreground ${textAlign} cursor-help truncate`}>
                            {t("callHelper.match.matchedWith")} {matchedProblem.description}
                          </p>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="glass-card border max-w-sm" dir="rtl">
                          <div className={`space-y-1 ${textAlign}`}>
                            <p className="text-xs font-semibold text-foreground">{t("callHelper.match.registeredProblem")}</p>
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
                                {priorityLabel(matchedProblem.priority)}
                              </span>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}
                {isAnswerMaskedUntilFullScore && (
                  <p className={`text-[11px] text-amber-800 dark:text-amber-200 mt-3 ${textAlign} font-medium border-t border-current/10 pt-2 leading-relaxed`}>
                    {t("callHelper.match.maskedHint", { score: Math.round(displayedScore) })}
                  </p>
                )}
              </div>
            )}
            {isAdmin && generatedText && (
              <div className="glass-panel rounded-xl p-3 border border-primary/30 bg-primary/5">
                <div className="flex items-center justify-between gap-2 text-right">
                  <span className="text-xs font-semibold text-foreground">Live Threshold Indicator</span>
                  <Badge className="bg-primary/15 text-primary border-0 text-[10px]">
                    {liveRoutingMode === 'gray_area'
                      ? 'Gray Area'
                      : liveRoutingMode === 'advanced_mode'
                        ? 'Advanced'
                        : liveRoutingMode === 'direct_answer'
                          ? 'Direct'
                          : 'Unknown'}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground text-right mt-1">
                  Score: {displayedScore}% | Unlocked: 100% | Direct: ≥{directAnswerThreshold}% | Advanced: {showAdvancedThreshold}%–{directAnswerThreshold - 1}% | Gray: &lt;{grayAreaThreshold}%
                  {isAnswerMaskedUntilFullScore ? " | Answer masked until 100%." : ""}
                </p>
              </div>
            )}

            {/* Generated Text — blur عند Gray Area أو عند سكور أقل من 100٪ */}
            <div
              className={`relative ${
                isLowConfidence || isAnswerMaskedUntilFullScore ? "pointer-events-none" : ""
              }`}
            >
              <Textarea
                value={generatedText}
                readOnly
                placeholder={t("callHelper.output.placeholder")}
                className={`${textAlign} glass-panel border rounded-xl px-4 py-3 min-h-[240px] resize-none text-foreground placeholder:text-muted-foreground transition-all ${
                  isLowConfidence || isAnswerMaskedUntilFullScore ? "blur-sm select-none" : ""
                }`}
              />
              {isLowConfidence && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/5 rounded-xl">
                  <div className="text-center space-y-2">
                    <AlertTriangle className="size-8 text-orange-500 mx-auto" />
                    <p className="text-sm font-semibold text-muted-foreground">{t("callHelper.grayArea.selectFirst")}</p>
                  </div>
                </div>
              )}
              {isAnswerMaskedUntilFullScore && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/40 rounded-xl px-4">
                  <div className="text-center space-y-2 max-w-sm">
                    <AlertTriangle className="size-8 text-amber-600 mx-auto" />
                    <p className="text-sm font-semibold text-foreground">
                      {t("callHelper.masked.overlayTitle")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("callHelper.masked.overlayHint", { score: Math.round(displayedScore) })}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {generatedText && !isLowConfidence && (
              <>
                {/* Copy Button */}
                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={Math.round(displayedScore) < 100}
                  title={
                    Math.round(displayedScore) < 100
                      ? t("callHelper.buttons.copyDisabled")
                      : undefined
                  }
                  className={`w-full py-3 rounded-xl transition-all duration-300 font-semibold flex items-center justify-center gap-2 shadow-md text-sm ${
                    Math.round(displayedScore) < 100
                      ? "opacity-50 cursor-not-allowed glass-panel border text-muted-foreground"
                      : isCopied
                      ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white"
                      : "glass-panel hover:bg-accent/50 text-foreground border"
                  }`}
                >
                  {isCopied ? (
                    <>
                      <CheckCircle2 className="size-4" />
                      <span>{t("callHelper.buttons.copySuccess")}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-4" />
                      <span>{t("callHelper.buttons.copy")}</span>
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
                            <span className="text-sm text-emerald-700 dark:text-emerald-300">{t("callHelper.feedback.helped")}</span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="border-2 border-border bg-gray-900 dark:bg-gray-100 shadow-xl">
                          <p className="text-xs text-gray-100 dark:text-gray-900 font-medium">{t("callHelper.feedback.teachTooltipFull")}</p>
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
                          ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                          : "glass-panel hover:bg-accent/50 border"
                      }`}
                    >
                      <RefreshCcw className={`size-4 ${activeButton === "retry" ? "rotate-180" : ""} transition-transform ${activeButton === "retry" ? "" : "text-cyan-600 dark:text-cyan-400"}`} />
                      <span className={`text-[10px] sm:text-xs ${activeButton === "retry" ? "" : "text-cyan-700 dark:text-cyan-300"}`}>{t("callHelper.buttons.alternative")}</span>
                    </button>

                    {/* ============ ADVANCED MODE BUTTON ============ */}
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={handleAdvancedModeToggle}
                            className={`py-2.5 sm:py-3 rounded-xl transition-all duration-300 font-semibold flex flex-col items-center justify-center gap-1 shadow-md relative ${
                                activeButton === "advanced"
                                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                                  : "glass-panel hover:bg-accent/50 border"
                            }`}
                          >
                            {isAdvancedModeEnabled && (
                              <div className="absolute -top-1 -right-1 size-3 bg-cyan-500 rounded-full border-2 border-background" />
                            )}
                            <Sliders className={`size-4 ${activeButton === "advanced" ? "rotate-12" : ""} transition-transform ${activeButton === "advanced" ? "" : "text-blue-600 dark:text-blue-400"}`} />
                            <span className={`text-[10px] sm:text-xs ${activeButton === "advanced" ? "" : "text-blue-700 dark:text-blue-300"}`}>{t("callHelper.buttons.advancedMode")}</span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="border-2 border-border bg-gray-900 dark:bg-gray-100 max-w-xs shadow-xl" dir="rtl">
                          <div className={`${textAlign} space-y-1`}>
                            <p className="text-xs font-semibold text-gray-100 dark:text-gray-900">{t("callHelper.advancedMode.title")}</p>
                            <p className="text-[10px] text-gray-300 dark:text-gray-700">
                              {isAdvancedModeEnabled 
                                ? t("callHelper.advancedMode.enabledHint")
                                : t("callHelper.advancedMode.disabledHint")
                              }
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={openTeachRafeeqFromExperience}
                            className="py-2.5 sm:py-3 rounded-xl transition-all duration-300 font-semibold flex flex-col items-center justify-center gap-1 shadow-md glass-panel hover:bg-accent/50 border"
                          >
                            <ThumbsUp className="size-4 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-[10px] sm:text-xs text-emerald-700 dark:text-emerald-300">{t("callHelper.feedback.helped")}</span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="border-2 border-border bg-gray-900 dark:bg-gray-100 shadow-xl">
                          <p className="text-xs text-gray-100 dark:text-gray-900 font-medium">{t("callHelper.feedback.teachTooltipAuto")}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                ) : null}

                {/* ============ ADVANCED MODE PANEL ============ */}
                {/* Shows when advanced mode is active */}
                {activeButton === "advanced" && isAdvancedModeEnabled && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    {selectedProblemType && (
                      <div className="flex items-center justify-between text-xs glass-panel rounded-lg p-3 border">
                        <span className="text-muted-foreground">{t("callHelper.advancedMode.selectedType")}</span>
                        <Badge className="bg-primary/10 text-primary border-0">
                          {grayAreaSettings.questions.find(q => q.id === selectedProblemType)?.title || PROBLEM_TYPES.find(pt => pt.id === selectedProblemType)?.name || t("callHelper.advancedMode.general")}
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
                      categoryScopeBanner={advancedCategoryScopeBanner}
                      scopedEmptyMessage={advancedScopedEmptyMessage}
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
                        const problemTypeName = selectedProblemType 
                          ? (PROBLEM_TYPES.find(pt => pt.id === selectedProblemType)?.name || '')
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
                        if (result.finalAction === 'direct_answer') {
                          const directAnswerText = lastSubCondition.actionDetails || lastSubCondition.name || t("callHelper.templates.defaultDirectAnswer");
                          const newGeneratedText = reportTemplate("callHelper.templates.flowDirectAnswer", {
                            customerName,
                            entityType: entityLabel(entityType),
                            problemType: problemTypeName,
                            condition: lastSubCondition.name,
                            solution: directAnswerText,
                          });
                          setGeneratedText(newGeneratedText);
                          setIsMatchedResponse(false);
                          setMatchedProblem(null);
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
                        const enhancedSearchResult = await rerunMatchWithFlowContext({
                          routeNames,
                          stepNames,
                          subConditionNames,
                          problemTypeName,
                        });
                        if (
                          result.finalAction !== 'escalation'
                          && result.finalAction !== 'direct_answer'
                          && enhancedSearchResult?.isMatched
                          && enhancedSearchResult.problem
                        ) {
                          const matchedText = getFormattedResponse(
                            enhancedSearchResult.problem,
                            customerName,
                            apiEntityType
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
                            status: result.finalAction === 'force_solution' ? 'resolved' : 'pending',
                            matchedCaseDbId: enhancedSearchResult.problem.id,
                            matchedCaseCode: enhancedSearchResult.problem.description,
                            matchedAt: new Date().toISOString(),
                            flowResult: result,
                            finalDisplayScore: enhancedSearchResult.matchPercentage,
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
                        
                        if (result.finalAction === 'escalation') {
                          const escalationText = lastSubCondition.actionDetails || t("callHelper.templates.defaultEscalation");
                          const newGeneratedText = reportTemplate("callHelper.templates.flowEscalation", {
                            customerName,
                            entityType: entityLabel(entityType),
                            problemType: problemTypeName,
                            condition: lastSubCondition.name,
                            solution: escalationText,
                          });
                          setGeneratedText(newGeneratedText);
                          void logCallToBackend({
                            generatedResponse: newGeneratedText,
                            status: "escalated",
                            flowResult: result,
                            finalDisplayScore: 100,
                          });
                        } else if (result.finalAction === 'force_solution') {
                          const solutionText = lastSubCondition.actionDetails || t("callHelper.templates.defaultSolution");
                          const newGeneratedText = reportTemplate("callHelper.templates.flowForceSolution", {
                            customerName,
                            entityType: entityLabel(entityType),
                            problemType: problemTypeName,
                            condition: lastSubCondition.name,
                            solution: solutionText,
                          });
                          setGeneratedText(newGeneratedText);
                          void logCallToBackend({
                            generatedResponse: newGeneratedText,
                            status: "resolved",
                            flowResult: result,
                            finalDisplayScore: 100,
                          });
                        } else {
                          const continueMessage = reportTemplate("callHelper.templates.flowContinue", {
                            customerName,
                            entityType: entityLabel(entityType),
                            problemType: problemTypeName,
                            condition: lastSubCondition.name,
                            solution: "",
                          });
                          setGeneratedText(continueMessage);
                          void logCallToBackend({
                            generatedResponse: continueMessage,
                            status: "pending",
                            flowResult: result,
                            finalDisplayScore: 100,
                          });
                        }

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
          
          // Optional AI simulation (can be disabled)
          if (ENABLE_AI) {
            await simulateAIProcessing();
          }
          
          const problemTypeName = flowPath.questionTitle;
          const routeNames = flowPath.selectedSteps.map((item) => item.route.name).filter(Boolean);
          const stepNames = flowPath.selectedSteps.map((item) => item.step.name).filter(Boolean);
          const subConditionNames = flowPath.selectedSteps.map((item) => item.subCondition.name).filter(Boolean);
          if (flowPath.finalAction === 'direct_answer') {
            const directAnswerText = flowPath.finalStepDescription || t("callHelper.templates.defaultDirectAnswer");
            const generatedResponse = reportTemplate("callHelper.templates.grayDirectAnswer", {
              customerName,
              entityType: entityLabel(entityType),
              problemType: problemTypeName,
              solution: directAnswerText,
              problemSummary,
            });
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
          const enhancedSearchResult = await rerunMatchWithFlowContext({
            routeNames,
            stepNames,
            subConditionNames,
            problemTypeName,
          });
          if (
            flowPath.finalAction !== 'escalation'
            && flowPath.finalAction !== 'direct_answer'
            && enhancedSearchResult?.isMatched
            && enhancedSearchResult.problem
          ) {
            const matchedText = getFormattedResponse(
              enhancedSearchResult.problem,
              customerName,
              apiEntityType
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
              finalDisplayScore: enhancedSearchResult.matchPercentage,
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
          
          // Build flow path description
          const flowPathText = flowPath.selectedSteps
            .map(s => `${s.route.name} > ${s.step.name} > ${s.subCondition.name}`)
            .join('\\n');
          
          let generatedResponse = "";
          const grayBase = {
            customerName,
            entityType: entityLabel(entityType),
            problemType: problemTypeName,
            problemSummary,
            solution: flowPath.finalStepDescription || "",
          };

          if (flowPath.finalAction === "force_solution") {
            generatedResponse = reportTemplate("callHelper.templates.grayForceSolution", grayBase);
          } else if (flowPath.finalAction === "escalation") {
            generatedResponse = reportTemplate("callHelper.templates.grayEscalation", grayBase);
          } else {
            generatedResponse = reportTemplate("callHelper.templates.grayContinue", grayBase);
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
        }}
      />

      {/* Why Popup */}
      <Dialog open={showWhyPopup} onOpenChange={setShowWhyPopup}>
        <div className={isDarkMode ? 'dark' : ''}>
          <DialogContent className="glass-card max-w-md shadow-2xl" dir="rtl">
            <DialogHeader>
              <DialogTitle className="sr-only">{t("callHelper.why.dialogTitle")}</DialogTitle>
            </DialogHeader>
            <div className={`${textAlign} pt-0`}>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {matchedProblem?.why?.trim() || t("callHelper.why.noReason")}
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
              <DialogTitle className={`${textAlign} flex items-center gap-3 ${justifyEnd} text-lg`}>
                <span className="text-foreground">{t("callHelper.rafeeq.chatTitle")}</span>
                <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg border-2 border-cyan-300 dark:border-cyan-400">
                  <Bot className="size-6 text-white" />
                </div>
              </DialogTitle>
              <DialogDescription className={`${textAlign} text-muted-foreground text-sm`}>
                {t("callHelper.rafeeq.chatDescription")}
              </DialogDescription>
            </DialogHeader>

            {!isRafeeqActive ? (
              <div className="flex-1 flex items-center justify-center p-8 bg-background dark:bg-gray-900">
                <div className="text-center space-y-6">
                  <div className="mx-auto w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center shadow-2xl floating">
                    <Bot className="size-10 text-white" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-foreground">{t("callHelper.rafeeq.welcome")}</h3>
                    <p className="text-sm text-muted-foreground">{t("callHelper.rafeeq.welcomeHint")}</p>
                  </div>
                  <button
                    onClick={() => setIsRafeeqActive(true)}
                    className="px-8 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold hover:from-cyan-600 hover:to-blue-700 transition-all flex items-center gap-3 mx-auto shadow-lg"
                  >
                    <Bot className="size-5" />
                    <span>{t("callHelper.rafeeq.start")}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0 bg-background dark:bg-gray-900">
                <div className="flex-1 overflow-y-auto p-4 space-y-4 rounded-2xl mb-4 bg-gray-50 dark:bg-gray-800 border border-border">
                  <div className={`flex items-start gap-3 ${justifyEnd}`}>
                    <div className="p-4 rounded-2xl max-w-[80%] shadow-md bg-white dark:bg-gray-700 border border-border">
                      <p className="text-sm text-foreground">
                        {t("callHelper.rafeeq.greeting")}
                      </p>
                    </div>
                    <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex-shrink-0 shadow-lg">
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
                    className="p-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-lg"
                  >
                    <Send className="size-5" />
                  </button>
                  <Input
                    type="text"
                    placeholder={t("callHelper.rafeeq.placeholder")}
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && chatMessage.trim()) {
                        setChatMessage("");
                      }
                    }}
                    className={`flex-1 border rounded-xl px-4 py-3 ${textAlign} text-foreground placeholder:text-muted-foreground bg-white dark:bg-gray-700 dark:border-gray-600`}
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