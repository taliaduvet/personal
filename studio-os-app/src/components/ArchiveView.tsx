"use client";

import { useEffect, useState } from "react";
import { ShelfView } from "@/components/ShelfView";
import { LogbookView } from "@/components/LogbookView";
import { RecipesView } from "@/components/RecipesView";

export type ArchiveTab = "shelf" | "logbook" | "recipes";

const TABS: { id: ArchiveTab; label: string }[] = [
  { id: "shelf", label: "Shelf" },
  { id: "logbook", label: "Logbook" },
  { id: "recipes", label: "Recipes" },
];

export function ArchiveView({
  initialTab = "shelf",
  initialProjectId,
  initialAreaId,
}: {
  initialTab?: ArchiveTab;
  initialProjectId?: string | null;
  initialAreaId?: string | null;
}) {
  const [tab, setTab] = useState<ArchiveTab>(initialTab);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  return (
    <div>
      <div className="mb-6 inline-flex max-w-full flex-wrap rounded-lg border border-border bg-surface p-0.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={[
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              tab === t.id ? "bg-accent text-white" : "text-muted hover:text-ink",
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "shelf" && (
        <ShelfView initialProjectId={initialProjectId} initialAreaId={initialAreaId} />
      )}
      {tab === "logbook" && <LogbookView />}
      {tab === "recipes" && <RecipesView />}
    </div>
  );
}
