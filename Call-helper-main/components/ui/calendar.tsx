"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";

import { cn } from "./utils";
import { buttonVariants } from "./button";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const isRange = props.mode === "range";

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3 rdp-root", isRange && "rdp-range-enhanced", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-2",
        month: "flex flex-col gap-4",
        caption: "flex justify-center pt-1 relative items-center w-full mb-1",
        caption_label: "text-sm font-semibold text-foreground",
        nav: "flex items-center gap-1",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "size-8 bg-background p-0 opacity-80 hover:opacity-100 border-border shadow-sm",
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse",
        head_row: "flex w-full justify-between mb-1",
        head_cell: cn(
          "text-muted-foreground font-semibold text-[0.7rem] uppercase tracking-wide",
          isRange ? "w-10" : "w-8",
        ),
        row: "flex w-full mt-1",
        cell: cn(
          "relative p-0.5 text-center text-sm focus-within:relative focus-within:z-20",
          isRange
            ? "[&:has([aria-selected])]:bg-primary/15 [&:has(.day-range-start)]:rounded-s-lg [&:has(.day-range-end)]:rounded-e-lg"
            : "[&:has([aria-selected])]:bg-accent [&:has([aria-selected])]:rounded-md",
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          isRange
            ? "size-10 rounded-lg border-2 border-transparent font-medium transition-colors hover:border-primary/35 hover:bg-primary/5 aria-selected:opacity-100"
            : "size-8 p-0 font-normal aria-selected:opacity-100",
        ),
        day_range_start:
          "day-range-start !rounded-lg !border-primary !bg-primary !text-primary-foreground font-bold shadow-md ring-2 ring-primary/25",
        day_range_end:
          "day-range-end !rounded-lg !border-primary !bg-primary !text-primary-foreground font-bold shadow-md ring-2 ring-primary/25",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "border border-primary/40 bg-primary/10 font-semibold text-foreground",
        day_outside:
          "day-outside text-muted-foreground/60 aria-selected:bg-primary/10 aria-selected:text-muted-foreground",
        day_disabled: "text-muted-foreground opacity-40",
        day_range_middle:
          "day-range-middle !rounded-none !border-transparent !bg-primary/20 !text-foreground font-medium aria-selected:hover:!bg-primary/25",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return (
              <ChevronLeft
                className={cn("size-4", className)}
                {...props}
              />
            );
          }

          if (orientation === "right") {
            return (
              <ChevronRight
                className={cn("size-4", className)}
                {...props}
              />
            );
          }

          // Fallback for up/down (used in dropdowns)
          return (
            <ChevronRight
              className={cn("size-4 rotate-90", className)}
              {...props}
            />
          );
        },
      }}
      {...props}
    />
  );
}

export { Calendar };
