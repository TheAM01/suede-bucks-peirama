import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard/shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  // A signed cookie whose account was disabled / reset / deleted: clear it on the way to /login.
  if (!user) redirect("/api/auth/signout?reason=revoked");

  // Each page checks its own permission (requirePage in src/lib/guard.ts) —
  // layouts don't re-run on client-side navigation, so they can't gate pages.
  return <DashboardShell user={user}>{children}</DashboardShell>;
}
