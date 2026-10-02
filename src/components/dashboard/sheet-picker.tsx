"use client";

import * as React from "react";
import { Plus } from "@/components/icons";
import { LOCATION_OPTIONS } from "@/config/resources";
import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/select";

export interface OpenSheet {
  id: string;
  reference: string;
  location: string;
  totalShipments: number;
}

/** What the user picked: an open sheet's id, or "new" (with where the new sheet dispatches from). */
export interface SheetChoice {
  target: string;
  location?: string;
}

/**
 * Choose the load sheet parcels go on — one of the courier's open (Draft)
 * sheets, or a new one. Nothing is preselected unless `value` says so: the
 * sheet is always the user's choice (see resolveLoadSheet()).
 */
export function SheetPicker({
  courier,
  sheets,
  value,
  onChange,
  name,
  allowNew = true,
  exclude,
}: {
  courier: string;
  sheets: OpenSheet[];
  value: SheetChoice | null;
  onChange: (choice: SheetChoice) => void;
  /** radio group name — must be unique on the page */
  name: string;
  allowNew?: boolean;
  /** a sheet not to offer (the one the parcel is already on) */
  exclude?: string;
}) {
  const options = sheets.filter((s) => s.id !== exclude);
  const isNew = value?.target === "new";
  return (
    <div className="space-y-2">
      {options.length === 0 && !allowNew ? (
        <p className="text-sm text-muted-foreground">{courier} has no other open sheets.</p>
      ) : null}
      {options.map((s) => (
        <label key={s.id} className={optionClass}>
          <input
            type="radio"
            name={name}
            className="mt-0.5 size-4 accent-primary"
            checked={value?.target === s.id}
            onChange={() => onChange({ target: s.id })}
          />
          <span className="min-w-0">
            <span className="font-mono font-medium">{s.reference}</span>
            <span className="text-muted-foreground">
              {" "}
              · {s.location || "—"} · {s.totalShipments} {s.totalShipments === 1 ? "parcel" : "parcels"}
            </span>
          </span>
        </label>
      ))}
      {allowNew ? (
        <label className={optionClass}>
          <input
            type="radio"
            name={name}
            className="mt-0.5 size-4 accent-primary"
            checked={isNew}
            onChange={() => onChange({ target: "new", location: value?.location || LOCATION_OPTIONS[0].value })}
          />
          <span className="flex min-w-0 flex-1 flex-col gap-2">
            <span className="flex items-center gap-1.5">
              <Plus className="size-3.5" />
              Start a new {courier} sheet
            </span>
            {isNew ? (
              <Select
                aria-label="Dispatching from"
                value={value?.location || LOCATION_OPTIONS[0].value}
                onChange={(e) => onChange({ target: "new", location: e.target.value })}
              >
                {LOCATION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    From {o.label}
                  </option>
                ))}
              </Select>
            ) : null}
          </span>
        </label>
      ) : null}
    </div>
  );
}

const optionClass = cn(
  "flex cursor-pointer items-start gap-2.5 rounded-lg border border-border px-3 py-2.5 text-sm transition-colors",
  "hover:bg-accent has-[:checked]:border-primary has-[:checked]:bg-primary/5",
);

/** Open sheets for a courier from the dispatch resource rows. */
export function openSheetsFor(rows: Record<string, unknown>[], courier: string): OpenSheet[] {
  return rows
    .filter((s) => s.status === "draft" && s.courier === courier)
    .map((s) => ({
      id: String(s.id),
      reference: String(s.reference ?? ""),
      location: String(s.location ?? ""),
      totalShipments: Number(s.totalShipments ?? 0),
    }));
}
