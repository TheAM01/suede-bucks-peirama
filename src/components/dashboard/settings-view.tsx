"use client";

import * as React from "react";
import Link from "next/link";
import {
  Store,
  Bell,
  Plug,
  User,
  Check,
  ShoppingBag,
  ExternalLink,
  LayoutDashboard,
  QrCode,
} from "@/components/icons";
import type { CurrentUser } from "@/lib/auth";
import { CURRENCIES } from "@/lib/currency";
import { useCurrency } from "@/components/currency-provider";
import { useDashboardView } from "@/components/dashboard-view-provider";
import type { DashboardView } from "@/lib/dashboard-view";
import {
  CONSIGNMENT_TEMPLATES,
  CONSIGNMENT_TOKENS,
  SAMPLE_CONSIGNMENT_VALUES,
  renderConsignmentId,
} from "@/config/consignment-schema";
import { saveConsignmentTemplateAction } from "@/lib/settings-actions";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

function Field({
  label,
  children,
  half,
}: {
  label: string;
  children: React.ReactNode;
  half?: boolean;
}) {
  return (
    <div className={half ? "space-y-2 sm:col-span-1" : "space-y-2 sm:col-span-2"}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

const NOTIFICATIONS = [
  { key: "orders", label: "New order emails", desc: "Get notified when an order is placed." },
  { key: "lowStock", label: "Low-stock alerts", desc: "Warn when a variant drops below its reorder point." },
  { key: "daily", label: "Daily summary", desc: "A morning digest of yesterday's sales." },
  { key: "pos", label: "POS session alerts", desc: "Notify when a register is opened or closed." },
];

/** Store-wide (server-side) — applies to every consignment assigned from now on. */
function ConsignmentSchemaCard({ initial }: { initial: string }) {
  const [template, setTemplate] = React.useState(initial);
  const [savedTemplate, setSavedTemplate] = React.useState(initial);
  const [pending, startTransition] = React.useTransition();
  const [message, setMessage] = React.useState<{ ok: boolean; text: string } | null>(null);
  // A fixed sample time keeps the preview stable between renders.
  const preview = (t: string) => renderConsignmentId(t, { ...SAMPLE_CONSIGNMENT_VALUES, ms: 1790000000000 });

  function save() {
    startTransition(async () => {
      const res = await saveConsignmentTemplateAction(template);
      if (res.ok) setSavedTemplate(template);
      setMessage(res.ok ? { ok: true, text: "Saved" } : { ok: false, text: res.message ?? "Couldn't save." });
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="size-4 text-primary" /> Consignment IDs
        </CardTitle>
        <CardDescription>
          The shape of the ID generated when an order is assigned a consignment. Applies store-wide,
          from the next assignment on — existing IDs don&apos;t change.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="consignment-template">Schema</Label>
          <Select
            id="consignment-template"
            value={template}
            onChange={(e) => {
              setTemplate(e.target.value);
              setMessage(null);
            }}
          >
            {CONSIGNMENT_TEMPLATES.map((t, i) => (
              <option key={t} value={t}>
                {t}
                {i === 0 ? " (default)" : ""}
              </option>
            ))}
          </Select>
        </div>
        <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5">
          <p className="text-xs text-muted-foreground">
            Example — order #1004 to Karachi with Insta
          </p>
          <p className="mt-0.5 break-all font-mono text-sm">{preview(template)}</p>
        </div>
        <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
          {CONSIGNMENT_TOKENS.map((t) => (
            <div key={t.token} className="flex gap-2">
              <dt className="shrink-0 font-mono text-foreground">{t.token}</dt>
              <dd className="text-muted-foreground">{t.meaning}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
      <CardFooter className="justify-end gap-3">
        {message ? (
          <span className={message.ok ? "text-sm text-success" : "text-sm text-destructive"}>
            {message.text}
          </span>
        ) : null}
        <Button onClick={save} disabled={pending || template === savedTemplate}>
          {message?.ok ? <Check /> : null}
          {pending ? "Saving…" : "Save schema"}
        </Button>
      </CardFooter>
    </Card>
  );
}

export function SettingsView({
  user,
  consignmentTemplate,
}: {
  user: CurrentUser;
  consignmentTemplate: string;
}) {
  const { currency, setCurrency } = useCurrency();
  const { view, setView } = useDashboardView();
  const [saved, setSaved] = React.useState(false);
  const [toggles, setToggles] = React.useState<Record<string, boolean>>({
    orders: true,
    lowStock: true,
    daily: false,
    pos: true,
  });

  function save() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="size-4 text-primary" /> Account
          </CardTitle>
          <CardDescription>The admin account signed in to this store.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <span className="flex size-12 items-center justify-center rounded-xl bg-primary text-base font-semibold text-primary-foreground">
            {user.initials}
          </span>
          <div className="min-w-0">
            <p className="font-medium">{user.name}</p>
            <p className="text-sm text-muted-foreground">
              @{user.username}
            </p>
          </div>
          <Badge variant="primary" className="ml-auto">
            {user.role}
          </Badge>
        </CardContent>
      </Card>

      {/* Store details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="size-4 text-primary" /> Store details
          </CardTitle>
          <CardDescription>How your store appears to customers.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Store name">
            <Input defaultValue="SuedeBucks" />
          </Field>
          <Field label="Support email" half>
            <Input type="email" defaultValue="support@digitemb.com" />
          </Field>
          <Field label="Phone" half>
            <Input defaultValue="+44 20 7946 0000" />
          </Field>
          <Field label="Currency" half>
            <Select
              value={currency.code}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Timezone" half>
            <Select defaultValue="Europe/London">
              <option>Europe/London</option>
              <option>America/New_York</option>
              <option>Asia/Karachi</option>
            </Select>
          </Field>
          <Field label="Address">
            <Input defaultValue="42 Camden High St, London, UK" />
          </Field>
        </CardContent>
        <CardFooter className="justify-end">
          <Button onClick={save}>
            {saved ? <Check /> : null}
            {saved ? "Saved" : "Save changes"}
          </Button>
        </CardFooter>
      </Card>

      <ConsignmentSchemaCard initial={consignmentTemplate} />

      {/* Dashboard view */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutDashboard className="size-4 text-primary" /> Dashboard view
          </CardTitle>
          <CardDescription>
            Choose which sidebar pages are shown for this browser.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Dashboard view" half>
            <Select
              value={view}
              onChange={(e) => setView(e.target.value as DashboardView)}
            >
              <option value="new">New — show every page</option>
              <option value="legacy">Legacy — show the original page set only</option>
            </Select>
          </Field>
        </CardContent>
        <CardFooter className="justify-start">
          <p className="text-xs text-muted-foreground">
            Legacy only hides sidebar links — every page stays reachable by its URL.
          </p>
        </CardFooter>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="size-4 text-primary" /> Notifications
          </CardTitle>
          <CardDescription>Choose what you want to hear about.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {NOTIFICATIONS.map((n) => (
            <div key={n.key} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="text-sm font-medium">{n.label}</p>
                <p className="text-sm text-muted-foreground">{n.desc}</p>
              </div>
              <Switch
                checked={toggles[n.key]}
                onCheckedChange={(v) =>
                  setToggles((t) => ({ ...t, [n.key]: v }))
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Integrations pointer */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="size-4 text-primary" /> Integrations
          </CardTitle>
          <CardDescription>
            Shopify and other external connections are managed on their own page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 rounded-lg border border-border bg-muted/40 p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
              <ShoppingBag className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Shopify, payments, email, shipping</p>
              <p className="text-sm text-muted-foreground">
                Connect credentials and test connections from the Integrations page.
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/integrations">
                <ExternalLink />
                Open Integrations
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
