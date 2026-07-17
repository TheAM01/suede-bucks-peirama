import type { IconType } from "@/components/icons";
import type { Tone } from "@/lib/tone";

export type Row = Record<string, unknown> & { id: string };

export type BadgeVariant =
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "destructive"
  | "info"
  | "outline"
  | "solid";

export type FieldType =
  | "text"
  | "email"
  | "number"
  | "currency"
  | "textarea"
  | "select"
  | "status"
  | "date";

export interface FieldOption {
  value: string;
  label: string;
  variant?: BadgeVariant;
}

/** Populate a select's options live from another resource's rows. */
export interface OptionsSource {
  resource: string;
  /** row key stored as the field's value */
  valueKey: string;
  /** row key shown as the option label */
  labelKey: string;
  /** optional row key appended to the label, e.g. a SKU */
  subKey?: string;
}

export interface ResourceField {
  key: string;
  label: string;
  type: FieldType;
  options?: FieldOption[];
  /** live options from another resource — takes precedence over `options` */
  optionsFrom?: OptionsSource;
  placeholder?: string;
  required?: boolean;
  /** render at half width in the two-column form grid */
  half?: boolean;
  help?: string;
  defaultValue?: string | number;
}

export type ColumnType =
  | "primary"
  | "text"
  | "muted"
  | "mono"
  | "currency"
  | "number"
  | "status"
  | "date";

export interface ResourceColumn {
  key: string;
  header: string;
  type?: ColumnType;
  align?: "left" | "right";
  /** secondary line under a primary column */
  sub?: string;
}

export interface StatResult {
  value: string;
  delta?: number;
  caption?: string;
}

export interface StatDef {
  label: string;
  icon: IconType;
  tone?: Tone;
  compute: (rows: Row[]) => StatResult;
}

export interface ResourceConfig {
  key: string;
  singular: string;
  plural: string;
  icon: IconType;
  subtitle: string;
  guide: string;
  /** row keys searched by the list search box */
  searchKeys: string[];
  columns: ResourceColumn[];
  fields: ResourceField[];
  stats: StatDef[];
  /** rows this returns true for can't be edited or deleted */
  rowLocked?: (row: Row) => boolean;
  /** tooltip shown on a locked row's lock icon */
  lockedHint?: string;
}

/** Resolve the badge variant for a status value from a resource's field options. */
export function statusVariant(
  config: ResourceConfig,
  key: string,
  value: unknown,
): { label: string; variant: BadgeVariant } {
  const field = config.fields.find((f) => f.key === key);
  const opt = field?.options?.find((o) => o.value === value);
  return {
    label: opt?.label ?? String(value ?? "—"),
    variant: opt?.variant ?? "outline",
  };
}
