"use client";

import * as React from "react";
import Link from "next/link";
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
import { formatCurrency, formatDate, formatNumber, cn } from "@/lib/utils";
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
}: {
  config: ResourceConfig;
  col: ResourceColumn;
  row: Row;
}) {
  const val = row[col.key];
  switch (col.type) {
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
    case "status": {
      const { label, variant } = statusVariant(config, col.key, val);
      return <Badge variant={variant}>{label}</Badge>;
    }
    default:
      return <span>{String(val ?? "—")}</span>;
  }
}

type SortState = { key: string; dir: "asc" | "desc" } | null;

export function ResourceView({ resourceKey }: { resourceKey: string }) {
  const config = getResource(resourceKey);
  const store = useStore();
  const { rows, loading, readOnly, source, error } = useResource(resourceKey);
  const { search, page, setPage, pageSize, setTotal } = useDashboardUI();

  const [sort, setSort] = React.useState<SortState>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Row | null>(null);
  const [values, setValues] = React.useState<FormValues>({});
  const [deleting, setDeleting] = React.useState<Row | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [mutationError, setMutationError] = React.useState<string | null>(null);

  const filtered = React.useMemo(() => {
    if (!config) return [];
    const q = search.trim().toLowerCase();
    let out = rows;
    if (q) {
      out = rows.filter((r) =>
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
  }, [rows, search, sort, config]);

  // Reset to first page whenever the search query changes.
  React.useEffect(() => {
    setPage(1);
  }, [search, setPage]);

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

  function openCreate() {
    setMutationError(null);
    setEditing(null);
    setValues(initialValues(config!));
    setDrawerOpen(true);
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
          {!readOnly ? (
            <Button onClick={openCreate}>
              <Plus />
              New {config.singular.toLowerCase()}
            </Button>
          ) : null}
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
                {config.columns.map((col) => {
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
              {paged.map((row) => {
                const locked = config.rowLocked?.(row) ?? false;
                return (
                  <TableRow
                    key={row.id}
                    className={cn("group", !readOnly && !locked && "cursor-pointer")}
                    onClick={() => openEdit(row)}
                  >
                    {config.columns.map((col) => (
                      <TableCell
                        key={col.key}
                        className={cn(col.align === "right" && "text-right")}
                      >
                        <Cell config={config} col={col} row={row} />
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
                            <MenuContent width="w-40">
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
    </div>
  );
}
