import { notFound, redirect } from "next/navigation";
import { DemoStudio } from "@/components/demo-studio";
const pages = new Set(["library", "upload", "voices", "requests", "account", "guide", "player", "processing"]);
export default async function DemoPage({ params }: { params: Promise<{ path?: string[] }> }) {
  const { path } = await params;
  if (!path?.length) redirect("/demo/library");
  if (path.length !== 1 || !pages.has(path[0])) notFound();
  return <DemoStudio page={path[0]} />;
}
