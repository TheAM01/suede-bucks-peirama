"use client";

import * as React from "react";
import { AlertCircle, Check, User } from "@/components/icons";
import { changePasswordAction, type PasswordState } from "@/lib/auth-actions";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Your account: name, username, and changing your password (required after a temporary one). */
export function AccountView({
  name,
  username,
  isOwner,
  mustChange,
}: {
  name: string;
  username: string;
  isOwner: boolean;
  mustChange: boolean;
}) {
  const [state, action, pending] = React.useActionState<PasswordState, FormData>(changePasswordAction, {});

  return (
    <div className="mx-auto max-w-xl space-y-6">
      {mustChange && !isOwner ? (
        <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2.5 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning" />
          <span>
            You signed in with a temporary password. Choose your own password to continue — the rest of the dashboard
            opens once it&apos;s changed.
          </span>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="size-4 text-primary" /> Your account
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium">{name}</p>
            <p className="text-sm text-muted-foreground">@{username}</p>
          </div>
          <Badge variant="primary">{isOwner ? "Owner" : "User"}</Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>
            {isOwner
              ? "The Owner's password comes from the server's environment (ADMIN_PASSWORD) and is changed there, not here."
              : "Changing it signs you out on every other device."}
          </CardDescription>
        </CardHeader>
        {isOwner ? null : (
          <form action={action}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pw-current">{mustChange ? "Temporary password" : "Current password"}</Label>
                <Input id="pw-current" name="current" type="password" autoComplete="current-password" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pw-next">New password</Label>
                <Input id="pw-next" name="next" type="password" autoComplete="new-password" minLength={8} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pw-confirm">Repeat new password</Label>
                <Input id="pw-confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
              </div>
              {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
              {state.ok ? (
                <p className="flex items-center gap-1.5 text-sm text-success">
                  <Check className="size-4" /> Password changed.
                </p>
              ) : null}
            </CardContent>
            <CardFooter className="justify-end">
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Change password"}
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
