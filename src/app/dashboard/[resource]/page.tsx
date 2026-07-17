import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RESOURCE_KEYS, getResource } from "@/config/resources";
import { ResourceView } from "@/components/dashboard/resource-view";

export function generateStaticParams() {
  return RESOURCE_KEYS.map((resource) => ({ resource }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ resource: string }>;
}): Promise<Metadata> {
  const { resource } = await params;
  const config = getResource(resource);
  return { title: config?.plural ?? "Not found" };
}

export default async function ResourcePage({
  params,
}: {
  params: Promise<{ resource: string }>;
}) {
  const { resource } = await params;
  if (!getResource(resource)) notFound();
  return <ResourceView resourceKey={resource} />;
}
