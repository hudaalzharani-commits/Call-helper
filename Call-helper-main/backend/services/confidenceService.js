/**
 * Confidence Calculation Service
 * 
 * AI-powered semantic analysis to determine problem description quality
 * Replaces the simple keyword-based frontend calculation with intelligent scoring
 */

// Import keyword patterns from frontend for fallback
const POSITIVE_KEYWORDS = [
  { keywords: ['تعطل', 'عطل', 'خطأ', 'مشكلة', 'لا يعمل', 'توقف'], weight: 15 },
  { keywords: ['نظام', 'برنامج', 'تطبيق', 'موقع', 'منصة'], weight: 12 },
  { keywords: ['دفع', 'مالي', 'فاتورة', 'رسوم', 'تحويل', 'استرداد'], weight: 12 },
  { keywords: ['تشغيلي', 'عملية', 'إجراء', 'خدمة', 'معالجة'], weight: 10 },
  { keywords: ['شكوى', 'اعتراض', 'استياء', 'غير راضي'], weight: 10 },
  { keywords: ['استفسار', 'سؤال', 'معلومات', 'توضيح'], weight: 8 }
];

const NEGATIVE_KEYWORDS = [
  'شيء', 'شي', 'حاجة', 'مدري', 'ما أدري', 'تقريبا', 
  'ممكن', 'يمكن', 'شوف', 'شف', 'كذا', 'مو متأكد', 'مش متأكد'
];

const PROBLEM_TYPES = [
  {
    id: 'technical',
    name: 'مشكلة تقنية',
    keywords: ['تعطل', 'خطأ', 'نظام', 'برنامج', 'تطبيق', 'موقع', 'لا يعمل', 'بطء', 'انقطاع']
  },
  {
    id: 'operational',
    name: 'مشكلة تشغيلية',
    keywords: ['عملية', 'إجراء', 'خدمة', 'تأخير', 'معالجة', 'تنفيذ', 'تشغيل']
  },
  {
    id: 'financial',
    name: 'مشكلة مالية',
    keywords: ['دفع', 'فاتورة', 'رسوم', 'مبلغ', 'تحويل', 'استرداد', 'خصم', 'مالي']
  },
  {
    id: 'complaint',
    name: 'شكوى',
    keywords: ['شكوى', 'اعتراض', 'استياء', 'غير راضي', 'سيء', 'رديء']
  },
  {
    id: 'general_inquiry',
    name: 'استفسار عام',
    keywords: ['استفسار', 'سؤال', 'معلومات', 'توضيح', 'كيف', 'هل', 'متى']
  }
];

/**
 * Main confidence analysis function
 * @param {string} description - Problem description text
 * @returns {Promise<Object>} Confidence analysis result
 */
export async function analyzeConfidence(description) {
  const startTime = Date.now();
  
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
        recommendations: [
          'Description is too short',
          'Please provide at least 10 characters',
          'Include details about what went wrong'
        ]
      },
      metadata: {
        provider: 'validation',
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime
      }
    };
  }
  
  // Check if AI is enabled
  const useAI = process.env.ENABLE_AI_CONFIDENCE !== 'false';
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (useAI && apiKey) {
    try {
      // Use OpenAI for intelligent analysis
      const result = await analyzeWithOpenAI(description, startTime);
      return result;
    } catch (error) {
      console.warn('⚠️ OpenAI analysis failed, falling back to keyword analysis:', error.message);
      return analyzeFallback(description, startTime, 'openai_error');
    }
  } else {
    // Use fallback keyword analysis
    console.log('ℹ️ Using fallback keyword-based analysis (no AI API key)');
    return analyzeFallback(description, startTime, 'no_api_key');
  }
}

/**
 * AI-powered analysis using OpenAI GPT-4
 */
async function analyzeWithOpenAI(description, startTime) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-4';
  const timeout = parseInt(process.env.CONFIDENCE_API_TIMEOUT) || 5000;
  
  const prompt = buildAnalysisPrompt(description);
  
  // Create timeout promise
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('API timeout')), timeout);
  });
  
  // Create API call promise
  const apiPromise = fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert Arabic language analyst specializing in customer service problem descriptions. Analyze text quality and provide structured JSON output only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3, // Low temperature for consistent scoring
      max_tokens: 500
    })
  });
  
  // Race between API call and timeout
  const response = await Promise.race([apiPromise, timeoutPromise]);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API Error: ${error.error?.message || response.statusText}`);
  }
  
  const data = await response.json();
  const content = data.choices[0]?.message?.content || '';
  
  // Parse JSON response from AI
  try {
    const analysisResult = JSON.parse(content);
    
    return {
      success: true,
      data: {
        confidenceScore: analysisResult.confidenceScore,
        reasoning: analysisResult.reasoning,
        suggestedProblemType: analysisResult.suggestedProblemType,
        keywords: analysisResult.keywords || [],
        recommendations: analysisResult.recommendations || []
      },
      metadata: {
        provider: 'openai',
        model: data.model,
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime
      }
    };
  } catch (parseError) {
    console.error('❌ Failed to parse AI response:', content);
    throw new Error('Invalid JSON response from AI');
  }
}

/**
 * Build analysis prompt for AI
 */
function buildAnalysisPrompt(description) {
  return `
Analyze this Arabic customer service problem description and provide a confidence score (0-100) based on clarity, completeness, and specificity.

**Problem Description:**
"${description}"

**Analysis Criteria:**
1. **Specificity** (0-100): Does it mention specific systems, features, or error messages?
2. **Completeness** (0-100): Does it answer who, what, when, where, why?
3. **Clarity** (0-100): Is it well-structured and easy to understand?
4. **Domain Relevance** (0-100): Does it use appropriate domain terminology?

**Problem Type Categories:**
- technical: Technical/system issues (تعطل، خطأ، نظام، برنامج)
- operational: Process/operational issues (عملية، إجراء، خدمة)
- financial: Financial/payment issues (دفع، فاتورة، رسوم، مالي)
- complaint: Customer complaints (شكوى، اعتراض، استياء)
- general_inquiry: General questions (استفسار، سؤال، معلومات)

**Return JSON only in this exact format:**
{
  "confidenceScore": <number 0-100>,
  "reasoning": {
    "specificity": <number 0-100>,
    "completeness": <number 0-100>,
    "clarity": <number 0-100>,
    "domainRelevance": <number 0-100>
  },
  "suggestedProblemType": "<technical|operational|financial|complaint|general_inquiry|null>",
  "keywords": ["<keyword1>", "<keyword2>", ...],
  "recommendations": ["<recommendation1>", "<recommendation2>", ...]
}

**Scoring Guidelines:**
- 80-100: Excellent - detailed, specific, complete
- 50-79: Good - has key information but could be more detailed
- 0-49: Poor - vague, incomplete, needs clarification

**Examples:**
- "مشكلة" → Score: 20 (too vague)
- "مشكلة في الدفع" → Score: 55 (partial info)
- "العميل يواجه مشكلة في تعديل بيانات الحساب البنكي منذ يومين، يظهر خطأ عند الحفظ" → Score: 85 (detailed)
`.trim();
}

/**
 * Fallback keyword-based analysis (enhanced version of frontend logic)
 */
function analyzeFallback(description, startTime, reason) {
  const lowerDescription = description.toLowerCase();
  let score = 30; // Base score
  
  // Calculate keyword-based score
  const keywordData = calculateKeywordScore(lowerDescription);
  score += keywordData.score;
  
  // Length analysis
  const wordCount = description.trim().split(/\s+/).length;
  let lengthBonus = 0;
  if (wordCount > 15) {
    lengthBonus = 10;
  } else if (wordCount > 8) {
    lengthBonus = 5;
  }
  score += lengthBonus;
  
  // Structure analysis (new enhancement)
  const hasNumbers = /\d+/.test(description);
  const hasPunctuation = /[،؛؟,.!?;:()[\]{}]/.test(description);
  if (hasNumbers) score += 5; // Specific numbers/codes mentioned
  if (hasPunctuation) score += 3; // Well-structured sentences
  
  // Clamp score
  score = Math.max(0, Math.min(100, score));
  
  // Calculate reasoning breakdown
  const reasoning = {
    specificity: keywordData.positiveScore > 20 ? 70 : 40,
    completeness: wordCount > 15 ? 70 : (wordCount > 8 ? 50 : 30),
    clarity: keywordData.negativeScore > 0 ? 40 : 60,
    domainRelevance: keywordData.domainScore
  };
  
  // Suggest problem type
  const suggestedType = suggestProblemTypeFallback(lowerDescription);
  
  // Generate recommendations
  const recommendations = generateRecommendations(score, wordCount, keywordData);
  
  return {
    success: true,
    data: {
      confidenceScore: score,
      reasoning: reasoning,
      suggestedProblemType: suggestedType,
      keywords: keywordData.foundKeywords,
      recommendations: recommendations
    },
    metadata: {
      provider: 'fallback',
      reason: reason,
      timestamp: new Date().toISOString(),
      processingTime: Date.now() - startTime
    }
  };
}

/**
 * Calculate keyword-based score
 */
function calculateKeywordScore(lowerDescription) {
  let positiveScore = 0;
  let negativeScore = 0;
  let domainScore = 50; // Default
  const foundKeywords = [];
  
  // Check positive keywords
  POSITIVE_KEYWORDS.forEach(pattern => {
    pattern.keywords.forEach(keyword => {
      if (lowerDescription.includes(keyword.toLowerCase())) {
        positiveScore += pattern.weight;
        foundKeywords.push(keyword);
        if (pattern.weight >= 12) domainScore = 80; // Strong domain keyword
      }
    });
  });
  
  // Check negative keywords
  NEGATIVE_KEYWORDS.forEach(keyword => {
    if (lowerDescription.includes(keyword.toLowerCase())) {
      negativeScore += 8;
      foundKeywords.push(keyword + ' (-)');
    }
  });
  
  return {
    score: positiveScore - negativeScore,
    positiveScore,
    negativeScore,
    domainScore,
    foundKeywords
  };
}

/**
 * Suggest problem type based on keywords
 */
function suggestProblemTypeFallback(lowerDescription) {
  let bestMatch = { typeId: null, score: 0 };
  
  PROBLEM_TYPES.forEach(type => {
    let typeScore = 0;
    type.keywords.forEach(keyword => {
      if (lowerDescription.includes(keyword.toLowerCase())) {
        typeScore += 1;
      }
    });
    
    if (typeScore > bestMatch.score) {
      bestMatch = { typeId: type.id, score: typeScore };
    }
  });
  
  return bestMatch.score > 0 ? bestMatch.typeId : null;
}

/**
 * Generate actionable recommendations
 */
function generateRecommendations(score, wordCount, keywordData) {
  const recommendations = [];
  
  if (score >= 80) {
    recommendations.push('Description is clear and specific');
    recommendations.push('Contains relevant domain keywords');
    recommendations.push('Good level of detail provided');
  } else if (score >= 50) {
    recommendations.push('Description has key information');
    if (wordCount < 15) {
      recommendations.push('Consider adding more context (when, where, what happened)');
    }
    if (keywordData.negativeScore > 0) {
      recommendations.push('Try to be more specific and avoid vague terms');
    }
  } else {
    recommendations.push('Add more specific details about the problem');
    recommendations.push('Include when the issue started');
    recommendations.push('Mention any error messages or codes');
    recommendations.push('Specify which service or system is affected');
  }
  
  return recommendations;
}

export default {
  analyzeConfidence
};
