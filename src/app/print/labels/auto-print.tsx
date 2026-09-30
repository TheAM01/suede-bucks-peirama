"use client";

import * as React from "react";

/** Opens the browser print dialog once the labels have rendered. */
export function AutoPrint({ ready }: { ready: boolean }) {
  React.useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => window.print(), 300);
    return () => clearTimeout(t);
  }, [ready]);
  return null;
}
