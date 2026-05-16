/** SVG defs — معرفات فريدة لكل مخطط (تجنب تعارض url(#id) بين عدة SVG في الصفحة) */
export function DashboardChartDefs({
  idPrefix = 'dash',
  primary = '#D43E20',
  accent = '#B8941F',
}: {
  idPrefix?: string;
  primary?: string;
  accent?: string;
}) {
  const p = idPrefix.replace(/:/g, '');
  const areaId = `${p}-area-primary`;
  const areaAccentId = `${p}-area-accent`;

  return (
    <defs>
      <linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor={primary} stopOpacity={0.55} />
        <stop offset="95%" stopColor={primary} stopOpacity={0.06} />
      </linearGradient>
      <linearGradient id={areaAccentId} x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor={accent} stopOpacity={0.45} />
        <stop offset="95%" stopColor={accent} stopOpacity={0.06} />
      </linearGradient>
    </defs>
  );
}

export function dashAreaFillId(idPrefix: string): string {
  return `${idPrefix.replace(/:/g, '')}-area-primary`;
}

export function dashAreaAccentFillId(idPrefix: string): string {
  return `${idPrefix.replace(/:/g, '')}-area-accent`;
}
