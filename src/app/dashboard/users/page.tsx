import type { Metadata } from "next";
import { requirePage } from "@/lib/guard";
import { UsersView } from "@/components/dashboard/users-view";

export const metadata: Metadata = { title: "Users" };

export default async function UsersPage() {
  const user = await requirePage("/dashboard/users");
  return <UsersView me={{ id: user.id, username: user.username, isOwner: user.isOwner, permissions: user.permissions }} />;
}
