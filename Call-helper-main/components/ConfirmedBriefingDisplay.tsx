import { User, Building2, FileText, GitBranch, Lightbulb } from "lucide-react";
import type { ConfirmedBriefingRow } from "../services/analyticsService";
import {
  AR_BRIEFING_LABELS,
  buildConfirmedBriefingView,
  type BriefingRouteStep,
} from "../utils/briefingDisplay";

function BriefingField({
  icon: Icon,
  label,
  value,
  multiline,
}: {
  icon: typeof User;
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div className="flex gap-3 text-right">
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/80 text-muted-foreground"
        aria-hidden
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-[11px] font-semibold tracking-wide text-muted-foreground">
          {label}
        </p>
        <p
          className={`text-sm font-semibold text-foreground leading-relaxed ${
            multiline ? "whitespace-pre-wrap break-words" : "break-words"
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function RouteStepRow({ step }: { step: BriefingRouteStep }) {
  const hasPath = Boolean(step.routeName || step.stepName);

  return (
    <li className="flex gap-2.5 rounded-lg border border-primary/15 bg-background/90 px-3 py-2.5 shadow-sm">
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground"
        aria-hidden
      >
        {step.index}
      </span>
      <div className="min-w-0 flex-1 space-y-1 text-right">
        {step.routeName ? (
          <p className="text-sm font-bold text-primary leading-snug">{step.routeName}</p>
        ) : null}
        {step.stepName ? (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">الخطوة:</span> {step.stepName}
          </p>
        ) : null}
        <p className={`text-sm text-foreground ${hasPath ? "font-medium" : "font-semibold"}`}>
          {hasPath ? (
            <>
              <span className="text-muted-foreground font-normal">الاختيار: </span>
              {step.choiceName}
            </>
          ) : (
            step.choiceName
          )}
        </p>
      </div>
    </li>
  );
}

export function ConfirmedBriefingDisplay({ row }: { row: ConfirmedBriefingRow }) {
  const view = buildConfirmedBriefingView(row);
  const labels = AR_BRIEFING_LABELS;
  const hasMeta =
    view.customerName || view.entityType || view.problemSummary;
  const hasRoutes = view.routes.length > 0;
  const hasSolution = Boolean(view.solution?.trim());

  if (!hasMeta && !hasRoutes && !hasSolution) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">—</p>
    );
  }

  return (
    <div className="space-y-4 text-right" dir="rtl">
      {(view.customerName || view.entityType) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {view.customerName ? (
            <BriefingField
              icon={User}
              label={labels.customer}
              value={view.customerName}
            />
          ) : null}
          {view.entityType ? (
            <BriefingField
              icon={Building2}
              label={labels.entity}
              value={view.entityType}
            />
          ) : null}
        </div>
      )}

      {view.problemSummary ? (
        <BriefingField
          icon={FileText}
          label={labels.problem}
          value={view.problemSummary}
          multiline
        />
      ) : null}

      {hasRoutes ? (
        <section className="rounded-xl border border-primary/25 bg-primary/[0.06] p-3.5 space-y-2.5 dark:bg-primary/10">
          <div className="flex items-center gap-2 text-primary">
            <GitBranch className="size-4 shrink-0" aria-hidden />
            <h4 className="text-xs font-bold tracking-wide">{labels.extraRoutes}</h4>
          </div>
          <ol className="space-y-2 list-none m-0 p-0">
            {view.routes.map((step) => (
              <RouteStepRow key={step.index} step={step} />
            ))}
          </ol>
        </section>
      ) : null}

      {hasSolution ? (
        <section className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.08] p-3.5 space-y-2 dark:bg-emerald-500/10">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
            <Lightbulb className="size-4 shrink-0" aria-hidden />
            <h4 className="text-xs font-bold tracking-wide">{labels.solution}</h4>
          </div>
          <p className="text-sm font-medium leading-relaxed text-foreground whitespace-pre-wrap break-words">
            {view.solution}
          </p>
        </section>
      ) : null}
    </div>
  );
}
