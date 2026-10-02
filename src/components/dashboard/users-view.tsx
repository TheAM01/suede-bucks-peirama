"use client";

import * as React from "react";
import { AlertCircle, Plus, ShieldCheck, Trash2, UsersRound } from "@/components/icons";
import {
  AREAS,
  LEVELS,
  atLeast,
  sanitizePermissions,
  type Access,
  type Level,
  type Permissions,
} from "@/config/permissions";
import { formatDateTime, cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Drawer } from "@/components/ui/drawer";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface UserRow {
  id: string;
  username: string;
  name: string;
  permissions: Permissions;
  status: "active" | "disabled";
  mustChangePassword: boolean;
  createdAt: string;
  createdBy: string;
  lastLoginAt: string;
}

type Me = Access & { id?: string; username: string };

const LEVEL_LABEL: Record<Level, string> = { none: "None", view: "View", manage: "Manage" };

/** Group the checklist by sidebar section, in sidebar order. */
const GROUPS = AREAS.reduce<{ group: string; areas: typeof AREAS }[]>((acc, a) => {
  const g = acc.find((x) => x.group === a.group);
  if (g) g.areas.push(a);
  else acc.push({ group: a.group, areas: [a] });
  return acc;
}, []);

function summary(p: Permissions) {
  const view = AREAS.filter((a) => p[a.key] === "view").length;
  const manage = AREAS.filter((a) => p[a.key] === "manage").length;
  if (!view && !manage) return "No pages";
  return [manage && `${manage} manage`, view && `${view} view`].filter(Boolean).join(" · ");
}

async function call<T>(url: string, init?: RequestInit): Promise<{ data?: T; error?: string }> {
  try {
    const res = await fetch(url, { ...init, headers: init?.body ? { "Content-Type": "application/json" } : undefined, cache: "no-store" });
    const body = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
    if (!res.ok || !body) return { error: body?.error ?? `Server responded ${res.status}.` };
    return { data: body };
  } catch {
    return { error: "Couldn't reach the server." };
  }
}

/**
 * Users & permissions. The Owner (environment account) is listed but can't
 * be edited. Each other user has a per-page checklist — None / View / Manage —
 * and anyone managing users can only grant up to their own level per page.
 */
export function UsersView({ me }: { me: Me }) {
  const toast = useToast();
  const canManage = me.isOwner || atLeast(me.permissions.users, "manage");
  const [users, setUsers] = React.useState<UserRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState<UserRow | "new" | null>(null);

  const load = React.useCallback(async () => {
    const { data, error: err } = await call<{ users: UserRow[] }>("/api/users");
    setUsers(data?.users ?? []);
    setError(data ? null : (err ?? "Couldn't load users."));
    setLoading(false);
  }, []);

  React.useEffect(() => {
    // Fetch-on-mount; state is only set after the await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  /** Can I edit this account? Not if it has access I don't. */
  const editable = (u: UserRow) => canManage && (me.isOwner || AREAS.every((a) => atLeast(me.permissions[a.key], u.permissions[a.key] ?? "none")));

  if (loading) return <LoadingState label="Loading users…" />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UsersRound className="size-4 text-primary" /> Users
            </CardTitle>
            <CardDescription>
              Everyone who can sign in, and which pages each person can see (View) or use (Manage).
            </CardDescription>
          </div>
          {canManage ? (
            <Button onClick={() => setEditing("new")} disabled={Boolean(error)}>
              <Plus />
              New user
            </Button>
          ) : null}
        </CardHeader>
        {error ? (
          <CardContent>
            <EmptyState icon={AlertCircle} title="Users can't be loaded" description={error} />
          </CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>User</TableHead>
                <TableHead>Access</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last sign-in</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="hover:bg-transparent">
                <TableCell>
                  <p className="font-medium">Owner</p>
                  <p className="text-xs text-muted-foreground">The account set in the server&apos;s environment</p>
                </TableCell>
                <TableCell>
                  <Badge variant="primary">
                    <ShieldCheck />
                    Everything
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="success">Active</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">—</TableCell>
              </TableRow>
              {users.map((u) => {
                const can = editable(u);
                return (
                  <TableRow
                    key={u.id}
                    className={cn(can && "cursor-pointer")}
                    onClick={() => (can ? setEditing(u) : undefined)}
                    title={can ? undefined : canManage ? "This user has access you don't, so you can't edit them." : undefined}
                  >
                    <TableCell>
                      <p className="font-medium">
                        {u.name}
                        {u.id === me.id ? <span className="font-normal text-muted-foreground"> (you)</span> : null}
                      </p>
                      <p className="text-xs text-muted-foreground">@{u.username}</p>
                    </TableCell>
                    <TableCell className="text-sm">{summary(u.permissions)}</TableCell>
                    <TableCell>
                      <span className="flex flex-wrap gap-1.5">
                        <Badge variant={u.status === "active" ? "success" : "secondary"}>
                          {u.status === "active" ? "Active" : "Disabled"}
                        </Badge>
                        {u.mustChangePassword ? <Badge variant="warning">Temporary password</Badge> : null}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "Never"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        {!error && users.length === 0 ? (
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">No other users yet{canManage ? " — add one with New user." : "."}</p>
          </CardContent>
        ) : null}
      </Card>

      {editing ? (
        <UserEditor
          me={me}
          user={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(saved, verb) => {
            setUsers((prev) => (prev.some((x) => x.id === saved.id) ? prev.map((x) => (x.id === saved.id ? saved : x)) : [saved, ...prev]));
            setEditing(null);
            toast.success(`User ${verb}`, `@${saved.username}`);
          }}
          onDeleted={(id) => {
            setUsers((prev) => prev.filter((x) => x.id !== id));
            setEditing(null);
            toast.success("User deleted");
          }}
        />
      ) : null}
    </div>
  );
}

function UserEditor({
  me,
  user,
  onClose,
  onSaved,
  onDeleted,
}: {
  me: Me;
  user: UserRow | null;
  onClose: () => void;
  onSaved: (u: UserRow, verb: string) => void;
  onDeleted: (id: string) => void;
}) {
  const toast = useToast();
  const creating = !user;
  const self = user?.id === me.id;
  const [name, setName] = React.useState(user?.name ?? "");
  const [username, setUsername] = React.useState(user?.username ?? "");
  const [password, setPassword] = React.useState("");
  const [status, setStatus] = React.useState<"active" | "disabled">(user?.status ?? "active");
  const [perms, setPerms] = React.useState<Permissions>(sanitizePermissions(user?.permissions));
  const [saving, setSaving] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  /** The highest level I may grant on an area. */
  const cap = (area: string): Level => (me.isOwner ? "manage" : (me.permissions[area] ?? "none"));
  const allowed = (area: string, level: Level) => atLeast(cap(area), level);
  const preset = (level: Level) =>
    setPerms(Object.fromEntries(AREAS.map((a) => [a.key, atLeast(cap(a.key), level) ? level : cap(a.key)])) as Permissions);

  async function save() {
    setSaving(true);
    setError(null);
    const body = creating
      ? { name, username, password, permissions: perms }
      : { name, permissions: perms, status, ...(password ? { password } : {}) };
    const { data, error: err } = await call<{ user: UserRow }>(creating ? "/api/users" : `/api/users/${user!.id}`, {
      method: creating ? "POST" : "PATCH",
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!data) {
      setError(err ?? "Couldn't save.");
      toast.error("User not saved", err);
      return;
    }
    onSaved(data.user, creating ? "created" : "saved");
  }

  async function remove() {
    setConfirmDelete(false);
    setSaving(true);
    const { data, error: err } = await call<{ ok: boolean }>(`/api/users/${user!.id}`, { method: "DELETE" });
    setSaving(false);
    if (!data) {
      toast.error("User not deleted", err);
      return;
    }
    onDeleted(user!.id);
  }

  return (
    <>
      <Drawer
        open
        onClose={onClose}
        title={creating ? "New user" : `Edit ${user!.name}`}
        description={
          creating
            ? "They sign in with this username and the temporary password, then must choose their own."
            : "Changing access, disabling the account, or setting a new temporary password signs them out everywhere."
        }
        footer={
          <>
            {!creating && !self ? (
              <Button variant="ghost" className="mr-auto text-destructive hover:text-destructive" onClick={() => setConfirmDelete(true)} disabled={saving}>
                <Trash2 />
                Delete
              </Button>
            ) : null}
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void save()} disabled={saving || (creating && (!username.trim() || password.length < 8))}>
              {saving ? "Saving…" : creating ? "Create user" : "Save changes"}
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          {error ? <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2 sm:col-span-1">
              <Label htmlFor="u-name">Full name</Label>
              <Input id="u-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ayesha Khan" />
            </div>
            <div className="col-span-2 space-y-2 sm:col-span-1">
              <Label htmlFor="u-username">Username</Label>
              <Input
                id="u-username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                disabled={!creating}
                placeholder="e.g. ayesha"
                autoComplete="off"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="u-password">{creating ? "Temporary password" : "New temporary password (optional)"}</Label>
              <Input
                id="u-password"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
              <p className="text-xs text-muted-foreground">
                Share it with them privately. They&apos;ll be asked to change it the first time they sign in.
              </p>
            </div>
            {!creating ? (
              <label className="col-span-2 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={status === "disabled"}
                  disabled={self}
                  onChange={(e) => setStatus(e.target.checked ? "disabled" : "active")}
                />
                Disable this account (they can&apos;t sign in until it&apos;s turned back on)
              </label>
            ) : null}
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">Page access</p>
              <div className="flex flex-wrap gap-1.5">
                <Button size="sm" variant="outline" onClick={() => preset("none")}>
                  No access
                </Button>
                <Button size="sm" variant="outline" onClick={() => preset("view")}>
                  View all
                </Button>
                <Button size="sm" variant="outline" onClick={() => preset("manage")}>
                  Manage all
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">View</span> shows the page read-only;{" "}
              <span className="font-medium text-foreground">Manage</span> allows changes. Everyone can always see the
              Dashboard home, the Guide, and their own account.
              {!me.isOwner ? " You can only give up to your own access on each page." : ""}
            </p>
            {GROUPS.map((g) => (
              <div key={g.group} className="rounded-lg border border-border">
                <p className="border-b border-border bg-muted/40 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {g.group}
                </p>
                <ul className="divide-y divide-border">
                  {g.areas.map((a) => (
                    <li key={a.key} className="flex items-center justify-between gap-3 px-3 py-2">
                      <span className="text-sm">{a.label}</span>
                      <div className="flex rounded-md border border-border p-0.5" role="radiogroup" aria-label={`${a.label} access`}>
                        {LEVELS.map((lv) => {
                          const on = (perms[a.key] ?? "none") === lv;
                          const ok = allowed(a.key, lv);
                          return (
                            <button
                              key={lv}
                              type="button"
                              role="radio"
                              aria-checked={on}
                              disabled={!ok}
                              title={ok ? undefined : "More than your own access"}
                              onClick={() => setPerms((p) => ({ ...p, [a.key]: lv }))}
                              className={cn(
                                "rounded px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                                on
                                  ? lv === "manage"
                                    ? "bg-primary text-primary-foreground"
                                    : lv === "view"
                                      ? "bg-secondary text-secondary-foreground"
                                      : "bg-muted text-foreground"
                                  : "text-muted-foreground hover:bg-accent",
                              )}
                            >
                              {LEVEL_LABEL[lv]}
                            </button>
                          );
                        })}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </Drawer>

      <ConfirmDialog
        open={confirmDelete}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => void remove()}
        title={`Delete ${user?.name ?? "this user"}?`}
        description="They can't sign in any more. Records they made keep their name. Disable the account instead if they might come back."
        confirmLabel="Delete user"
      />
    </>
  );
}
