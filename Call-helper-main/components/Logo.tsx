/**
 * Rafiq logo — official identity.
 *
 * Mark: inline SVG of the CH emblem (from the brand SVG, paths 1-3 only).
 *       Wordmark paths from the source SVG are intentionally NOT used —
 *       "by Rafiq" is rendered as JSX text in the site font.
 *
 * Visual behavior preserved from the previous Logo.tsx:
 *   • theme-aware (uses --foreground / --primary CSS variables)
 *   • accent-aware (CH mark + halo retint with the active accent palette)
 *   • subtle hover lift + halo brighten on group-hover
 *   • size variants: 'small' | 'default' | 'large'
 *
 * Typographic hierarchy:
 *   • CH mark = primary identity (visually dominant).
 *   • "by Rafiq" = small refined secondary signature beneath it.
 *   • The "OPERATIONS CONSOLE" tagline has been removed.
 *
 * The `showSub` prop is kept as a deprecated no-op for API back-compat.
 */

interface CHMarkProps {
  /** Visible bounding-box height in CSS pixels. The width is derived from
   *  the mark's natural aspect (~1.622). */
  height: number;
  className?: string;
}

/**
 * Inline CH mark.
 * `fill="currentColor"` lets the parent control the color via CSS — so the
 * mark retints automatically with --primary (the active accent palette).
 *
 * The viewBox is tight to the three CH paths (322 504 1380 851), so the mark
 * fills the box without ambient whitespace from the original 2048×2048 canvas.
 */
export function CHMark({ height, className = '' }: CHMarkProps) {
  // Aspect ratio = 1380 / 851 ≈ 1.622
  const width = Math.round(height * (1380 / 851));
  return (
    <svg
      role="img"
      aria-label="CH"
      width={width}
      height={height}
      viewBox="322 504 1380 851"
      preserveAspectRatio="xMidYMid meet"
      className={className}
      style={{ display: 'block', color: 'var(--primary)' }}
    >
      {/* Path 1 — H-shape (right side of CH) */}
      <path d="M 1587.86 929.964 C 1589.04 887.001 1588.07 843.752 1588.07 800.758 C 1588.07 775.621 1591.18 689.33 1584.84 670.153 C 1580.08 655.733 1571.72 657.858 1565.12 647.96 L 1565.51 646.457 C 1570.8 644.696 1654.76 645.637 1668.39 645.339 L 1669.37 646.468 C 1668.74 653.936 1655.18 657.592 1652.16 663.619 C 1648.86 670.199 1646.07 682.354 1646.06 689.726 C 1646.04 724.664 1646.11 759.821 1646.09 794.745 L 1646.05 1014.96 L 1646.2 1154.33 C 1646.32 1179.56 1642.05 1212.98 1653.03 1235.87 C 1655.51 1241.04 1672.9 1249.31 1667.96 1255.23 C 1662.07 1256.72 1655.9 1256.24 1649.75 1256.17 L 1592.22 1256.17 C 1584.65 1256.17 1575.6 1256.33 1567.94 1255.81 C 1565.88 1255.68 1565.3 1253.91 1564.48 1252.41 L 1565.31 1249.99 C 1568.65 1246.57 1572.29 1245.42 1576.71 1243.44 C 1590.69 1223.82 1588.19 1207.55 1588.15 1184.76 L 1588.04 1133.91 L 1588.08 951.986 L 1252.75 951.985 C 1251.72 962.438 1252.32 981.685 1252.32 992.993 L 1252.35 1070.67 L 1252.4 1157.61 C 1252.37 1180.56 1251.53 1202.55 1254.98 1225.34 C 1257.35 1240.95 1276.45 1247.57 1274.36 1255.17 C 1270.26 1256.66 1179.79 1257.07 1173.28 1255.46 C 1171.47 1250.03 1187.83 1238.75 1191.53 1228.17 C 1196.78 1213.17 1194.07 1124.03 1194.07 1101.98 L 1194.03 871.111 L 1194.03 749.153 C 1194.04 727.908 1194.18 706.279 1193.86 685.039 C 1193.77 679.104 1190.79 668.986 1187.9 663.854 C 1183 655.133 1180.29 654.488 1171.6 651.735 C 1170.69 648.937 1171.47 648.469 1172.42 645.039 C 1199.54 645.341 1226.59 646.849 1253.88 645.802 C 1258.21 645.636 1272.4 644.616 1275.13 646.308 C 1276.22 649.152 1276.32 647.798 1275.35 650.464 C 1272.18 653.673 1269.97 653.894 1265.5 655.32 C 1261.57 659.645 1255.33 667.88 1254.57 673.639 C 1250.65 703.126 1252.14 735.654 1252.2 765.369 L 1252.13 929.075 C 1264.57 929.63 1278.82 929.074 1291.5 929.105 C 1315.14 929.384 1338.77 929.48 1362.41 929.393 L 1587.86 929.964 z" fill="currentColor" />
      {/* Path 2 — C-shape (left side, the bigger arc with mute spot) */}
      <path d="M 726.576 534.444 C 730.21 534.226 733.851 534.161 737.49 534.252 C 822.053 536.1 903.274 568.969 961.94 630.528 C 975.92 645.198 1011.62 687.427 1012.14 710.058 C 1012.13 714.453 1009.31 721.316 1005.57 723.776 C 986.105 736.595 973.166 704.761 966.169 693.027 C 961.967 686.021 957.333 679.282 952.295 672.851 C 910.25 618.506 840.907 581.359 773.007 572.719 C 696.708 562.325 619.456 583.329 558.924 630.925 C 495.086 680.629 459.703 749.381 449.631 828.803 C 451.623 829.22 453.602 829.699 455.564 830.239 C 476.047 835.969 489.128 856.037 489.161 876.846 C 489.25 932.331 489.615 987.924 488.86 1043.41 C 488.526 1067.96 477.161 1080.7 455.87 1090.83 C 486.557 1182.62 571.84 1246.81 663.591 1268.84 C 721.928 1283.83 768.114 1278 825.383 1265.55 C 836.905 1224.89 854.899 1231.57 890.241 1219.96 C 914.193 1212.09 937.602 1204.96 957.264 1225.54 C 967.53 1236.45 972.832 1251.11 971.913 1266.06 C 971.249 1278.48 965.413 1290.7 955.895 1298.75 C 952.256 1301.81 948.125 1304.22 943.677 1305.89 C 940.798 1306.98 931.807 1308.94 928.255 1309.74 C 911.016 1313.65 884.008 1325.3 867.049 1323.67 C 848.024 1321.84 841.719 1312.16 831.567 1299.83 C 819.773 1300.65 807.365 1304.94 795.798 1306.77 C 784.272 1308.58 770.87 1309.65 759.194 1310.62 C 669.583 1317.68 580.828 1288.92 512.386 1230.65 C 474.53 1198.46 444.949 1157.66 426.127 1111.67 C 412.627 1078.37 415.956 1065.23 416.004 1029.82 L 416.118 941.018 L 416.038 860.607 C 416.025 848.004 415.412 822.699 416.835 811.329 C 424.17 752.703 454.283 686.891 493.794 643.434 C 558.819 571.915 632.133 540.497 726.576 534.444 z" fill="currentColor" />
      {/* Path 3 — small accent shape (the inner ear) */}
      <path d="M 395.189 833.721 L 397.239 834.236 C 399.783 840.678 397.958 1063.75 398 1089.77 C 384.17 1086.39 381.032 1084.6 370.353 1075.97 C 354.167 1059.26 352.722 1049.37 352.889 1026.97 C 353.242 979.701 352.924 932.362 354.049 885.11 C 354.688 858.264 371.85 843.088 395.189 833.721 z" fill="currentColor" />
    </svg>
  );
}

/* ─── IconLogo (mark only) ───────────────────────────────────────────────
   Used in compact contexts (mobile top bar). Renders only the CH mark with
   the soft accent halo behind it. No tile, no badge.

   The CH mark is naturally wider than tall (aspect ~1.62). The wrapper
   uses CSS `aspect-ratio` so it sizes to the className the consumer
   passes, while the mark fills the wrapper's height proportionally.
   ─────────────────────────────────────────────────────────────────────── */
export function IconLogo({ className = 'size-10' }: { className?: string }) {
  return (
    <div className={`relative inline-flex items-center justify-center ${className} group`}>
      {/* Soft accent halo — contained, retints with active accent palette */}
      <div
        aria-hidden
        className="absolute inset-[-15%] rounded-full blur-lg opacity-35 group-hover:opacity-55 transition-opacity duration-300"
        style={{ background: 'var(--primary)' }}
      />
      {/* CH mark — fills the wrapper's full height; the SVG handles aspect */}
      <svg
        role="img"
        aria-label="CH"
        viewBox="322 504 1380 851"
        preserveAspectRatio="xMidYMid meet"
        className="relative w-full h-full transition-transform duration-300 group-hover:scale-[1.04]"
        style={{ display: 'block', color: 'var(--primary)' }}
      >
        <path d="M 1587.86 929.964 C 1589.04 887.001 1588.07 843.752 1588.07 800.758 C 1588.07 775.621 1591.18 689.33 1584.84 670.153 C 1580.08 655.733 1571.72 657.858 1565.12 647.96 L 1565.51 646.457 C 1570.8 644.696 1654.76 645.637 1668.39 645.339 L 1669.37 646.468 C 1668.74 653.936 1655.18 657.592 1652.16 663.619 C 1648.86 670.199 1646.07 682.354 1646.06 689.726 C 1646.04 724.664 1646.11 759.821 1646.09 794.745 L 1646.05 1014.96 L 1646.2 1154.33 C 1646.32 1179.56 1642.05 1212.98 1653.03 1235.87 C 1655.51 1241.04 1672.9 1249.31 1667.96 1255.23 C 1662.07 1256.72 1655.9 1256.24 1649.75 1256.17 L 1592.22 1256.17 C 1584.65 1256.17 1575.6 1256.33 1567.94 1255.81 C 1565.88 1255.68 1565.3 1253.91 1564.48 1252.41 L 1565.31 1249.99 C 1568.65 1246.57 1572.29 1245.42 1576.71 1243.44 C 1590.69 1223.82 1588.19 1207.55 1588.15 1184.76 L 1588.04 1133.91 L 1588.08 951.986 L 1252.75 951.985 C 1251.72 962.438 1252.32 981.685 1252.32 992.993 L 1252.35 1070.67 L 1252.4 1157.61 C 1252.37 1180.56 1251.53 1202.55 1254.98 1225.34 C 1257.35 1240.95 1276.45 1247.57 1274.36 1255.17 C 1270.26 1256.66 1179.79 1257.07 1173.28 1255.46 C 1171.47 1250.03 1187.83 1238.75 1191.53 1228.17 C 1196.78 1213.17 1194.07 1124.03 1194.07 1101.98 L 1194.03 871.111 L 1194.03 749.153 C 1194.04 727.908 1194.18 706.279 1193.86 685.039 C 1193.77 679.104 1190.79 668.986 1187.9 663.854 C 1183 655.133 1180.29 654.488 1171.6 651.735 C 1170.69 648.937 1171.47 648.469 1172.42 645.039 C 1199.54 645.341 1226.59 646.849 1253.88 645.802 C 1258.21 645.636 1272.4 644.616 1275.13 646.308 C 1276.22 649.152 1276.32 647.798 1275.35 650.464 C 1272.18 653.673 1269.97 653.894 1265.5 655.32 C 1261.57 659.645 1255.33 667.88 1254.57 673.639 C 1250.65 703.126 1252.14 735.654 1252.2 765.369 L 1252.13 929.075 C 1264.57 929.63 1278.82 929.074 1291.5 929.105 C 1315.14 929.384 1338.77 929.48 1362.41 929.393 L 1587.86 929.964 z" fill="currentColor" />
        <path d="M 726.576 534.444 C 730.21 534.226 733.851 534.161 737.49 534.252 C 822.053 536.1 903.274 568.969 961.94 630.528 C 975.92 645.198 1011.62 687.427 1012.14 710.058 C 1012.13 714.453 1009.31 721.316 1005.57 723.776 C 986.105 736.595 973.166 704.761 966.169 693.027 C 961.967 686.021 957.333 679.282 952.295 672.851 C 910.25 618.506 840.907 581.359 773.007 572.719 C 696.708 562.325 619.456 583.329 558.924 630.925 C 495.086 680.629 459.703 749.381 449.631 828.803 C 451.623 829.22 453.602 829.699 455.564 830.239 C 476.047 835.969 489.128 856.037 489.161 876.846 C 489.25 932.331 489.615 987.924 488.86 1043.41 C 488.526 1067.96 477.161 1080.7 455.87 1090.83 C 486.557 1182.62 571.84 1246.81 663.591 1268.84 C 721.928 1283.83 768.114 1278 825.383 1265.55 C 836.905 1224.89 854.899 1231.57 890.241 1219.96 C 914.193 1212.09 937.602 1204.96 957.264 1225.54 C 967.53 1236.45 972.832 1251.11 971.913 1266.06 C 971.249 1278.48 965.413 1290.7 955.895 1298.75 C 952.256 1301.81 948.125 1304.22 943.677 1305.89 C 940.798 1306.98 931.807 1308.94 928.255 1309.74 C 911.016 1313.65 884.008 1325.3 867.049 1323.67 C 848.024 1321.84 841.719 1312.16 831.567 1299.83 C 819.773 1300.65 807.365 1304.94 795.798 1306.77 C 784.272 1308.58 770.87 1309.65 759.194 1310.62 C 669.583 1317.68 580.828 1288.92 512.386 1230.65 C 474.53 1198.46 444.949 1157.66 426.127 1111.67 C 412.627 1078.37 415.956 1065.23 416.004 1029.82 L 416.118 941.018 L 416.038 860.607 C 416.025 848.004 415.412 822.699 416.835 811.329 C 424.17 752.703 454.283 686.891 493.794 643.434 C 558.819 571.915 632.133 540.497 726.576 534.444 z" fill="currentColor" />
        <path d="M 395.189 833.721 L 397.239 834.236 C 399.783 840.678 397.958 1063.75 398 1089.77 C 384.17 1086.39 381.032 1084.6 370.353 1075.97 C 354.167 1059.26 352.722 1049.37 352.889 1026.97 C 353.242 979.701 352.924 932.362 354.049 885.11 C 354.688 858.264 371.85 843.088 395.189 833.721 z" fill="currentColor" />
      </svg>
    </div>
  );
}

/* ─── Logo (mark + wordmark) ─────────────────────────────────────────────
   The full lockup. CH mark on the left as the dominant identity, "by Rafiq"
   to its right as a small refined secondary signature in the site font.
   The "OPERATIONS CONSOLE" tagline was removed for a cleaner balance.
   API matches the previous Logo for drop-in replacement.
   ─────────────────────────────────────────────────────────────────────── */
export function Logo({
  size = 'default',
  /** @deprecated kept for API back-compat; tagline is no longer rendered */
  showSub: _showSub,
}: {
  size?: 'default' | 'large' | 'small';
  showSub?: boolean;
}) {
  // CH mark stays dominant. Bumped slightly so the mark reads as the lead
  // identity now that the tagline is gone.
  const markHeight = size === 'large' ? 42 : size === 'small' ? 26 : 32;

  // "by Rafiq" — small, light, refined. Tracks normally; not a headline.
  const labelSize = size === 'large' ? 'text-[13px]' : size === 'small' ? 'text-[10px]' : 'text-[11px]';

  // Halo grows with the mark; stays contained.
  const haloInset = size === 'large' ? '-inset-3' : size === 'small' ? '-inset-1.5' : '-inset-2';

  return (
    <div className="flex items-center gap-2.5 group" dir="ltr">
      {/* CH mark with soft halo — no tile / no orange box */}
      <div className="relative inline-flex items-center justify-center transition-transform duration-300 group-hover:scale-[1.03]">
        <div
          aria-hidden
          className={`absolute ${haloInset} rounded-full blur-xl opacity-35 group-hover:opacity-55 transition-opacity duration-300`}
          style={{ background: 'var(--primary)' }}
        />
        <CHMark height={markHeight} className="relative" />
      </div>

      {/* "by Rafiq" — refined secondary signature, small + light, not a headline.
          Slight letter-spacing (+0.04em) gives it elegance at small size. */}
      <span
        className={`${labelSize} font-normal tracking-[0.04em] leading-none whitespace-nowrap`}
        style={{ color: 'var(--muted-foreground)' }}
      >
        by{' '}
        <span style={{ color: 'var(--foreground)' }} className="font-medium">
          Rafiq
        </span>
      </span>
    </div>
  );
}
