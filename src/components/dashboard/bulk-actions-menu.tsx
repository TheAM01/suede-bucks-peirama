"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  SlidersHorizontal,
  Trash2,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from "@/components/ui/menu";

export interface BulkActionsMenuProps {
  /** selected row count — drives labels */
  count: number;
  /** singular / plural noun for labels, e.g. ["order", "orders"] */
  noun: [string, string];
  busy?: boolean;
  /** omit when rows have no detail page */
  onOpenInNewTab?: () => void;
  /** omit when the resource can't be edited; pass `editDisabled` to show it greyed out */
  onEdit?: () => void;
  /** why Edit is unavailable right now (e.g. more than one row selected) — disables it */
  editDisabled?: string;
  /** Advanced › Move to — the manual stage override; omit when it doesn't apply */
  moveOptions?: { value: string; label: string }[];
  onMove?: (value: string) => void;
  /** omit when rows can't be deleted */
  onDelete?: () => void;
  deleteLabel?: string;
}

/**
 * The selection bar's ⋯ menu, shared by the generic bulk bar and the Orders
 * control panel. Order: the safe, everyday actions first (Open in new tab,
 * Edit), then Advanced › (the manual Move-to override, one level down because
 * it skips the workflow), and Delete last, set apart by a divider.
 */
export function BulkActionsMenu(props: BulkActionsMenuProps) {
  const nothing = !props.onOpenInNewTab && !props.onEdit && !props.moveOptions?.length && !props.onDelete;
  if (nothing) return null;
  return (
    <Menu>
      <MenuTrigger>
        <Button variant="outline" size="icon-sm" className="shrink-0" disabled={props.busy} aria-label="More actions">
          <MoreHorizontal />
        </Button>
      </MenuTrigger>
      <MenuContent width="w-56">
        {/* Remounts on every open, so the menu always starts at its top level. */}
        <BulkMenuBody {...props} />
      </MenuContent>
    </Menu>
  );
}

function BulkMenuBody({
  count,
  noun,
  onOpenInNewTab,
  onEdit,
  editDisabled,
  moveOptions,
  onMove,
  onDelete,
  deleteLabel = "Delete",
}: BulkActionsMenuProps) {
  const [view, setView] = React.useState<"main" | "advanced">("main");
  const many = count === 1 ? noun[0] : noun[1];
  const hasAdvanced = Boolean(moveOptions?.length && onMove);

  if (view === "advanced" && hasAdvanced) {
    return (
      <>
        <MenuItem keepOpen onSelect={() => setView("main")}>
          <ChevronLeft />
          Back
        </MenuItem>
        <MenuSeparator />
        <MenuLabel>Move {count} {many} to</MenuLabel>
        {moveOptions!.map((o) => (
          <MenuItem key={o.value} onSelect={() => onMove!(o.value)}>
            {o.label}
          </MenuItem>
        ))}
      </>
    );
  }

  const top = Boolean(onOpenInNewTab || onEdit || hasAdvanced);
  return (
    <>
      {onOpenInNewTab ? (
        <MenuItem onSelect={onOpenInNewTab}>
          <ExternalLink />
          {count === 1 ? "Open in new tab" : `Open ${count} in new tabs`}
        </MenuItem>
      ) : null}
      {onEdit ? (
        <MenuItem onSelect={onEdit} disabled={Boolean(editDisabled)} title={editDisabled}>
          <Pencil />
          Edit
        </MenuItem>
      ) : null}
      {hasAdvanced ? (
        <MenuItem keepOpen onSelect={() => setView("advanced")}>
          <SlidersHorizontal />
          <span className="flex-1 text-left">Advanced</span>
          <ChevronRight />
        </MenuItem>
      ) : null}
      {onDelete ? (
        <>
          {top ? <MenuSeparator /> : null}
          <MenuItem destructive onSelect={onDelete}>
            <Trash2 />
            {deleteLabel}
          </MenuItem>
        </>
      ) : null}
    </>
  );
}

/** Open each row's detail page in its own tab. Called straight from the click, so browsers treat it as user-initiated (some still allow only the first). */
export function openInNewTabs(hrefs: string[]) {
  for (const href of hrefs) window.open(href, "_blank", "noopener");
}
