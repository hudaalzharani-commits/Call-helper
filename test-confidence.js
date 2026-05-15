/**
 * Test Script for Confidence Analysis API
 * 
 * This script tests the confidence API with various Arabic problem descriptions
 * to validate accuracy and performance.
 * 
 * Usage:
 *   node test-confidence.js
 * 
 * Prerequisites:
 *   - Backend server must be running (npm run dev in backend folder)
 *   - You must be logged in (have a valid auth token)
 */

import fetch from 'node-fetch';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';

// Test cases with expected confidence ranges
const testCases = [
  {
    name: 'Very Low Confidence - Too vague',
    description: 'مشكلة',
    expectedRange: { min: 0, max: 40 }
  },
  {
    name: 'Low Confidence - Vague with negative keywords',
    description: 'شيء مو شغال مدري',
    expectedRange: { min: 0, max: 40 }
  },
  {
    name: 'Medium-Low Confidence - Partial info',
    description: 'مشكلة في الدفع',
    expectedRange: { min: 40, max: 65 }
  },
  {
    name: 'Medium Confidence - Some details',
    description: 'مشكلة في الدفع بطيء شوي',
    expectedRange: { min: 50, max: 75 }
  },
  {
    name: 'High Confidence - Detailed description',
    description: 'العميل يواجه مشكلة في تعديل بيانات الحساب البنكي منذ يومين',
    expectedRange: { min: 75, max: 95 }
  },
  {
    name: 'Very High Confidence - Comprehensive description',
    description: 'العميل يواجه مشكلة في تعديل بيانات الحساب البنكي منذ يومين، يظهر خطأ 500 عند محاولة الحفظ في النظام',
    expectedRange: { min: 80, max: 100 }
  },
  {
    name: 'Financial Problem - Clear and specific',
    description: 'العميل يحتاج إلى استرداد رسوم التحويل المالي التي تم خصمها بالخطأ من حسابه',
    expectedRange: { min: 80, max: 100 }
  },
  {
    name: 'Technical Problem - Clear and specific',
    description: 'التطبيق يتعطل عند محاولة تسجيل الدخول ويظهر خطأ في الاتصال بقاعدة البيانات',
    expectedRange: { min: 80, max: 100 }
  }
];

// Get auth token (you'll need to replace this with a real token)
// You can get it from localStorage after logging in through the frontend
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'YOUR_AUTH_TOKEN_HERE';

/**
 * Test a single description
 */
async function testConfidence(testCase) {
  console.log(`\n\u{1F4DD} Testing: ${testCase.name}`);
  console.log(`   Description: "${testCase.description}"`);
  
  try {
    const startTime = Date.now();
    
    const response = await fetch(`${API_BASE_URL}/analyze-confidence`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`
      },
      body: JSON.stringify({
        description: testCase.description
      })
    });
    
    const processingTime = Date.now() - startTime;
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.success && result.data) {
      const score = result.data.confidenceScore;
      const provider = result.metadata?.provider || 'unknown';
      const apiTime = result.metadata?.processingTime || 0;
      
      // Check if score is in expected range
      const inRange = score >= testCase.expectedRange.min && score <= testCase.expectedRange.max;
      const status = inRange ? '\u2705 PASS' : '\u274C FAIL';
      
      console.log(`   ${status} Score: ${score}% (expected: ${testCase.expectedRange.min}-${testCase.expectedRange.max}%)`);
      console.log(`   \u{1F916} Provider: ${provider}`);
      console.log(`   \u23F1\uFE0F  Processing: ${apiTime}ms (total: ${processingTime}ms)`);
      
      // Show reasoning if available
      if (result.data.reasoning) {
        console.log(`   \u{1F4CA} Reasoning:`);
        console.log(`      - Specificity: ${result.data.reasoning.specificity}%`);
        console.log(`      - Completeness: ${result.data.reasoning.completeness}%`);
        console.log(`      - Clarity: ${result.data.reasoning.clarity}%`);
        console.log(`      - Domain Relevance: ${result.data.reasoning.domainRelevance}%`);
      }
      
      // Show suggested problem type
      if (result.data.suggestedProblemType) {
        console.log(`   \u{1F3F7}\uFE0F  Suggested Type: ${result.data.suggestedProblemType}`);
      }
      
      // Show keywords
      if (result.data.keywords && result.data.keywords.length > 0) {
        console.log(`   \u{1F511} Keywords: ${result.data.keywords.slice(0, 5).join(', ')}${result.data.keywords.length > 5 ? '...' : ''}`);
      }
      
      return { success: true, inRange, score, provider };
    } else {
      console.log(`   \u274C FAIL: ${result.message || result.error}`);
      return { success: false, error: result.message || result.error };
    }
  } catch (error) {
    console.log(`   \u274C ERROR: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('\u{1F680} Starting Confidence Analysis API Tests');
  console.log('='.repeat(60));
  
  // Check auth token
  if (AUTH_TOKEN === 'YOUR_AUTH_TOKEN_HERE') {
    console.log('\u26A0\uFE0F  Warning: Using placeholder auth token.');
    console.log('To get a real token:');
    console.log('1. Log in through the frontend');
    console.log('2. Open browser console');
    console.log('3. Run: JSON.parse(localStorage.getItem("auth")).token');
    console.log('4. Set AUTH_TOKEN environment variable or update this script\n');
  }
  
  const results = [];
  let totalTime = 0;
  
  for (const testCase of testCases) {
    const startTime = Date.now();
    const result = await testConfidence(testCase);
    const testTime = Date.now() - startTime;
    totalTime += testTime;
    results.push({ ...result, testCase, testTime });
    
    // Wait a bit between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\u{1F4CA} Test Summary');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r.success);
  const inRange = results.filter(r => r.success && r.inRange);
  const failed = results.filter(r => !r.success);
  
  console.log(`\u2705 Successful: ${successful.length}/${results.length}`);
  console.log(`\u{1F3AF} In Expected Range: ${inRange.length}/${results.length}`);
  console.log(`\u274C Failed: ${failed.length}/${results.length}`);
  console.log(`\u23F1\uFE0F  Average Time: ${Math.round(totalTime / results.length)}ms`);
  
  // Provider breakdown
  const providers = {};
  successful.forEach(r => {
    providers[r.provider] = (providers[r.provider] || 0) + 1;
  });
  console.log(`\u{1F916} Providers Used:`);
  Object.entries(providers).forEach(([provider, count]) => {
    console.log(`   - ${provider}: ${count} tests`);
  });
  
  // Show failures
  if (failed.length > 0) {
    console.log('\n\u274C Failed Tests:');
    failed.forEach(r => {
      console.log(`   - ${r.testCase.name}: ${r.error}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
  
  // Exit code
  process.exit(failed.length === 0 ? 0 : 1);
}

// Run tests
runTests().catch(error => {
  console.error('\u{1F4A5} Fatal Error:', error);
  process.exit(1);
});
