"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  ShoppingBag,
  Plug,
  Check,
  AlertCircle,
  RefreshCw,
  Trash2,
  Loader2,
  ExternalLink,
  Lock,
} from "@/components/icons";
import type { ShopifyIntegrationView } from "@/lib/integrations";
import {
  SHOPIFY_SCOPES_REQUIRED,
  SHOPIFY_SCOPES_OPTIONAL,
  SHOPIFY_SCOPES_STRING,
} from "@/lib/shopify-scopes";
import {
  connectShopifyAction,
  disconnectShopifyAction,
  testShopifyAction,
  type IntegrationActionState,
} from "@/lib/integration-actions";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Segmented } from "@/components/ui/segmented";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { relativeTime } from "@/lib/utils";

type AuthMethod = "client_credentials" | "admin_token";

function StatusBanner({ state }: { state: IntegrationActionState }) {
  if (!state.message) return null;
  return (
    <div
      className={
        state.ok
          ? "flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2.5 text-sm text-success"
          : "flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
      }
    >
      {state.ok ? (
        <Check className="size-4 shrink-0" />
      ) : (
        <AlertCircle className="size-4 shrink-0" />
      )}
      <span>{state.message}</span>
    </div>
  );
}

function ScopesPanel() {
  const [copied, setCopied] = React.useState(false);

  async function copyScopes() {
    try {
      await navigator.clipboard.writeText(SHOPIFY_SCOPES_STRING);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (http / permissions) — the list is selectable below.
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Scopes to grant the app</p>
          <p className="text-xs text-muted-foreground">
            Tick these under the app&apos;s API access configuration in the Dev Dashboard.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={copyScopes}>
          {copied ? <Check /> : null}
          {copied ? "Copied" : "Copy list"}
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {SHOPIFY_SCOPES_REQUIRED.map((scope) => (
          <code
            key={scope}
            className="rounded-md border border-border bg-card px-2 py-0.5 font-mono text-[11px] text-foreground"
          >
            {scope}
          </code>
        ))}
      </div>
      <div className="border-t border-border pt-3">
        <p className="text-xs font-medium text-muted-foreground">
          Optional (plan-dependent):
        </p>
        <ul className="mt-1.5 space-y-1">
          {SHOPIFY_SCOPES_OPTIONAL.map((o) => (
            <li key={o.scope} className="flex items-baseline gap-2 text-xs text-muted-foreground">
              <code className="rounded-md border border-border bg-card px-2 py-0.5 font-mono text-[11px] text-foreground">
                {o.scope}
              </code>
              <span>{o.why}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ConnectSubmit({ replacing }: { replacing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <Plug />}
      {pending
        ? "Connecting…"
        : replacing
          ? "Save & reconnect"
          : "Connect Shopify"}
    </Button>
  );
}

export function IntegrationsView({
  shopify,
}: {
  shopify: ShopifyIntegrationView | null;
}) {
  const [connectState, connectAction] = useActionState<
    IntegrationActionState,
    FormData
  >(connectShopifyAction, {});
  const [testState, setTestState] = React.useState<IntegrationActionState>({});
  const [testing, setTesting] = React.useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = React.useState(false);
  const [showForm, setShowForm] = React.useState(!shopify);
  const [method, setMethod] = React.useState<AuthMethod>(
    shopify?.authMethod ?? "client_credentials",
  );

  async function runTest() {
    setTesting(true);
    setTestState({});
    try {
      setTestState(await testShopifyAction());
    } finally {
      setTesting(false);
    }
  }

  async function runDisconnect() {
    setConfirmDisconnect(false);
    await disconnectShopifyAction();
    setShowForm(true);
    setTestState({});
  }

  const connected = Boolean(shopify?.lastCheck?.ok);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Shopify */}
      <Card>
        <CardHeader
          action={
            shopify ? (
              <Badge variant={connected ? "success" : "warning"}>
                {connected ? "Connected" : "Needs attention"}
              </Badge>
            ) : (
              <Badge variant="outline">Not connected</Badge>
            )
          }
        >
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="size-4 text-primary" /> Shopify
          </CardTitle>
          <CardDescription>
            Sync products, orders, customers, and inventory with your Shopify
            store. Credentials are stored server-side only; access tokens are
            short-lived and refreshed automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {shopify ? (
            <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-4">
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Store</p>
                  <p className="mt-0.5 font-medium">{shopify.storeDomain}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Auth method</p>
                  <p className="mt-0.5 font-medium">
                    {shopify.authMethod === "client_credentials"
                      ? "Client credentials (auto-refresh)"
                      : "Legacy admin token"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    {shopify.authMethod === "client_credentials" ? "Client secret" : "Admin token"}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 font-mono text-[13px]">
                    <Lock className="size-3.5 text-muted-foreground" />
                    {shopify.credentialMasked}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">API version</p>
                  <p className="mt-0.5 font-medium tabular-nums">{shopify.apiVersion}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Access token</p>
                  <p className="mt-0.5 font-medium">
                    {shopify.authMethod === "admin_token"
                      ? "Permanent (legacy)"
                      : shopify.hasFreshToken
                        ? "Fresh — cached"
                        : "Will mint on next call"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Last check</p>
                  <p className="mt-0.5 font-medium">
                    {shopify.lastCheck
                      ? `${shopify.lastCheck.ok ? "OK" : "Failed"} · ${relativeTime(shopify.lastCheck.at)}`
                      : "Never"}
                  </p>
                </div>
              </div>
              {shopify.lastCheck && !shopify.lastCheck.ok ? (
                <p className="text-sm text-destructive">{shopify.lastCheck.message}</p>
              ) : null}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={runTest} disabled={testing}>
                  {testing ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                  {testing ? "Testing…" : "Test connection"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowForm((s) => !s)}>
                  {showForm ? "Hide credentials form" : "Edit credentials"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setConfirmDisconnect(true)}
                >
                  <Trash2 />
                  Disconnect
                </Button>
              </div>
              <StatusBanner state={testState} />
            </div>
          ) : null}

          {showForm ? (
            <form action={connectAction} className="space-y-4">
              <StatusBanner state={connectState} />

              <div className="space-y-2">
                <Label>Authentication method</Label>
                <Segmented<AuthMethod>
                  value={method}
                  onChange={setMethod}
                  options={[
                    { value: "client_credentials", label: "Client credentials (recommended)" },
                    { value: "admin_token", label: "Legacy admin token" },
                  ]}
                />
                <input type="hidden" name="authMethod" value={method} />
                <p className="text-xs text-muted-foreground">
                  {method === "client_credentials"
                    ? "Shopify's current model: the app exchanges its Client ID + Secret for short-lived Admin API tokens. Nothing permanent to leak."
                    : "Only for stores that still hold a permanent shpat_ token from the retired custom-apps flow."}
                </p>
              </div>

              {method === "client_credentials" ? <ScopesPanel /> : null}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="storeDomain">Store domain</Label>
                  <Input
                    id="storeDomain"
                    name="storeDomain"
                    placeholder="peirama.myshopify.com"
                    defaultValue={shopify?.storeDomain ?? ""}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    The <code className="rounded bg-muted px-1">*.myshopify.com</code> domain, not your custom storefront domain.
                  </p>
                </div>

                {method === "client_credentials" ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="clientId">Client ID</Label>
                      <Input
                        id="clientId"
                        name="clientId"
                        autoComplete="off"
                        placeholder="From the Dev Dashboard app"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="clientSecret">Client Secret</Label>
                      <Input
                        id="clientSecret"
                        name="clientSecret"
                        type="password"
                        autoComplete="off"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="adminToken">Admin API access token</Label>
                    <Input
                      id="adminToken"
                      name="adminToken"
                      type="password"
                      placeholder="shpat_…"
                      autoComplete="off"
                      required
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="apiVersion">API version</Label>
                  <Input
                    id="apiVersion"
                    name="apiVersion"
                    defaultValue={shopify?.apiVersion ?? "2026-01"}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <a
                  href="https://shopify.dev/docs/api/admin-graphql/latest/guides/client-credentials"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="size-3.5" />
                  {method === "client_credentials"
                    ? "Client credentials grant docs"
                    : "Shopify auth docs"}
                </a>
                <ConnectSubmit replacing={Boolean(shopify)} />
              </div>
            </form>
          ) : null}
        </CardContent>
      </Card>

      {/* Coming next */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="size-4 text-primary" /> More integrations
          </CardTitle>
          <CardDescription>Planned connections — not yet available.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {[
            { name: "Payment gateway (Stripe)", desc: "Reconcile payouts against transactions." },
            { name: "Email marketing (Klaviyo)", desc: "Sync segments for campaigns and abandoned-cart flows." },
            { name: "Shipping (Shippo)", desc: "Purchase labels and track fulfillments." },
          ].map((i) => (
            <div key={i.name} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="text-sm font-medium">{i.name}</p>
                <p className="text-sm text-muted-foreground">{i.desc}</p>
              </div>
              <Badge variant="outline">Soon</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmDisconnect}
        onCancel={() => setConfirmDisconnect(false)}
        onConfirm={runDisconnect}
        title="Disconnect Shopify?"
        description="The stored credentials will be deleted. Nothing is changed on the Shopify side."
        confirmLabel="Disconnect"
      />
    </div>
  );
}
