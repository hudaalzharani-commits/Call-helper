import { useEffect, useState } from "react";

export type CallHelperThinkingStep = { id: string; text: string; enLine: string };

type Props = {
  steps: CallHelperThinkingStep[];
};

export const THINKING_NEXT_MOVE_LABEL = "THINKING IN NEXT MOVE";

function delayForChar(ch: string): number {
  if (ch === " " || ch === "\n") return 18;
  return 26;
}

/** يطابق مدة كتابة السطر الإنجليزي المعروض لكل مرحلة */
export function estimateThinkingStepTypingMs(enLine: string): number {
  const line = enLine.trim() || THINKING_NEXT_MOVE_LABEL;
  let ms = 0;
  for (const ch of line) ms += delayForChar(ch);
  return ms + 200;
}

/**
 * طبقة عرض فقط — سطر إنجليزي بسيط (بدون إطار)، يُعرض تحت زر التوليد.
 */
export function CallHelperThinkingVisualization({ steps }: Props) {
  const step = steps.length ? steps[steps.length - 1] : null;
  const stepId = step?.id ?? "";

  const en = (step?.enLine || THINKING_NEXT_MOVE_LABEL).trim() || THINKING_NEXT_MOVE_LABEL;

  const [labelTyped, setLabelTyped] = useState("");
  const [showCursor, setShowCursor] = useState(false);

  useEffect(() => {
    if (!stepId) {
      setLabelTyped("");
      setShowCursor(false);
      return;
    }

    setLabelTyped("");
    setShowCursor(true);

    const chars = [...en];
    let i = 0;
    let cancelled = false;
    let tid: ReturnType<typeof setTimeout> | undefined;

    const clear = () => {
      cancelled = true;
      if (tid !== undefined) clearTimeout(tid);
    };

    const tick = () => {
      if (cancelled) return;
      if (i < chars.length) {
        i += 1;
        setLabelTyped(chars.slice(0, i).join(""));
        tid = setTimeout(tick, delayForChar(chars[i - 1]!));
        return;
      }
      tid = setTimeout(() => {
        if (!cancelled) setShowCursor(false);
      }, 260);
    };

    tick();
    return clear;
  }, [stepId, en]);

  if (!step) return null;

  return (
    <p
      dir="ltr"
      className="mt-2 text-left text-[11px] font-mono font-normal uppercase tracking-[0.14em] text-muted-foreground/90 m-0 leading-normal"
      role="status"
      aria-live="polite"
    >
      {labelTyped}
      {showCursor ? (
        <span
          className="inline-block w-px h-[1em] bg-muted-foreground/65 align-middle ms-0.5 animate-pulse"
          aria-hidden
        />
      ) : null}
      <span className="sr-only">{step.text}</span>
    </p>
  );
}
