import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "@/components/icons";
import { Wordmark } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card, CardContent } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { next, revoked } = await searchParams;
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="absolute right-4 top-4 md:right-8 md:top-8">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Wordmark />
          <div>
            <h1 className="font-heading text-xl font-semibold tracking-tight">
              Sign in to your store
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter your username and password to continue.
            </p>
          </div>
        </div>

        {revoked ? (
          // Set by /api/auth/signout when an account was disabled, reset, or changed.
          <p className="mb-4 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2.5 text-sm">
            You&apos;ve been signed out — your account was changed or disabled. Sign in again.
          </p>
        ) : null}

        <Card>
          <CardContent className="py-6">
            <LoginForm next={typeof next === "string" ? next : undefined} />
          </CardContent>
        </Card>

        <div className="mt-6 flex items-center justify-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
