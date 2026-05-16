/** يحوّل توكن CSS (مثل --primary) إلى لون محسوب rgb/hex لاستخدامه في SVG/Recharts */
export function resolveCssVariable(
  varName: string,
  property: 'color' | 'backgroundColor' | 'borderColor' = 'color',
): string {
  if (typeof document === 'undefined') return '';

  const probe = document.createElement('span');
  probe.style.setProperty(property, `var(${varName})`);
  probe.style.position = 'fixed';
  probe.style.left = '-9999px';
  probe.style.visibility = 'hidden';
  probe.style.pointerEvents = 'none';
  document.body.appendChild(probe);

  const resolved = getComputedStyle(probe)[property];
  probe.remove();

  return resolved && resolved !== 'rgba(0, 0, 0, 0)' ? resolved : '';
}
