"use client";

import { ArchiveView, type ArchiveTab } from "@/components/ArchiveView";

export function ArchivePageClient({
  tab,
  projectId,
  areaId,
}: {
  tab: ArchiveTab;
  projectId: string | null;
  areaId: string | null;
}) {
  return (
    <ArchiveView
      initialTab={tab}
      initialProjectId={projectId}
      initialAreaId={areaId}
    />
  );
}
