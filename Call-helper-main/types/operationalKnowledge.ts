/** مصدر معرفة تشغيلية (ملف Excel) */
export type OperationalSourceId = 'hajj' | 'umrah' | 'operations';

export const OPERATIONAL_SOURCES: OperationalSourceId[] = ['hajj', 'umrah', 'operations'];

/** صف معرفة تشغيلية موحّد من Excel */
export type OperationalKnowledgeRow = {
  id: string;
  sourceId: OperationalSourceId;
  actualService: string;
  serviceCategory: string;
  serviceDefinition: string;
  issueType: string;
  issueCategory: string;
  offeringType: string;
  workflowStage: string;
  resolutionPath: string;
  routingDecision: string;
  priorityLevel: string;
  confidenceSignal: string;
  relatedKeywords: string[];
  operationalTags: string[];
  casePattern: string;
  clarificationRequired: string;
  manualReviewFlag: string;
  decisionReason: string;
  linkedScenario: string;
  /** نص مجمّع للفهرسة السريعة */
  searchBlob: string;
};

export type OperationalSourceMeta = {
  sourceId: OperationalSourceId;
  fileName: string;
  uploadedAt: string;
  rowCount: number;
  uploadedBy?: string;
};

export type AnalysisLogPhase =
  | 'parsing'
  | 'intent'
  | 'matching'
  | 'confidence'
  | 'gray_area'
  | 'complete';

export type AnalysisLogEntry = {
  id: string;
  phase: AnalysisLogPhase;
  message: string;
  timestamp: number;
  detail?: string;
};

export type OperationalMatchResult = {
  row: OperationalKnowledgeRow;
  score: number;
  confidence: number;
  matchedSignals: string[];
  matchedKeywords: string[];
};

export type OperationalSearchOutcome = {
  query: string;
  matches: OperationalMatchResult[];
  topMatch: OperationalMatchResult | null;
  confidence: number;
  isGrayArea: boolean;
  grayAreaReasons: string[];
  routingDecision: string | null;
  operationalGuidance: string | null;
  relatedScenarios: string[];
  activeSources: OperationalSourceId[];
};

export type OperationalSearchHistoryEntry = {
  id: string;
  userId: string;
  userName: string;
  query: string;
  confidence: number;
  isGrayArea: boolean;
  topService: string | null;
  routingDecision: string | null;
  sourceIds: OperationalSourceId[];
  createdAt: string;
};
