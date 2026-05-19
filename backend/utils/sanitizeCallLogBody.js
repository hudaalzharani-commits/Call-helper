import mongoose from 'mongoose';

export function sanitizeMatchedCaseId(value) {
  if (value == null || value === '') return null;
  const s = String(value).trim();
  if (!mongoose.Types.ObjectId.isValid(s)) return null;
  if (String(new mongoose.Types.ObjectId(s)) !== s) return null;
  return s;
}

export function sanitizeCallLogBody(body = {}) {
  const out = { ...body };
  if (Object.prototype.hasOwnProperty.call(out, 'matchedCase')) {
    out.matchedCase = sanitizeMatchedCaseId(out.matchedCase);
  }
  if (typeof out.finalDisplayScore === 'number' && Number.isFinite(out.finalDisplayScore)) {
    out.finalDisplayScore = Math.min(100, Math.max(0, Math.round(out.finalDisplayScore)));
  } else if (out.finalDisplayScore != null && out.finalDisplayScore !== '') {
    const n = Number(out.finalDisplayScore);
    out.finalDisplayScore = Number.isFinite(n)
      ? Math.min(100, Math.max(0, Math.round(n)))
      : null;
  }
  if (typeof out.generatedResponse === 'string' && !out.generatedResponse.trim()) {
    out.generatedResponse = null;
  }
  return out;
}
