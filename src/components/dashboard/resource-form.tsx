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

/** Build initial string-valued form state from a row (or blanks). */
export function initialValues(config: ResourceConfig, row?: Row): FormValues {
  const v: FormValues = {};
  for (const f of config.fields) {
    const raw = row?.[f.key];
    if (raw !== undefined && raw !== null) v[f.key] = String(raw);
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
