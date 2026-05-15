/**
 * Confidence Analysis Service
 * 
 * Frontend service to call the backend confidence analysis API
 * Replaces the local calculateConfidence() function with real API integration
 */

// ========================
// Types
// ========================

export interface ConfidenceReasoning {
  specificity: number;
  completeness: number;
  clarity: number;
  domainRelevance: number;
}

export interface ConfidenceAnalysisResult {
  confidenceScore: number;
  reasoning: ConfidenceReasoning;
  suggestedProblemType: string | null;
  keywords: string[];
  recommendations: string[];
}

export interface ConfidenceAnalysisMetadata {
  provider: 'openai' | 'claude' | 'fallback' | 'validation';
  model?: string;
  reason?: string;
  timestamp: string;
  processingTime: number;
}

export interface ConfidenceApiResponse {
  success: boolean;
  data?: ConfidenceAnalysisResult;
  metadata?: ConfidenceAnalysisMetadata;
  message?: string;
  error?: string;
}

// ========================
// Configuration
// ========================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const API_TIMEOUT = 5000; // 5 seconds
const DEBOUNCE_DELAY = 500; // 500ms delay after user stops typing

// Cache for debouncing
let debounceTimer: NodeJS.Timeout | null = null;

// ========================
// Helper Functions
// ========================

/**
 * Get auth token from localStorage
 */
function getAuthToken(): string | null {
  try {
    // Token is stored directly with key 'token' in AuthContext
    const token = localStorage.getItem('token');
    return token;
  } catch (error) {
    console.error('❌ Failed to get auth token:', error);
  }
  return null;
}

/**
 * Fallback to local calculation if API fails
 * Uses the keyword-based algorithm from mockConfidenceData.ts
 */
function fallbackCalculation(description: string): ConfidenceAnalysisResult {
  // Simple keyword-based calculation (copy from mockConfidenceData.ts logic)
  const lowerDescription = description.toLowerCase();
  let score = 30;
  
  // Positive keywords
  const positivePatterns = [
    { keywords: ['تعطل', 'عطل', 'خطأ', 'مشكلة', 'لا يعمل', 'توقف'], weight: 15 },
    { keywords: ['نظام', 'برنامج', 'تطبيق', 'موقع', 'منصة'], weight: 12 },
    { keywords: ['دفع', 'مالي', 'فاتورة', 'رسوم', 'تحويل', 'استرداد'], weight: 12 },
    { keywords: ['تشغيلي', 'عملية', 'إجراء', 'خدمة', 'معالجة'], weight: 10 },
  ];
  
  positivePatterns.forEach(pattern => {
    pattern.keywords.forEach(keyword => {
      if (lowerDescription.includes(keyword)) {
        score += pattern.weight;
      }
    });
  });
  
  // Negative keywords
  const negativeKeywords = ['شيء', 'مدري', 'ممكن', 'يمكن'];
  negativeKeywords.forEach(keyword => {
    if (lowerDescription.includes(keyword)) {
      score -= 8;
    }
  });
  
  // Length bonus
  const wordCount = description.trim().split(/\s+/).length;
  if (wordCount > 15) score += 10;
  else if (wordCount > 8) score += 5;
  
  score = Math.max(0, Math.min(100, score));
  
  return {
    confidenceScore: score,
    reasoning: {
      specificity: score > 70 ? 80 : 50,
      completeness: wordCount > 15 ? 70 : 40,
      clarity: 60,
      domainRelevance: 60
    },
    suggestedProblemType: null,
    keywords: [],
    recommendations: score < 50 
      ? ['Add more details to improve accuracy']
      : ['Description is acceptable']
  };
}

// ========================
// API Functions
// ========================

/**
 * Call the backend confidence analysis API
 * @param description - Problem description text
 * @returns Confidence analysis result
 */
export async function analyzeConfidence(description: string): Promise<ConfidenceApiResponse> {
  try {
    // Validate input
    if (!description || description.trim().length < 10) {
      return {
        success: true,
        data: {
          confidenceScore: 0,
          reasoning: {
            specificity: 0,
            completeness: 0,
            clarity: 0,
            domainRelevance: 0
          },
          suggestedProblemType: null,
          keywords: [],
          recommendations: ['Description is too short', 'Please provide more details']
        },
        metadata: {
          provider: 'validation',
          timestamp: new Date().toISOString(),
          processingTime: 0
        }
      };
    }
    
    const token = getAuthToken();
    if (!token) {
      console.warn('⚠️ No auth token found, using fallback calculation');
      return {
        success: true,
        data: fallbackCalculation(description),
        metadata: {
          provider: 'fallback',
          reason: 'no_auth_token',
          timestamp: new Date().toISOString(),
          processingTime: 0
        }
      };
    }
    
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
    
    // Call backend API
    const response = await fetch(`${API_BASE_URL}/analyze-confidence`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ description }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }
    
    const result: ConfidenceApiResponse = await response.json();
    return result;
    
  } catch (error) {
    // Handle errors gracefully with fallback
    console.error('❌ Confidence API Error:', error);
    
    // Check if it's a timeout or abort
    const isTimeout = error instanceof Error && (error.name === 'AbortError' || error.message.includes('timeout'));
    
    return {
      success: true, // Still successful, just using fallback
      data: fallbackCalculation(description),
      metadata: {
        provider: 'fallback',
        reason: isTimeout ? 'api_timeout' : 'api_error',
        timestamp: new Date().toISOString(),
        processingTime: 0
      }
    };
  }
}

/**
 * Analyze confidence with debouncing
 * Useful for real-time analysis as user types
 * 
 * @param description - Problem description text
 * @param callback - Callback function to receive result
 * @param delay - Debounce delay in milliseconds (default: 500ms)
 */
export function analyzeConfidenceDebounced(
  description: string,
  callback: (result: ConfidenceApiResponse) => void,
  delay: number = DEBOUNCE_DELAY
): void {
  // Clear existing timer
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  
  // Set new timer
  debounceTimer = setTimeout(async () => {
    const result = await analyzeConfidence(description);
    callback(result);
  }, delay);
}

/**
 * Cancel pending debounced analysis
 */
export function cancelDebouncedAnalysis(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}

// ========================
// React Hook (Optional)
// ========================

/**
 * Custom hook for confidence analysis with state management
 * Usage:
 * 
 * const { score, loading, error, analyze } = useConfidenceAnalysis();
 * analyze(description);
 */
export function useConfidenceAnalysis() {
  const [state, setState] = React.useState<{
    score: number | null;
    reasoning: ConfidenceReasoning | null;
    loading: boolean;
    error: string | null;
    provider: string | null;
  }>({
    score: null,
    reasoning: null,
    loading: false,
    error: null,
    provider: null
  });
  
  const analyze = React.useCallback(async (description: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await analyzeConfidence(description);
      
      if (result.success && result.data) {
        setState({
          score: result.data.confidenceScore,
          reasoning: result.data.reasoning,
          loading: false,
          error: null,
          provider: result.metadata?.provider || null
        });
      } else {
        setState({
          score: null,
          reasoning: null,
          loading: false,
          error: result.message || result.error || 'Analysis failed',
          provider: null
        });
      }
    } catch (error) {
      setState({
        score: null,
        reasoning: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: null
      });
    }
  }, []);
  
  const analyzeDebounced = React.useCallback((description: string, delay = DEBOUNCE_DELAY) => {
    analyzeConfidenceDebounced(description, (result) => {
      if (result.success && result.data) {
        setState({
          score: result.data.confidenceScore,
          reasoning: result.data.reasoning,
          loading: false,
          error: null,
          provider: result.metadata?.provider || null
        });
      }
    }, delay);
  }, []);
  
  return {
    ...state,
    analyze,
    analyzeDebounced
  };
}

// React import for the hook
import * as React from 'react';

export default {
  analyzeConfidence,
  analyzeConfidenceDebounced,
  cancelDebouncedAnalysis,
  useConfidenceAnalysis
};
