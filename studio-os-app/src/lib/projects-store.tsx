"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { PROJECTS as SEED_PROJECTS } from "./sample-data";
import {
  normalizeDriveDocLink,
  normalizeDriveFolderLink,
} from "./drive-folder";
import type { DriveDocLink, DriveFolderLink, Project } from "./types";

const STORAGE_KEY_V2 = "studio-os.project-links.v2";
const STORAGE_KEY_V1 = "studio-os.project-links.v1";

type ProjectLinkRecord = {
  folder: DriveFolderLink | null;
  docs: DriveDocLink[];
};

type ProjectLinksStore = Record<string, ProjectLinkRecord>;

function emptyRecord(): ProjectLinkRecord {
  return { folder: null, docs: [] };
}

function loadLinks(): ProjectLinksStore {
  try {
    const rawV2 = localStorage.getItem(STORAGE_KEY_V2);
    if (rawV2) {
      const parsed = JSON.parse(rawV2) as Record<string, unknown>;
      const out: ProjectLinksStore = {};
      for (const [id, val] of Object.entries(parsed)) {
        if (!val || typeof val !== "object") continue;
        const rec = val as { folder?: unknown; docs?: unknown[] };
        out[id] = {
          folder: rec.folder ? normalizeDriveFolderLink(rec.folder) : null,
          docs: Array.isArray(rec.docs)
            ? rec.docs.map(normalizeDriveDocLink).filter((d): d is DriveDocLink => d !== null)
            : [],
        };
      }
      return out;
    }

    const rawV1 = localStorage.getItem(STORAGE_KEY_V1);
    if (!rawV1) return {};
    const parsedV1 = JSON.parse(rawV1) as Record<string, unknown>;
    const migrated: ProjectLinksStore = {};
    for (const [id, val] of Object.entries(parsedV1)) {
      migrated[id] = {
        folder: val === null ? null : normalizeDriveFolderLink(val),
        docs: [],
      };
    }
    return migrated;
  } catch {
    return {};
  }
}

type ProjectsContextValue = {
  projects: Project[];
  getProject: (id: string) => Project | undefined;
  setProjectDriveFolder: (projectId: string, folder: DriveFolderLink) => void;
  removeProjectDriveFolder: (projectId: string) => void;
  addProjectDriveDoc: (projectId: string, doc: DriveDocLink) => void;
  removeProjectDriveDoc: (projectId: string, docId: string) => void;
};

const ProjectsContext = createContext<ProjectsContextValue | null>(null);

export function ProjectsProvider({ children }: { children: React.ReactNode }) {
  const [links, setLinks] = useState<ProjectLinksStore>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLinks(loadLinks());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(links));
    } catch {
      /* ignore */
    }
  }, [links, hydrated]);

  const projects = useMemo(
    () =>
      SEED_PROJECTS.map((p) => {
        const rec = links[p.id];
        return {
          ...p,
          driveFolder: rec?.folder ?? p.driveFolder ?? null,
          driveDocs: rec?.docs ?? p.driveDocs ?? [],
        };
      }),
    [links]
  );

  const getProject = useCallback(
    (id: string) => projects.find((p) => p.id === id),
    [projects]
  );

  const patchRecord = useCallback(
    (projectId: string, patch: Partial<ProjectLinkRecord>) => {
      setLinks((prev) => ({
        ...prev,
        [projectId]: { ...emptyRecord(), ...prev[projectId], ...patch },
      }));
    },
    []
  );

  const setProjectDriveFolder = useCallback(
    (projectId: string, folder: DriveFolderLink) => {
      patchRecord(projectId, { folder });
    },
    [patchRecord]
  );

  const removeProjectDriveFolder = useCallback(
    (projectId: string) => {
      patchRecord(projectId, { folder: null });
    },
    [patchRecord]
  );

  const addProjectDriveDoc = useCallback(
    (projectId: string, doc: DriveDocLink) => {
      setLinks((prev) => {
        const current = prev[projectId] ?? emptyRecord();
        if (current.docs.some((d) => d.id === doc.id)) return prev;
        return {
          ...prev,
          [projectId]: { ...current, docs: [...current.docs, doc] },
        };
      });
    },
    []
  );

  const removeProjectDriveDoc = useCallback((projectId: string, docId: string) => {
    setLinks((prev) => {
      const current = prev[projectId];
      if (!current) return prev;
      return {
        ...prev,
        [projectId]: { ...current, docs: current.docs.filter((d) => d.id !== docId) },
      };
    });
  }, []);

  return (
    <ProjectsContext.Provider
      value={{
        projects,
        getProject,
        setProjectDriveFolder,
        removeProjectDriveFolder,
        addProjectDriveDoc,
        removeProjectDriveDoc,
      }}
    >
      {children}
    </ProjectsContext.Provider>
  );
}

export function useProjects(): ProjectsContextValue {
  const ctx = useContext(ProjectsContext);
  if (!ctx) throw new Error("useProjects must be used within a ProjectsProvider");
  return ctx;
}
