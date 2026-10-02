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
  | "multiselect"
  | "status"
  | "date";

export interface FieldOption {
  value: string;
  label: string;
  variant?: BadgeVariant;
  /** 2–4 letter code for compact `indicator` columns (the full label becomes its tooltip) */
  short?: string;
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
  /** `multiselect` only — noun shown in the picker's empty/summary text */
  itemNoun?: string;
  placeholder?: string;
  required?: boolean;
  /** render at half width in the two-column form grid */
  half?: boolean;
  help?: string;
  defaultValue?: string | number;
  /**
   * Not rendered in the create/edit form. For fields that only exist to give
   * a column its badge labels/colours (e.g. a document status that changes
   * through its own actions, never by editing).
   */
  hidden?: boolean;
}

export type ColumnType =
  | "primary"
  | "text"
  | "muted"
  | "mono"
  | "currency"
  | "number"
  | "status"
  | "date"
  | "datetime"
  | "index"
  | "tags"
  /** a small coded chip (the option's `short`), full label on hover — for at-a-glance types like shipping */
  | "indicator";

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

export interface ResourceTabs {
  /** row key the tabs filter on */
  field: string;
  /** tab list, shown after an implicit leading "All" tab */
  options: { value: string; label: string }[];
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
  /** when set, clicking a row opens this detail route instead of the edit drawer */
  rowHref?: (row: Row) => string;
  /** when set, renders a segmented "All / …" tab strip above the table that filters rows by a field */
  tabs?: ResourceTabs;
  /**
   * Narrow what a writable resource offers (all default to true). E.g.
   * inventory rows can be edited (reorder points) but not created or deleted;
   * shipments can be ticked for the page's own control panel but not edited.
   */
  capabilities?: {
    create?: boolean;
    edit?: boolean;
    delete?: boolean;
    /** the generic bulk bar's "Move to" (needs `tabs`) */
    bulkMove?: boolean;
  };
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
