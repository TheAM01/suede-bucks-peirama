"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  ShoppingBag,
  Plug,
  Lock,
  ArrowRight,
  ChevronDown,
} from "@/components/icons";
import type {
  ResourceColumn,
  ResourceConfig,
  Row,
} from "@/config/resource-types";
import { statusVariant } from "@/config/resource-types";
import { getResource } from "@/config/resources";
import { useResource, useStore } from "@/lib/store";
import { useDashboardUI } from "./ui-context";
import { formatCurrency, formatDate, formatDateTime, formatNumber, cn } from "@/lib/utils";
import { Segmented } from "@/components/ui/segmented";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/spinner";
import { Drawer } from "@/components/ui/drawer";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
} from "@/components/ui/menu";
import {
  ResourceForm,
  RESOURCE_FORM_ID,
  initialValues,
  coerceValues,
  type FormValues,
} from "./resource-form";

function Cell({
  config,
  col,
  row,
  index,
}: {
  config: ResourceConfig;
  col: ResourceColumn;
  row: Row;
  index: number;
}) {
  const val = row[col.key];
  switch (col.type) {
    case "index":
      return (
        <span className="tabular-nums text-muted-foreground/60">{index + 1}</span>
      );
    case "primary":
      return (
        <div className="min-w-0">
          <div className="truncate font-medium text-foreground">
            {String(val ?? "—")}
          </div>
          {col.sub && row[col.sub] ? (
            <div className="truncate text-xs text-muted-foreground">
              {String(row[col.sub])}
            </div>
          ) : null}
        </div>
      );
    case "muted":
      return <span className="text-muted-foreground">{String(val ?? "—")}</span>;
    case "mono":
      return <span className="font-mono text-[13px] font-medium">{String(val ?? "—")}</span>;
    case "currency":
      return <span className="tabular-nums">{formatCurrency(Number(val ?? 0))}</span>;
    case "number":
      return <span className="tabular-nums">{formatNumber(Number(val ?? 0))}</span>;
    case "date":
      return (
        <span className="whitespace-nowrap text-muted-foreground">
          {val ? formatDate(String(val)) : "—"}
        </span>
      );
    case "datetime":
      return (
        <span className="whitespace-nowrap text-muted-foreground">
          {val ? formatDateTime(String(val)) : "—"}
        </span>
      );
    case "status": {
      const { label, variant } = statusVariant(config, col.key, val);
      return <Badge variant={variant}>{label}</Badge>;
    }
    case "tags": {
      const tags = Array.isArray(val) ? val.filter((t): t is string => typeof t === "string") : [];
      if (tags.length === 0) return <span className="text-muted-foreground">—</span>;
      const shown = tags.slice(0, 3);
      const overflow = tags.length - shown.length;
      return (
        <div className="flex max-w-xs flex-wrap items-center gap-1">
          {shown.map((t) => (
            <Badge key={t} variant="outline">
              {t}
            </Badge>
          ))}
          {overflow > 0 ? <Badge variant="secondary">+{overflow}</Badge> : null}
        </div>
      );
    }
    default:
      return <span>{String(val ?? "—")}</span>;
  }
}

type SortState = { key: string; dir: "asc" | "desc" } | null;

export function ResourceView({ resourceKey }: { resourceKey: string }) {
  const config = getResource(resourceKey);
  const router = useRouter();
  const store = useStore();
  const { rows, loading, readOnly, source, error } = useResource(resourceKey);
  const { search, page, setPage, pageSize, setTotal } = useDashboardUI();

  const [sort, setSort] = React.useState<SortState>(null);
  const [tab, setTab] = React.useState<string>("all");
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Row | null>(null);
  const [values, setValues] = React.useState<FormValues>({});
  const [deleting, setDeleting] = React.useState<Row | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [mutationError, setMutationError] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = React.useState(false);
  const [bulkBusy, setBulkBusy] = React.useState(false);

  const filtered = React.useMemo(() => {
    if (!config) return [];
    const q = search.trim().toLowerCase();
    let out = rows;
    if (config.tabs && tab !== "all") {
      out = out.filter((r) => r[config.tabs!.field] === tab);
    }
    if (q) {
      out = out.filter((r) =>
        config.searchKeys.some((k) =>
          String(r[k] ?? "").toLowerCase().includes(q),
        ),
      );
    }
    if (sort) {
      out = [...out].sort((a, b) => {
        const av = a[sort.key];
        const bv = b[sort.key];
        let cmp: number;
        if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
        else cmp = String(av ?? "").localeCompare(String(bv ?? ""));
        return sort.dir === "asc" ? cmp : -cmp;
      });
    }
    return out;
  }, [rows, search, sort, config, tab]);

  // Reset to first page, and drop any bulk selection (one scoped to a filter
  // that's no longer applied would be confusing to act on), whenever the
  // search query or active tab changes.
  React.useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelected(new Set());
  }, [search, tab, setPage]);

  // Publish result count to the bottom-bar pagination.
  React.useEffect(() => {
    setTotal(filtered.length);
  }, [filtered.length, setTotal]);

  if (!config) return null;
  if (loading) return <LoadingState label={`Loading ${config.plural.toLowerCase()}…`} />;

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const notConnected = source === "empty";
  const selectableOnPage = paged
    .filter((r) => !(config.rowLocked?.(r) ?? false))
    .map((r) => r.id);
  const allOnPageSelected =
    selectableOnPage.length > 0 && selectableOnPage.every((id) => selected.has(id));

  function openCreate() {
    setMutationError(null);
    setEditing(null);
    setValues(initialValues(config!));
    setDrawerOpen(true);
  }
  // A resource with a detail route opens it on row click; everything else
  // falls back to the inline edit drawer.
  function openRow(row: Row) {
    const href = config?.rowHref?.(row);
    if (href) router.push(href);
    else openEdit(row);
  }
  function openEdit(row: Row) {
    if (readOnly || config?.rowLocked?.(row)) return;
    setMutationError(null);
    setEditing(row);
    setValues(initialValues(config!, row));
    setDrawerOpen(true);
  }
  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setMutationError(null);
    const data = coerceValues(config!, values);
    const result = editing
      ? await store.update(resourceKey, editing.id, data)
      : await store.create(resourceKey, data);
    setSaving(false);
    if (!result.ok) {
      setMutationError(result.error ?? "Something went wrong.");
      return;
    }
    setDrawerOpen(false);
  }
  async function handleDelete() {
    if (!deleting) return;
    const result = await store.remove(resourceKey, deleting.id);
    setDeleting(null);
    if (!result.ok) setMutationError(result.error ?? "Delete failed.");
  }

  function toggleSort(key: string) {
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAllOnPage() {
    setSelected((prev) => {
      if (selectableOnPage.every((id) => prev.has(id))) return new Set();
      return new Set(selectableOnPage);
    });
  }
  async function handleBulkMove(status: string) {
    if (!config?.tabs || selected.size === 0) return;
    setBulkBusy(true);
    setMutationError(null);
    const field = config.tabs.field;
    const ids = Array.from(selected);
    // Send the full row, not just the changed field: some app-owned resources
    // (dispatch/return-load-sheets) validate a complete object on update, the
    // same as a single-row edit submits every field from the drawer form.
    const results = await Promise.all(
      ids.map((id) => {
        const row = rows.find((r) => r.id === id);
        const patch = { ...(row ?? {}), [field]: status };
        return store.update(resourceKey, id, patch);
      }),
    );
    setBulkBusy(false);
    const failed = results.filter((r) => !r.ok).length;
    setMutationError(failed > 0 ? `${failed} of ${ids.length} couldn't be updated.` : null);
    setSelected(new Set());
  }
  async function handleBulkDelete() {
    setBulkBusy(true);
    setMutationError(null);
    const ids = Array.from(selected);
    const results = await Promise.all(ids.map((id) => store.remove(resourceKey, id)));
    setBulkBusy(false);
    setBulkDeleting(false);
    const failed = results.filter((r) => !r.ok).length;
    setMutationError(failed > 0 ? `${failed} of ${ids.length} couldn't be deleted.` : null);
    setSelected(new Set());
  }

  return (
    <div className="space-y-6">
      {/* Load / mutation problems */}
      {error ? (
        <div className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2.5 text-sm text-foreground">
          <AlertCircle className="size-4 shrink-0 text-warning" />
          <span>{error}</span>
        </div>
      ) : null}
      {mutationError && !drawerOpen ? (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>{mutationError}</span>
        </div>
      ) : null}

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {config.stats.map((s) => {
          const res = s.compute(rows);
          return (
            <StatCard
              key={s.label}
              label={s.label}
              value={res.value}
              icon={s.icon}
              tone={s.tone}
              delta={res.delta}
              caption={res.caption}
            />
          );
        })}
      </div>

      {/* Table card */}
      <Card>
        <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 font-heading text-base font-semibold leading-tight tracking-tight">
              {config.plural}
              {source === "shopify" ? (
                <Badge variant="info">
                  <ShoppingBag />
                  Synced from Shopify
                </Badge>
              ) : null}
            </h2>
            <p className="text-sm text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? "record" : "records"}
              {search ? " matching your search" : ""}
              {source === "shopify" && readOnly ? " · view-only" : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {config.tabs ? (
              <Segmented
                size="sm"
                value={tab}
                onChange={setTab}
                options={[
                  { value: "all", label: "All" },
                  ...config.tabs.options,
                ]}
              />
            ) : null}
            {!readOnly ? (
              <Button onClick={openCreate}>
                <Plus />
                New {config.singular.toLowerCase()}
              </Button>
            ) : null}
          </div>
        </div>

        {paged.length === 0 ? (
          <div className="p-5">
            {notConnected ? (
              <EmptyState
                icon={Plug}
                title="No store connected"
                description={`${config.plural} will appear here once your Shopify store is connected.`}
                action={
                  <Button asChild>
                    <Link href="/dashboard/integrations">
                      <Plug />
                      Connect Shopify
                    </Link>
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={config.icon}
                title={search ? "No matches" : `No ${config.plural.toLowerCase()} yet`}
                description={
                  search
                    ? "Try a different search term."
                    : readOnly
                      ? `Nothing here in your store yet.`
                      : `Create your first ${config.singular.toLowerCase()} to get started.`
                }
                action={
                  !search && !readOnly ? (
                    <Button onClick={openCreate}>
                      <Plus />
                      New {config.singular.toLowerCase()}
                    </Button>
                  ) : undefined
                }
              />
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {!readOnly ? (
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={allOnPageSelected}
                      onChange={toggleAllOnPage}
                      aria-label="Select all rows on this page"
                    />
                  </TableHead>
                ) : null}
                {config.columns.map((col) => {
                  if (col.type === "index") {
                    return (
                      <TableHead key={col.key} className="w-10">
                        {col.header}
                      </TableHead>
                    );
                  }
                  const active = sort?.key === col.key;
                  return (
                    <TableHead
                      key={col.key}
                      className={cn(
                        "cursor-pointer select-none",
                        col.align === "right" && "text-right",
                      )}
                      onClick={() => toggleSort(col.key)}
                    >
                      <span
                        className={cn(
                          "inline-flex items-center gap-1",
                          col.align === "right" && "flex-row-reverse",
                        )}
                      >
                        {col.header}
                        {active ? (
                          sort!.dir === "asc" ? (
                            <ArrowUp className="size-3" />
                          ) : (
                            <ArrowDown className="size-3" />
                          )
                        ) : (
                          <ArrowUpDown className="size-3 opacity-30" />
                        )}
                      </span>
                    </TableHead>
                  );
                })}
                {!readOnly ? <TableHead className="w-10" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((row, i) => {
                const locked = config.rowLocked?.(row) ?? false;
                const href = config.rowHref?.(row);
                const rowIndex = (safePage - 1) * pageSize + i;
                return (
                  <TableRow
                    key={row.id}
                    className={cn(
                      "group",
                      (href || (!readOnly && !locked)) && "cursor-pointer",
                    )}
                    onClick={() => openRow(row)}
                  >
                    {!readOnly ? (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {!locked ? (
                          <input
                            type="checkbox"
                            className="size-4 accent-primary"
                            checked={selected.has(row.id)}
                            onChange={() => toggleOne(row.id)}
                            aria-label={`Select row ${rowIndex + 1}`}
                          />
                        ) : null}
                      </TableCell>
                    ) : null}
                    {config.columns.map((col) => (
                      <TableCell
                        key={col.key}
                        className={cn(col.align === "right" && "text-right")}
                      >
                        <Cell config={config} col={col} row={row} index={rowIndex} />
                      </TableCell>
                    ))}
                    {!readOnly ? (
                      <TableCell
                        className="text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {locked ? (
                          <span
                            className="inline-flex size-8 items-center justify-center text-muted-foreground"
                            title={config.lockedHint ?? "This record can't be changed."}
                          >
                            <Lock className="size-4" />
                          </span>
                        ) : (
                          <Menu>
                            <MenuTrigger>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Row actions"
                              >
                                <MoreHorizontal />
                              </Button>
                            </MenuTrigger>
                            <MenuContent width="w-44">
                              {href ? (
                                <MenuItem onSelect={() => router.push(href)}>
                                  <ArrowRight />
                                  View details
                                </MenuItem>
                              ) : null}
                              <MenuItem onSelect={() => openEdit(row)}>
                                <Pencil />
                                Edit
                              </MenuItem>
                              <MenuItem destructive onSelect={() => setDeleting(row)}>
                                <Trash2 />
                                Delete
                              </MenuItem>
                            </MenuContent>
                          </Menu>
                        )}
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Bulk action bar — sticky just above the bottom bar, shown once something's selected */}
      {!readOnly && selected.size > 0 ? (
        <div className="sticky bottom-8 z-10 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-md">
          <p className="text-sm font-medium">
            {selected.size} {selected.size === 1 ? "record" : "records"} selected
          </p>
          <div className="flex items-center gap-2">
            {config.tabs ? (
              <Menu>
                <MenuTrigger>
                  <Button variant="outline" size="sm" disabled={bulkBusy}>
                    Move to
                    <ChevronDown className="size-3.5" />
                  </Button>
                </MenuTrigger>
                <MenuContent width="w-48">
                  {config.tabs.options.map((opt) => (
                    <MenuItem key={opt.value} onSelect={() => handleBulkMove(opt.value)}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </MenuContent>
              </Menu>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelected(new Set())}
              disabled={bulkBusy}
            >
              Clear
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBulkDeleting(true)}
              disabled={bulkBusy}
            >
              <Trash2 />
              Delete
            </Button>
          </div>
        </div>
      ) : null}

      {/* Create / edit drawer (app-owned resources only) */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? `Edit ${config.singular.toLowerCase()}` : `New ${config.singular.toLowerCase()}`}
        description={
          editing
            ? "Update the details and save your changes."
            : `Add a new ${config.singular.toLowerCase()}.`
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form={RESOURCE_FORM_ID} disabled={saving}>
              {saving
                ? "Saving…"
                : editing
                  ? "Save changes"
                  : `Create ${config.singular.toLowerCase()}`}
            </Button>
          </>
        }
      >
        {mutationError ? (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span>{mutationError}</span>
          </div>
        ) : null}
        <ResourceForm
          config={config}
          values={values}
          onChange={setValues}
          onSubmit={handleSave}
        />
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleting)}
        onCancel={() => setDeleting(null)}
        onConfirm={handleDelete}
        title={`Delete this ${config.singular.toLowerCase()}?`}
        description="This permanently removes the record."
      />

      <ConfirmDialog
        open={bulkDeleting}
        onCancel={() => setBulkDeleting(false)}
        onConfirm={handleBulkDelete}
        title={`Delete ${selected.size} ${selected.size === 1 ? config.singular.toLowerCase() : config.plural.toLowerCase()}?`}
        description="This permanently removes these records."
        confirmLabel={bulkBusy ? "Deleting…" : "Delete"}
      />
    </div>
  );
}
