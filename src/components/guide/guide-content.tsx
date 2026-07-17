"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown, BookOpen } from "@/components/icons";
import { GUIDE_SECTIONS } from "@/content/guide";
import type { DeepDive, GuideSection } from "@/content/guide-types";
import { Segmented } from "@/components/ui/segmented";
import { Blocks } from "./render";
import { cn } from "@/lib/utils";

type Tab = "everyday" | "technical";

function useTocCategories() {
  return React.useMemo(() => {
    const groups: { category: string; sections: GuideSection[] }[] = [];
    for (const s of GUIDE_SECTIONS) {
      let g = groups.find((x) => x.category === s.category);
      if (!g) {
        g = { category: s.category, sections: [] };
        groups.push(g);
      }
      g.sections.push(s);
    }
    return groups;
  }, []);
}

function DeepDiveBlock({ dive, tab }: { dive: DeepDive; tab: Tab }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="rounded-lg border border-border bg-muted/30">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="text-sm font-medium text-foreground">{dive.title}</span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
        <div className="border-t border-border px-4 py-4">
          <Blocks blocks={tab === "everyday" ? dive.everyday : dive.technical} />
        </div>
      ) : null}
    </div>
  );
}

export function GuideContent() {
  const searchParams = useSearchParams();
  const groups = useTocCategories();

  const [tab, setTab] = React.useState<Tab>(
    searchParams.get("tab") === "technical" ? "technical" : "everyday",
  );
  const [activeId, setActiveId] = React.useState<string>(
    GUIDE_SECTIONS[0]?.id ?? "",
  );

  // Persist the tab in the URL (shareable) without scrolling/navigating.
  React.useEffect(() => {
    const url = new URL(window.location.href);
    if (tab === "technical") url.searchParams.set("tab", "technical");
    else url.searchParams.delete("tab");
    window.history.replaceState(null, "", url.toString());
  }, [tab]);

  // Scroll to a #hash section on first load. The scroll-spy observer below
  // takes over highlighting once the section is in view.
  React.useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const el = document.getElementById(hash);
    if (el) {
      requestAnimationFrame(() =>
        el.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    }
  }, []);

  // Scroll-spy: highlight whichever section is currently in view.
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-96px 0px -60% 0px", threshold: 0 },
    );
    for (const s of GUIDE_SECTIONS) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (el) {
      setActiveId(id);
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      const url = new URL(window.location.href);
      url.hash = id;
      window.history.replaceState(null, "", url.toString());
    }
  }

  return (
    <div className="flex gap-8">
      {/* Table of contents */}
      <aside className="sticky top-24 hidden h-[calc(100vh-8rem)] w-60 shrink-0 overflow-y-auto lg:block">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          On this page
        </p>
        <nav className="space-y-4">
          {groups.map((g) => (
            <div key={g.category}>
              <p className="px-3 pb-1 text-xs font-medium text-muted-foreground/80">
                {g.category}
              </p>
              <ul className="space-y-0.5">
                {g.sections.map((s) => {
                  const active = activeId === s.id;
                  return (
                    <li key={s.id} className="relative">
                      {active ? (
                        <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
                      ) : null}
                      <button
                        type="button"
                        onClick={() => scrollTo(s.id)}
                        className={cn(
                          "block w-full truncate rounded-md px-3 py-1.5 text-left text-sm transition-colors",
                          active
                            ? "font-medium text-primary"
                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                        )}
                      >
                        {s.title}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Tabs */}
        <div className="sticky top-16 z-10 -mx-1 mb-8 flex flex-col gap-3 border-b border-border bg-background/85 px-1 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-primary">
              <BookOpen className="size-4" />
            </span>
            <div>
              <p className="text-sm font-medium">Knowledge base</p>
              <p className="text-xs text-muted-foreground">
                Every topic, explained two ways.
              </p>
            </div>
          </div>
          <Segmented<Tab>
            value={tab}
            onChange={setTab}
            options={[
              { value: "everyday", label: "For everyday use" },
              { value: "technical", label: "Technical" },
            ]}
          />
        </div>

        <div className="space-y-12 pb-24">
          {GUIDE_SECTIONS.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {section.category}
              </p>
              <h2 className="mt-1 font-heading text-2xl font-semibold tracking-tight">
                {section.title}
              </h2>
              <div className="mt-4">
                <Blocks
                  blocks={tab === "everyday" ? section.everyday : section.technical}
                />
              </div>

              {section.deep && section.deep.length > 0 ? (
                <div className="mt-5 space-y-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Deep dive
                  </p>
                  {section.deep.map((dive, i) => (
                    <DeepDiveBlock key={i} dive={dive} tab={tab} />
                  ))}
                </div>
              ) : null}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
