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
} from "@/components/icons";
import type { CurrentUser } from "@/lib/auth";
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

export function SettingsView({ user }: { user: CurrentUser }) {
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
            <Select defaultValue="USD">
              <option value="USD">USD — US Dollar</option>
              <option value="GBP">GBP — British Pound</option>
              <option value="EUR">EUR — Euro</option>
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
