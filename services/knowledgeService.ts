/**
 * Knowledge Base Service
 * Searches the MongoDB cases collection via backend API
 */
export interface KnowledgeSearchResult {
  problem: {
    id: string;
    title: string;
    description: string;
    solution: string;
    keywords: string[];
    category: string;
    confidence: number;
    /** حقل «لماذا» من مستند الحالة في MongoDB */
    why?: string;
  } | null;
  matchPercentage: number;
  isMatched: boolean;
  debugBreakdown?: {
    caseDbId: string;
    caseId: string;
    preFilter: {
      skippedByUserTypeOrServiceType: Array<{
        caseDbId: string;
        caseId: string;
        caseUserType: string | null;
        caseServiceType: string | null;
        selectedUserTypeHint: string | null;
        reason: string;
      }>;
    };
    keyword: {
      rawScore: number;
      boundedScore: number;
      weight: number;
      contribution: number;
      findings: {
        matchedMainKeywords: string[];
        matchedExtraKeywords: string[];
        matchedSynonyms: string[];
        fuzzyMatchedKeywords: string[];
        matchedUserWordsInCaseText: string[];
      };
    };
    usageFrequency: {
      score: number;
      weight: number;
      contribution: number;
    };
    freshness: {
      score: number;
      weight: number;
      contribution: number;
      createdAt: string | null;
      matchedAt: string | null;
      matchCount: number;
    };
    metadata: {
      overallScore: number;
      weight: number;
      contribution: number;
      userTypeScore: number | null;
      categoryScore: number | null;
      subCategoryScore: number | null;
      findings: {
        userTypeHint: string | null;
        caseUserType: string | null;
        caseAccountStatus: string | null;
        userTypeMatched: boolean | null;
        categoryMatchedTokens: string[];
        categoryTotalTokens: string[];
        subCategoryMatchedTokens: string[];
        subCategoryTotalTokens: string[];
      };
    };
    finalScore: number;
  };
}

export interface MatchingWeightsOptions {
  keywordMatchWeight?: number; // 0-100
  caseUsageFrequencyWeight?: number; // 0-100
  caseFreshnessWeight?: number; // 0-100
  caseMetadataMatchWeight?: number; // 0-100
  decayRateDays?: number;
  userTypeHint?: string;
  accountStatusHint?: string;
  categoryHint?: string;
  subCategoryHint?: string;
  includeDebugBreakdown?: boolean;
}

/**
 * Search cases for matching problems
 * This searches the real MongoDB cases collection
 */

type CaseUsageStats = {
  usageByCaseDbId: Map<string, number>;
  lastMatchedAtByCaseDbId: Map<string, number>;
  maxUsageCount: number;
};

const getEmptyCaseUsageStats = (): CaseUsageStats => ({
  usageByCaseDbId: new Map<string, number>(),
  lastMatchedAtByCaseDbId: new Map<string, number>(),
  maxUsageCount: 0,
});

const fetchCaseUsageStats = async (token: string | null): Promise<CaseUsageStats> => {
  if (!token) return getEmptyCaseUsageStats();

  try {
    const response = await fetch('/api/cases/usage-counts', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return getEmptyCaseUsageStats();
    }

    const data = await response.json();
    if (!data.success || !Array.isArray(data.data)) {
      return getEmptyCaseUsageStats();
    }

    const usageByCaseDbId = new Map<string, number>();
    const lastMatchedAtByCaseDbId = new Map<string, number>();
    let maxUsageCount = 0;

    data.data.forEach((entry: any) => {
      const caseDbId = String(entry?.caseDbId || '');
      const usageCount = Number(entry?.usageCount || 0);
      if (!caseDbId || !Number.isFinite(usageCount) || usageCount < 0) return;
      usageByCaseDbId.set(caseDbId, usageCount);
      const lastMatchedAtMs = new Date(entry?.lastMatchedAt || 0).getTime();
      if (Number.isFinite(lastMatchedAtMs) && lastMatchedAtMs > 0) {
        lastMatchedAtByCaseDbId.set(caseDbId, lastMatchedAtMs);
      }
      if (usageCount > maxUsageCount) {
        maxUsageCount = usageCount;
      }
    });
    return { usageByCaseDbId, lastMatchedAtByCaseDbId, maxUsageCount };
  } catch {
    return getEmptyCaseUsageStats();
  }
};
export async function searchKnowledgeBase(
  problemDescription: string,
  weights?: MatchingWeightsOptions
): Promise<KnowledgeSearchResult> {
  try {
    // If description is too short, return no match
    if (!problemDescription || problemDescription.trim().length < 5) {
      return {
        problem: null,
        matchPercentage: 0,
        isMatched: false,
      };
    }

    // Search the cases collection via API
    // Uses proxy configured in vite.config.ts to forward to backend
    const token = localStorage.getItem('token');
    const response = await fetch('/api/cases', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch cases');
    }

    const data = await response.json();
    
    if (!data.success || !data.data || data.data.length === 0) {
      return {
        problem: null,
        matchPercentage: 0,
        isMatched: false,
      };
    }

    // Find best matching case using keyword matching
    const cases = data.data;
    const caseUsageStats = await fetchCaseUsageStats(token);
    const bestMatch = findBestMatchInCases(problemDescription, cases, weights, caseUsageStats);

    return bestMatch;
  } catch (error) {
    console.error('❌ Cases search error:', error);
    return {
      problem: null,
      matchPercentage: 0,
      isMatched: false,
    };
  }
}

/**
 * Find best matching case from cases collection
 */
function findBestMatchInCases(
  userDescription: string,
  cases: any[],
  weights?: MatchingWeightsOptions,
  caseUsageStats: CaseUsageStats = getEmptyCaseUsageStats()
): KnowledgeSearchResult {
  const ARABIC_LIGHT_NLP_STOP_WORDS = new Set([
    'في', 'من', 'على', 'عن', 'الى', 'إلى', 'مع', 'تم', 'هذا', 'هذه', 'ذلك',
    'التي', 'الذي', 'هناك', 'بخصوص', 'حول', 'عند', 'او', 'أو', 'لكن', 'ثم',
  ]);
  const normalizeArabicToken = (token: string): string => {
    if (!token) return '';
    let normalized = token
      .replace(/[\u064B-\u0652\u0670]/g, '') // remove Arabic diacritics
      .replace(/ـ/g, '') // tatweel
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ؤ/g, 'و')
      .replace(/ئ/g, 'ي')
      .replace(/[ةۀ]/g, 'ه')
      .replace(/[گݣ]/g, 'ك')
      .replace(/[پ]/g, 'ب')
      .replace(/[چ]/g, 'ج')
      .replace(/[ڤ]/g, 'ف');

    const prefixCandidates = ['وال', 'بال', 'كال', 'فال', 'لل', 'ال', 'و', 'ف', 'ب', 'ك', 'ل'];
    const suffixCandidates = ['يات', 'ات', 'ون', 'ين', 'ان', 'ها', 'هم', 'هن', 'كم', 'كن', 'نا', 'يه', 'ه', 'ة', 'ي', 'ك', 'ت', 'ا', 'و', 'ن'];

    for (const prefix of prefixCandidates) {
      if (normalized.startsWith(prefix) && normalized.length - prefix.length >= 3) {
        normalized = normalized.slice(prefix.length);
        break;
      }
    }

    for (const suffix of suffixCandidates) {
      if (normalized.endsWith(suffix) && normalized.length - suffix.length >= 3) {
        normalized = normalized.slice(0, -suffix.length);
        break;
      }
    }

    return normalized;
  };
  const normalizeForMatching = (text: string): string => {
    if (!text) return '';
    return text
      .toLowerCase()
      .trim()
      .replace(/[.,!?;:()[\]{}،؛؟]/g, ' ')
      .replace(/\s+/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map((token) => normalizeArabicToken(token))
      .filter(Boolean)
      .join(' ');
  };
  const isEligibleForFuzzyMatch = (token: string): boolean => {
    if (!token) return false;
    if (token.length < 4) return false;
    if (ARABIC_LIGHT_NLP_STOP_WORDS.has(token)) return false;
    return true;
  };
  const getLevenshteinDistanceWithLimit = (
    source: string,
    target: string,
    maxDistance: number = 1
  ): number => {
    const sourceLength = source.length;
    const targetLength = target.length;
    if (Math.abs(sourceLength - targetLength) > maxDistance) {
      return maxDistance + 1;
    }
    const previous = new Array<number>(targetLength + 1);
    const current = new Array<number>(targetLength + 1);
    for (let j = 0; j <= targetLength; j += 1) {
      previous[j] = j;
    }
    for (let i = 1; i <= sourceLength; i += 1) {
      current[0] = i;
      let minInRow = current[0];
      for (let j = 1; j <= targetLength; j += 1) {
        const cost = source[i - 1] === target[j - 1] ? 0 : 1;
        current[j] = Math.min(
          previous[j] + 1,
          current[j - 1] + 1,
          previous[j - 1] + cost
        );
        if (current[j] < minInRow) minInRow = current[j];
      }
      if (minInRow > maxDistance) {
        return maxDistance + 1;
      }
      for (let j = 0; j <= targetLength; j += 1) {
        previous[j] = current[j];
      }
    }
    return previous[targetLength];
  };
  const isLightNlpFuzzyTokenMatch = (left: string, right: string): boolean => {
    if (!left || !right) return false;
    if (left === right) return true;
    if (!isEligibleForFuzzyMatch(left) || !isEligibleForFuzzyMatch(right)) return false;
    return getLevenshteinDistanceWithLimit(left, right, 1) <= 1;
  };

  const normalizedUserDesc = normalizeForMatching(userDescription);
  const keywordMatchWeight = Math.max(0, Math.min(100, Number(weights?.keywordMatchWeight ?? 100)));
  const caseUsageFrequencyWeight = Math.max(0, Math.min(100, Number(weights?.caseUsageFrequencyWeight ?? 0)));
  const caseFreshnessWeight = Math.max(0, Math.min(100, Number(weights?.caseFreshnessWeight ?? 0)));
  const caseMetadataMatchWeight = Math.max(0, Math.min(100, Number(weights?.caseMetadataMatchWeight ?? 0)));
  const decayRateDays = Math.max(1, Number(weights?.decayRateDays ?? 30));
  const keywordWeightMultiplier = keywordMatchWeight / 100; // 100 = full keyword influence (current only method)
  const caseUsageWeightMultiplier = caseUsageFrequencyWeight / 100;
  const caseFreshnessWeightMultiplier = caseFreshnessWeight / 100;
  const caseMetadataWeightMultiplier = caseMetadataMatchWeight / 100;
  const userWords = normalizedUserDesc.split(' ').filter(Boolean);
  const userWordSet = new Set(userWords);
  const normalizedUserWordTokenSet = new Set(Array.from(userWordSet).map((word) => normalizeArabicToken(word)));
  const uniqueUserWords = Array.from(userWordSet);
  const normalizedUserDescPadded = ` ${normalizedUserDesc} `;

  const normalizedUserTypeHint = normalizeForMatching(weights?.userTypeHint || '');
  const normalizedCategoryHint = normalizeForMatching(weights?.categoryHint || '');
  const normalizedSubCategoryHint = normalizeForMatching(weights?.subCategoryHint || '');
  const includeDebugBreakdown = Boolean(weights?.includeDebugBreakdown);
  const isHintMatched = (hint: string, candidate: string): boolean => {
    if (!hint || !candidate) return false;
    return candidate === hint || candidate.includes(hint) || hint.includes(candidate);
  };
  const skippedByUserTypeOrServiceType: Array<{
    caseDbId: string;
    caseId: string;
    caseUserType: string | null;
    caseServiceType: string | null;
    selectedUserTypeHint: string | null;
    reason: string;
  }> = [];

  let bestMatch = {
    problem: null as any,
    matchPercentage: 0,
    rankingScore: Number.NEGATIVE_INFINITY,
    debugBreakdown: undefined as KnowledgeSearchResult['debugBreakdown'],
  };
  const getCaseFreshnessTimestampMs = (caseItem: any): number =>
    new Date(caseItem?.updatedAt || caseItem?.createdAt || 0).getTime();
  const eligibleCasesForFreshness = cases.filter((caseItem) => {
    if (!normalizedUserTypeHint) return true;
    const normalizedCaseUserType = normalizeForMatching(caseItem.userType || '');
    const normalizedCaseAccountStatus = normalizeForMatching(caseItem.accountStatus || '');
    return (
      isHintMatched(normalizedUserTypeHint, normalizedCaseUserType)
      || isHintMatched(normalizedUserTypeHint, normalizedCaseAccountStatus)
    );
  });
  const caseCreatedAtMsList = eligibleCasesForFreshness
    .map((caseItem) => getCaseFreshnessTimestampMs(caseItem))
    .filter((timestamp) => Number.isFinite(timestamp) && timestamp > 0);
  const minCaseCreatedAtMs = caseCreatedAtMsList.length > 0 ? Math.min(...caseCreatedAtMsList) : 0;
  const maxCaseCreatedAtMs = caseCreatedAtMsList.length > 0 ? Math.max(...caseCreatedAtMsList) : 0;
  const eligibleCaseLastMatchedAtMsList = eligibleCasesForFreshness
    .map((caseItem) => {
      const caseDbId = String(caseItem._id || caseItem.id || '');
      return caseUsageStats.lastMatchedAtByCaseDbId.get(caseDbId) || 0;
    })
    .filter((timestamp) => Number.isFinite(timestamp) && timestamp > 0);
  const minCaseLastMatchedAtMs = eligibleCaseLastMatchedAtMsList.length > 0 ? Math.min(...eligibleCaseLastMatchedAtMsList) : 0;
  const maxCaseLastMatchedAtMs = eligibleCaseLastMatchedAtMsList.length > 0 ? Math.max(...eligibleCaseLastMatchedAtMsList) : 0;

  cases.forEach((caseItem) => {
    const normalizedCaseUserType = normalizeForMatching(caseItem.userType || '');
    const normalizedCaseAccountStatus = normalizeForMatching(caseItem.accountStatus || '');
    const normalizedCaseCategory = normalizeForMatching(caseItem.category || '');
    const normalizedCaseSubCategory = normalizeForMatching(caseItem.subCategory || '');
    const hasUserTypeHints = Boolean(normalizedUserTypeHint);
    const userTypeAndServiceTypeMatched = !hasUserTypeHints
      || isHintMatched(normalizedUserTypeHint, normalizedCaseUserType)
      || isHintMatched(normalizedUserTypeHint, normalizedCaseAccountStatus);
    if (!userTypeAndServiceTypeMatched) {
      skippedByUserTypeOrServiceType.push({
        caseDbId: String(caseItem._id || caseItem.id || ''),
        caseId: String(caseItem.caseId || ''),
        caseUserType: normalizedCaseUserType || null,
        caseServiceType: normalizedCaseAccountStatus || null,
        selectedUserTypeHint: normalizedUserTypeHint || null,
        reason: 'Skipped: selected UserType does not match case UserType or Service Type',
      });
      return;
    }
    let matchedCount = 0;

    // Get all keywords from case (mainKeywords, extraKeywords, synonyms)
    const mainKeywords = caseItem.mainKeywords ? caseItem.mainKeywords.split(/[،,]/).map((k: string) => k.trim()) : [];
    const extraKeywords = caseItem.extraKeywords ? caseItem.extraKeywords.split(/[،,]/).map((k: string) => k.trim()) : [];
    const synonyms = caseItem.synonyms ? caseItem.synonyms.split(/[،,]/).map((k: string) => k.trim()) : [];
    const negativeKeywords = caseItem.negativeKeywords ? caseItem.negativeKeywords.split(/[،,]/).map((k: string) => k.trim()) : [];
    
    const allKeywords = [...mainKeywords, ...extraKeywords, ...synonyms];
    const normalizedSingleTokenKeywords = Array.from(
      new Set(
        allKeywords
          .map((keyword: string) => normalizeForMatching(keyword))
          .filter((keyword: string) => keyword && !keyword.includes(' '))
      )
    ).sort((a, b) => b.length - a.length);
    
    // Build searchable text
    const searchableText = normalizeForMatching(allKeywords.join(' '));
    const searchableTextPadded = ` ${searchableText} `;
    const searchableTextTokens = searchableText.split(' ').filter(Boolean);

    const segmentTokenByKnownKeywords = (token: string): string[] | null => {
      if (!token || normalizedSingleTokenKeywords.length === 0) return null;
      const memo = new Map<number, string[] | null>();

      const segmentFrom = (startIndex: number): string[] | null => {
        if (startIndex === token.length) return [];
        if (memo.has(startIndex)) return memo.get(startIndex)!;

        for (const keyword of normalizedSingleTokenKeywords) {
          if (!keyword || !token.startsWith(keyword, startIndex)) continue;
          const rest = segmentFrom(startIndex + keyword.length);
          if (rest) {
            const segmentation = [keyword, ...rest];
            memo.set(startIndex, segmentation);
            return segmentation;
          }
        }

        memo.set(startIndex, null);
        return null;
      };

      return segmentFrom(0);
    };

    const segmentedKeywordMatches = new Set<string>();
    uniqueUserWords.forEach((word) => {
      const segmented = segmentTokenByKnownKeywords(word);
      if (segmented && segmented.length > 1) {
        segmented.forEach((segment) => segmentedKeywordMatches.add(segment));
      }
    });

    const getKeywordMatchMode = (keyword: string): 'none' | 'exact' | 'fuzzy' => {
      const normalizedKeyword = normalizeForMatching(keyword);
      if (!normalizedKeyword) return 'none';

      // Phrase keyword: exact phrase match
      if (normalizedKeyword.includes(' ')) {
        return normalizedUserDescPadded.includes(` ${normalizedKeyword} `) ? 'exact' : 'none';
      }

      // Single-token keyword: exact token match
      const hasExactMatch = (
        userWordSet.has(normalizedKeyword)
        || normalizedUserWordTokenSet.has(normalizedKeyword)
        || segmentedKeywordMatches.has(normalizedKeyword)
      );
      if (hasExactMatch) return 'exact';

      const hasFuzzyMatch = uniqueUserWords.some((userWord) => isLightNlpFuzzyTokenMatch(userWord, normalizedKeyword));
      return hasFuzzyMatch ? 'fuzzy' : 'none';
    };

    // Check for negative keywords first (if any match, skip this case)
    let hasNegativeMatch = false;
    negativeKeywords.forEach((negKeyword: string) => {
      if (negKeyword && getKeywordMatchMode(negKeyword) !== 'none') {
        hasNegativeMatch = true;
      }
    });

    if (hasNegativeMatch) {
      return; // Skip this case
    }

    const matchedMainKeywords: string[] = [];
    const matchedExtraKeywords: string[] = [];
    const matchedSynonyms: string[] = [];
    const fuzzyMatchedKeywordsSet = new Set<string>();
    mainKeywords.forEach((keyword: string) => {
      if (!keyword) return;
      const matchMode = getKeywordMatchMode(keyword);
      if (matchMode === 'none') return;
      matchedMainKeywords.push(keyword);
      if (matchMode === 'fuzzy') fuzzyMatchedKeywordsSet.add(keyword);
    });
    extraKeywords.forEach((keyword: string) => {
      if (!keyword) return;
      const matchMode = getKeywordMatchMode(keyword);
      if (matchMode === 'none') return;
      matchedExtraKeywords.push(keyword);
      if (matchMode === 'fuzzy') fuzzyMatchedKeywordsSet.add(keyword);
    });
    synonyms.forEach((synonym: string) => {
      if (!synonym) return;
      const matchMode = getKeywordMatchMode(synonym);
      if (matchMode === 'none') return;
      matchedSynonyms.push(synonym);
      if (matchMode === 'fuzzy') fuzzyMatchedKeywordsSet.add(synonym);
    });
    const fuzzyMatchedKeywords = Array.from(fuzzyMatchedKeywordsSet);

    matchedMainKeywords.forEach(() => {
      matchedCount += 3; // Main keywords have highest weight
    });

    matchedExtraKeywords.forEach(() => {
      matchedCount += 2;
    });

    matchedSynonyms.forEach(() => {
      matchedCount += 1.5;
    });

    // Also check if user description words appear in searchable text
    const matchedUserWordsInCaseText: string[] = [];
    uniqueUserWords.forEach((word) => {
      const hasExactWordMatchInSearchableText = searchableTextPadded.includes(` ${word} `);
      const hasFuzzyWordMatchInSearchableText = isEligibleForFuzzyMatch(word)
        && searchableTextTokens.some((candidateToken) => isLightNlpFuzzyTokenMatch(word, candidateToken));
      if (word.length > 2 && (hasExactWordMatchInSearchableText || hasFuzzyWordMatchInSearchableText)) {
        matchedCount += 0.5;
        matchedUserWordsInCaseText.push(word);
      }
    });

    // Calculate percentage
    const totalPossibleMatches = Math.max((mainKeywords.length * 3) + (extraKeywords.length * 2) + (synonyms.length * 1.5), userWords.length);
    const rawPercentage = totalPossibleMatches > 0 ? (matchedCount / totalPossibleMatches) * 100 : 0;
    // Ensure weighting is applied to a bounded base score, so weight (e.g. 55) is the ceiling.
    const boundedRawPercentage = Math.min(100, rawPercentage);
    const keywordContribution = boundedRawPercentage * keywordWeightMultiplier;

    const caseDbId = String(caseItem._id || caseItem.id || '');
    const usageCount = caseDbId ? (caseUsageStats.usageByCaseDbId.get(caseDbId) || 0) : 0;
    const effectiveUsageCount = usageCount > 0
      ? usageCount
      : (cases.length === 1 ? caseUsageStats.maxUsageCount : 0);
    const usageFrequencyScore = caseUsageStats.maxUsageCount > 0
      ? (effectiveUsageCount / caseUsageStats.maxUsageCount) * 100
      : (cases.length === 1 ? 100 : 0);
    const boundedUsageFrequencyScore = Math.min(100, usageFrequencyScore);
    const usageContribution = boundedUsageFrequencyScore * caseUsageWeightMultiplier;
    const caseCreatedAtMs = getCaseFreshnessTimestampMs(caseItem);
    const freshnessFromCaseDateScore = Number.isFinite(caseCreatedAtMs) && caseCreatedAtMs > 0
      ? (
          maxCaseCreatedAtMs > minCaseCreatedAtMs
            ? ((caseCreatedAtMs - minCaseCreatedAtMs) / (maxCaseCreatedAtMs - minCaseCreatedAtMs)) * 100
            : 100
        )
      : 0;
    const caseLastMatchedAtMs = caseUsageStats.lastMatchedAtByCaseDbId.get(caseDbId) || 0;
    const freshnessFromMatchedAtScore = Number.isFinite(caseLastMatchedAtMs) && caseLastMatchedAtMs > 0
      ? (
          maxCaseLastMatchedAtMs > minCaseLastMatchedAtMs
            ? ((caseLastMatchedAtMs - minCaseLastMatchedAtMs) / (maxCaseLastMatchedAtMs - minCaseLastMatchedAtMs)) * 100
            : 100
        )
      : 0;
    const matchCountFreshnessScore = caseUsageStats.maxUsageCount > 0
      ? (usageCount / caseUsageStats.maxUsageCount) * 100
      : 0;
    const freshnessComponents = [freshnessFromCaseDateScore];
    if (eligibleCaseLastMatchedAtMsList.length > 0) {
      freshnessComponents.push(freshnessFromMatchedAtScore);
    }
    if (caseUsageStats.maxUsageCount > 0) {
      freshnessComponents.push(matchCountFreshnessScore);
    }
    const freshnessScore = freshnessComponents.reduce((sum, score) => sum + score, 0) / freshnessComponents.length;
    const boundedFreshnessScore = Math.min(100, Math.max(0, freshnessScore));
    const freshnessContribution = boundedFreshnessScore * caseFreshnessWeightMultiplier;

    const getKeywordCoverageDetails = (candidate: string): { score: number; matchedTokens: string[]; totalTokens: string[] } => {
      const tokens = candidate.split(' ').map((token) => token.trim()).filter(Boolean);
      if (tokens.length === 0) return { score: 0, matchedTokens: [], totalTokens: [] };
      const matchedTokens = tokens.filter((token) => userWordSet.has(token));
      const score = (matchedTokens.length / tokens.length) * 100;
      return { score, matchedTokens, totalTokens: tokens };
    };

    const metadataComponentScores: number[] = [];
    let userTypeScore: number | null = null;
    let categoryScore: number | null = null;
    let subCategoryScore: number | null = null;
    let userTypeMatched: boolean | null = null;
    let categoryMatchedTokens: string[] = [];
    let categoryTotalTokens: string[] = [];
    let subCategoryMatchedTokens: string[] = [];
    let subCategoryTotalTokens: string[] = [];
    if (hasUserTypeHints) {
      userTypeMatched = userTypeAndServiceTypeMatched;
      // UserType is a findings-only signal and does not contribute to caseMetadataMatch score.
      userTypeScore = null;
    }
    if (normalizedCaseCategory) {
      const categoryFromDescription = getKeywordCoverageDetails(normalizedCaseCategory);
      categoryMatchedTokens = categoryFromDescription.matchedTokens;
      categoryTotalTokens = categoryFromDescription.totalTokens;
      const categoryHintBoost = normalizedCategoryHint && isHintMatched(normalizedCategoryHint, normalizedCaseCategory)
        ? 100
        : 0;
      categoryScore = Math.max(categoryFromDescription.score, categoryHintBoost);
      metadataComponentScores.push(categoryScore);
    }
    if (normalizedCaseSubCategory) {
      const subCategoryFromDescription = getKeywordCoverageDetails(normalizedCaseSubCategory);
      subCategoryMatchedTokens = subCategoryFromDescription.matchedTokens;
      subCategoryTotalTokens = subCategoryFromDescription.totalTokens;
      const subCategoryHintBoost = normalizedSubCategoryHint && isHintMatched(normalizedSubCategoryHint, normalizedCaseSubCategory)
        ? 100
        : 0;
      subCategoryScore = Math.max(subCategoryFromDescription.score, subCategoryHintBoost);
      metadataComponentScores.push(subCategoryScore);
    }

    const caseMetadataMatchScore = metadataComponentScores.length > 0
      ? (metadataComponentScores.reduce((sum, score) => sum + score, 0) / metadataComponentScores.length)
      : 0;
    const boundedCaseMetadataMatchScore = Math.min(100, caseMetadataMatchScore);
    const metadataContribution = boundedCaseMetadataMatchScore * caseMetadataWeightMultiplier;

    const weightedPercentage = keywordContribution + usageContribution + freshnessContribution + metadataContribution;
    const matchPercentage = Math.min(100, Math.round(weightedPercentage));
    const nowMs = Date.now();
    const lastActivityAtMs = caseLastMatchedAtMs > 0 ? caseLastMatchedAtMs : caseCreatedAtMs;
    const daysSinceLastActivity = lastActivityAtMs > 0
      ? Math.max(0, nowMs - lastActivityAtMs) / (1000 * 60 * 60 * 24)
      : 0;
    const daysBeyondDecayThreshold = Math.max(0, daysSinceLastActivity - decayRateDays);
    const stalePriorityPenalty = daysBeyondDecayThreshold > 0
      ? Math.min(20, (daysBeyondDecayThreshold / decayRateDays) * 10)
      : 0;
    const rankingScore = matchPercentage - stalePriorityPenalty;

    // Update best match if this is better
    if (
      rankingScore > bestMatch.rankingScore
      || (rankingScore === bestMatch.rankingScore && matchPercentage > bestMatch.matchPercentage)
    ) {
      bestMatch = {
        problem: {
          id: caseItem._id || caseItem.id,
          title: `${caseItem.category} - ${caseItem.subCategory}`,
          description: caseItem.caseId || '',
          solution: caseItem.responseText,
          keywords: allKeywords,
          category: caseItem.category || 'عام',
          confidence: caseItem.priority === 'High' ? 90 : caseItem.priority === 'Medium' ? 75 : 60,
          why: typeof caseItem.why === 'string' ? caseItem.why.trim() : '',
        },
        matchPercentage,
        rankingScore,
        debugBreakdown: includeDebugBreakdown ? {
          caseDbId,
          caseId: caseItem.caseId || '',
          preFilter: {
            skippedByUserTypeOrServiceType: [...skippedByUserTypeOrServiceType],
          },
          keyword: {
            rawScore: rawPercentage,
            boundedScore: boundedRawPercentage,
            weight: keywordMatchWeight,
            contribution: keywordContribution,
            findings: {
              matchedMainKeywords,
              matchedExtraKeywords,
              matchedSynonyms,
              fuzzyMatchedKeywords,
              matchedUserWordsInCaseText,
            },
          },
          usageFrequency: {
            score: boundedUsageFrequencyScore,
            weight: caseUsageFrequencyWeight,
            contribution: usageContribution,
          },
          freshness: {
            score: boundedFreshnessScore,
            weight: caseFreshnessWeight,
            contribution: freshnessContribution,
            createdAt: caseItem?.updatedAt || caseItem?.createdAt || null,
            matchedAt: caseLastMatchedAtMs > 0 ? new Date(caseLastMatchedAtMs).toISOString() : null,
            matchCount: usageCount,
          },
          metadata: {
            overallScore: boundedCaseMetadataMatchScore,
            weight: caseMetadataMatchWeight,
            contribution: metadataContribution,
            userTypeScore,
            categoryScore,
            subCategoryScore,
            findings: {
              userTypeHint: normalizedUserTypeHint || null,
              caseUserType: normalizedCaseUserType || null,
              caseAccountStatus: normalizedCaseAccountStatus || null,
              userTypeMatched,
              categoryMatchedTokens,
              categoryTotalTokens,
              subCategoryMatchedTokens,
              subCategoryTotalTokens,
            },
          },
          finalScore: matchPercentage,
        } : undefined,
      };
    }
  });
  if (includeDebugBreakdown && !bestMatch.debugBreakdown) {
    bestMatch.debugBreakdown = {
      caseDbId: '',
      caseId: 'No matched case',
      preFilter: {
        skippedByUserTypeOrServiceType: [...skippedByUserTypeOrServiceType],
      },
      keyword: {
        rawScore: 0,
        boundedScore: 0,
        weight: keywordMatchWeight,
        contribution: 0,
        findings: {
          matchedMainKeywords: [],
          matchedExtraKeywords: [],
          matchedSynonyms: [],
          fuzzyMatchedKeywords: [],
          matchedUserWordsInCaseText: [],
        },
      },
      usageFrequency: {
        score: 0,
        weight: caseUsageFrequencyWeight,
        contribution: 0,
      },
      freshness: {
        score: 0,
        weight: caseFreshnessWeight,
        contribution: 0,
        createdAt: null,
        matchedAt: null,
        matchCount: 0,
      },
      metadata: {
        overallScore: 0,
        weight: caseMetadataMatchWeight,
        contribution: 0,
        userTypeScore: null,
        categoryScore: null,
        subCategoryScore: null,
        findings: {
          userTypeHint: normalizedUserTypeHint || null,
          caseUserType: null,
          caseAccountStatus: null,
          userTypeMatched: null,
          categoryMatchedTokens: [],
          categoryTotalTokens: [],
          subCategoryMatchedTokens: [],
          subCategoryTotalTokens: [],
        },
      },
      finalScore: 0,
    };
  }
  if (includeDebugBreakdown && bestMatch.debugBreakdown) {
    bestMatch.debugBreakdown.preFilter.skippedByUserTypeOrServiceType = [...skippedByUserTypeOrServiceType];
  }

  return {
    problem: bestMatch.problem,
    matchPercentage: bestMatch.matchPercentage,
    isMatched: bestMatch.matchPercentage > 40, // 40% threshold
    debugBreakdown: bestMatch.debugBreakdown,
  };
}

/**
 * Get formatted response for matched problem
 */
export function getFormattedResponse(
  problem: any,
  customerName: string,
  entityType: string
): string {
  const entityTypeArabic = entityType?.trim() || 'غير محدد';

  return `السلام عليكم ورحمة الله وبركاته،

العميل: ${customerName}
نوع الجهة: ${entityTypeArabic}

${problem.solution}

شكراً لتواصلكم معنا.`;
}

/**
 * Search knowledge base (database only - no fallback)
 * This is the main function to use in components
 */
export async function searchWithFallback(
  problemDescription: string,
  useMockAsFallback: boolean = false, // Ignored - kept for backward compatibility
  weights?: MatchingWeightsOptions
): Promise<KnowledgeSearchResult> {
  // Search real database only
  const result = await searchKnowledgeBase(problemDescription, weights);

  // If we got a good match, return it
  if (result.isMatched && result.problem) {
    console.log('✅ Found match in database:', result.matchPercentage + '%');
    return result;
  }

  // No match found in database
  console.log('❌ No match found in database');
  return result;
}

export default {
  searchKnowledgeBase,
  searchWithFallback,
  getFormattedResponse,
};
