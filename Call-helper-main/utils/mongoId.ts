/** MongoDB ObjectId — 24 حرف hex */
export function isValidMongoObjectId(value: unknown): value is string {
  if (value == null || value === '') return false;
  const s = String(value).trim();
  return /^[a-fA-F0-9]{24}$/.test(s);
}
