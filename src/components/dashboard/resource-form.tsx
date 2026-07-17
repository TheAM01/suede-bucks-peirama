"use client";

import * as React from "react";
import type { ResourceConfig, ResourceField, Row } from "@/config/resource-types";
import { useResource } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type FormValues = Record<string, string>;

/** `multiselect` values ride through the string-valued form state as a joined
 *  id list, and are split back into an array by `coerceValues`. */
const MULTI_SEP = ",";

export const splitIds = (val: string): string[] =>
  val ? val.split(MULTI_SEP).filter(Boolean) : [];

export const joinIds = (ids: string[]): string => ids.join(MULTI_SEP);

/** Build initial string-valued form state from a row (or blanks). */
export function initialValues(config: ResourceConfig, row?: Row): FormValues {
  const v: FormValues = {};
  for (const f of config.fields) {
    const raw = row?.[f.key];
    if (f.type === "multiselect") {
      v[f.key] = Array.isArray(raw)
        ? joinIds(raw.filter((x): x is string => typeof x === "string"))
        : "";
    } else if (raw !== undefined && raw !== null) v[f.key] = String(raw);
    else if (f.type === "status" || f.type === "select")
      v[f.key] = f.options?.[0]?.value ?? "";
    else v[f.key] = "";
  }
  return v;
}

/** Coerce string form values back into typed row values. */
export function coerceValues(config: ResourceConfig, values: FormValues): Row {
  const out: Record<string, unknown> = {};
  for (const f of config.fields) {
    const val = values[f.key];
    if (f.type === "number" || f.type === "currency") {
      out[f.key] = val === "" ? 0 : Number(val);
    } else if (f.type === "multiselect") {
      out[f.key] = splitIds(val ?? "");
    } else {
      out[f.key] = val;
    }
  }
  return out as Row;
}

export const RESOURCE_FORM_ID = "resource-form";

/** Select whose options come live from another resource (`field.optionsFrom`). */
function DynamicSelect({
  field,
  value,
  onChange,
}: {
  field: ResourceField;
  value: string;
  onChange: (v: string) => void;
}) {
  const src = field.optionsFrom!;
  const { rows, loading } = useResource(src.resource);
  const options = rows
    .map((r) => {
      const sub = src.subKey ? String(r[src.subKey] ?? "") : "";
      return {
        value: String(r[src.valueKey] ?? ""),
        label: String(r[src.labelKey] ?? "") + (sub ? ` (${sub})` : ""),
      };
    })
    .filter((o) => o.value && o.label);
  // A saved value can vanish from the source (e.g. deleted in Shopify) —
  // keep it selectable so the edit form doesn't silently blank the field.
  const stale = value !== "" && !options.some((o) => o.value === value);
  return (
    <Select
      id={field.key}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={field.required}
      disabled={loading}
    >
      <option value="" disabled>
        {loading ? "Loading…" : field.placeholder ?? `Select ${field.label.toLowerCase()}…`}
      </option>
      {stale ? <option value={value}>Saved selection (no longer listed)</option> : null}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}

/** Searchable multi-select over another resource's rows (`field.optionsFrom`). */
function MultiSelectPicker({
  field,
  value,
  onChange,
}: {
  field: ResourceField;
  value: string;
  onChange: (v: string) => void;
}) {
  const src = field.optionsFrom!;
  const { rows, loading, error } = useResource(src.resource);
  const [query, setQuery] = React.useState("");
  const noun = field.itemNoun ?? "item";

  const selected = React.useMemo(() => new Set(splitIds(value)), [value]);

  const options = React.useMemo(
    () =>
      rows
        .map((r) => ({
          value: String(r[src.valueKey] ?? ""),
          label: String(r[src.labelKey] ?? ""),
          sub: src.subKey ? String(r[src.subKey] ?? "") : "",
        }))
        .filter((o) => o.value && o.label),
    [rows, src.valueKey, src.labelKey, src.subKey],
  );

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) || o.sub.toLowerCase().includes(q),
    );
  }, [options, query]);

  // Ids saved earlier whose source row is gone (deleted upstream). Kept in the
  // value so saving doesn't silently drop them, but surfaced honestly.
  const missing = React.useMemo(
    () => splitIds(value).filter((id) => !options.some((o) => o.value === id)),
    [value, options],
  );

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(joinIds([...next]));
  }

  if (error) {
    return (
      <p className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-foreground">
        Couldn&apos;t load {src.resource} — {error}
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-input bg-card">
      <div className="border-b border-border p-2">
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={loading ? "Loading…" : `Search ${src.resource}…`}
          disabled={loading}
          className="h-8"
        />
      </div>

      <div className="max-h-56 overflow-y-auto p-1">
        {loading ? (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">
            Loading {src.resource}…
          </p>
        ) : filtered.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">
            {options.length === 0
              ? `No ${src.resource} available to add.`
              : `No ${src.resource} match “${query}”.`}
          </p>
        ) : (
          filtered.map((o) => {
            const checked = selected.has(o.value);
            return (
              <label
                key={o.value}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent",
                  checked && "bg-accent/60",
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(o.value)}
                  className="size-4 shrink-0 accent-primary"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{o.label}</span>
                  {o.sub ? (
                    <span className="block truncate text-xs text-muted-foreground">
                      {o.sub}
                    </span>
                  ) : null}
                </span>
              </label>
            );
          })
        )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2 text-xs">
        <span className="text-muted-foreground">
          {selected.size} {noun}
          {selected.size === 1 ? "" : "s"} selected
          {missing.length ? ` · ${missing.length} no longer listed` : ""}
        </span>
        {selected.size > 0 ? (
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => onChange("")}
          >
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function ResourceForm({
  config,
  values,
  onChange,
  onSubmit,
}: {
  config: ResourceConfig;
  values: FormValues;
  onChange: (values: FormValues) => void;
  onSubmit: () => void;
}) {
  const set = (key: string, val: string) => onChange({ ...values, [key]: val });

  return (
    <form
      id={RESOURCE_FORM_ID}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="grid grid-cols-2 gap-4"
    >
      {config.fields.map((field) => {
        const full = !field.half || field.type === "textarea";
        return (
          <div
            key={field.key}
            className={cn("space-y-2", full ? "col-span-2" : "col-span-2 sm:col-span-1")}
          >
            <Label htmlFor={field.key}>
              {field.label}
              {field.required ? (
                <span className="ml-0.5 text-destructive">*</span>
              ) : null}
            </Label>

            {field.type === "textarea" ? (
              <Textarea
                id={field.key}
                value={values[field.key] ?? ""}
                onChange={(e) => set(field.key, e.target.value)}
                placeholder={field.placeholder}
              />
            ) : field.type === "multiselect" ? (
              <MultiSelectPicker
                field={field}
                value={values[field.key] ?? ""}
                onChange={(v) => set(field.key, v)}
              />
            ) : field.optionsFrom ? (
              <DynamicSelect
                field={field}
                value={values[field.key] ?? ""}
                onChange={(v) => set(field.key, v)}
              />
            ) : field.type === "select" || field.type === "status" ? (
              <Select
                id={field.key}
                value={values[field.key] ?? ""}
                onChange={(e) => set(field.key, e.target.value)}
              >
                {field.options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                id={field.key}
                type={
                  field.type === "number" || field.type === "currency"
                    ? "number"
                    : field.type === "email"
                      ? "email"
                      : field.type === "date"
                        ? "date"
                        : "text"
                }
                step={field.type === "currency" ? "0.01" : undefined}
                value={values[field.key] ?? ""}
                onChange={(e) => set(field.key, e.target.value)}
                placeholder={field.placeholder}
                required={field.required}
              />
            )}

            {field.help ? (
              <p className="text-xs text-muted-foreground">{field.help}</p>
            ) : null}
          </div>
        );
      })}
    </form>
  );
}
