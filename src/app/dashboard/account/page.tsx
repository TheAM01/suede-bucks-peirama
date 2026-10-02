import type { Metadata } from "next";
import { requirePage } from "@/lib/guard";
import { AccountView } from "@/components/dashboard/account-view";

export const metadata: Metadata = { title: "Account" };

/** Your own account: who you are and your password. Always open — and the only page a temporary password can reach. */
export default async function AccountPage({ searchParams }: { searchParams: Promise<{ first?: string }> }) {
  const user = await requirePage("/dashboard/account");
  const { first } = await searchParams;
  return (
    <AccountView
      name={user.name}
      username={user.username}
      isOwner={user.isOwner}
      mustChange={user.mustChangePassword || first === "1"}
    />
  );
}
