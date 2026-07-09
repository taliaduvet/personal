import { ArchivePageClient } from "@/components/ArchivePageClient";

type Search = { tab?: string; project?: string; area?: string };

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const params = await searchParams;
  const tab = params.tab === "logbook" || params.tab === "recipes" ? params.tab : "shelf";
  return (
    <ArchivePageClient
      tab={tab}
      projectId={params.project ?? null}
      areaId={params.area ?? null}
    />
  );
}
