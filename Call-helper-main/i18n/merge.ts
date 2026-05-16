export type LocaleDict = Record<string, unknown>;

export function deepMerge(target: LocaleDict, source: LocaleDict): LocaleDict {
  const out = { ...target };
  for (const [key, value] of Object.entries(source)) {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      out[key] &&
      typeof out[key] === 'object' &&
      !Array.isArray(out[key])
    ) {
      out[key] = deepMerge(out[key] as LocaleDict, value as LocaleDict);
    } else {
      out[key] = value;
    }
  }
  return out;
}

export function mergeLocales(...parts: LocaleDict[]): LocaleDict {
  return parts.reduce<LocaleDict>((acc, part) => deepMerge(acc, part), {});
}
