"use client";

import * as React from "react";

/**
 * Pins a selection bar to the bottom of the viewport, just above the bottom
 * bar, aligned with the content column (past the sidebar at lg+, via the
 * shell's `--content-left`). A spacer of the same height stays in the page
 * flow so the bar never covers the last table rows.
 */
export function SelectionDock({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div aria-hidden className="h-24 sm:h-16" />
      <div className="pointer-events-none fixed inset-x-0 bottom-10 z-30 transition-all duration-300 lg:left-[var(--content-left)]">
        <div className="mx-auto w-full max-w-[1600px] px-4 md:px-8">
          <div className="pointer-events-auto">{children}</div>
        </div>
      </div>
    </>
  );
}
