"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { PROJECTS as SEED_PROJECTS } from "./sample-data";
import { setActiveProjects } from "./project-registry";
import {
  normalizeDriveDocLink,
  normalizeDriveFolderLink,
} from "./drive-folder";
import type { DriveDocLink, DriveFolderLink, Project } from "./types";
import { notifyAppDataProject } from "./sheet/app-data-notify";
import { uniqueId } from "./slug-id";

const STORAGE_KEY_V2 = "studio-os.project-links.v2";
const STORAGE_KEY_V1 = "studio-os.project-links.v1";
const SHEET_PROJECTS_KEY = "studio-os.sheet-projects.v1";
const LOCAL_META_KEY = "studio-os.project-meta.v1";

type ProjectLinkRecord = {
  folder: DriveFolderLink | null;
  docs: DriveDocLink[];
  personIds: string[];
};

type ProjectLinksStore = Record<string, ProjectLinkRecord>;

type ProjectOverride = {
  name?: string;
  why?: string | null;
  lifeAreaId?: string;
};

type LocalProjectMeta = {
  overrides: Record<string, ProjectOverride>;
  created: Project[];
  hidden: string[];
};

export type ProjectDraft = {
  name: string;
  lifeAreaId: string;
  why?: string | null;
};

function emptyRecord(): ProjectLinkRecord {
  return { folder: null, docs: [], personIds: [] };
}

function emptyMeta(): LocalProjectMeta {
  return { overrides: {}, created: [], hidden: [] };
}

function loadLinks(): ProjectLinksStore {
  try {
    const rawV2 = localStorage.getItem(STORAGE_KEY_V2);
    if (rawV2) {
      const parsed = JSON.parse(rawV2) as Record<string, unknown>;
      const out: ProjectLinksStore = {};
      for (const [id, val] of Object.entries(parsed)) {
        if (!val || typeof val !== "object") continue;
        const rec = val as { folder?: unknown; docs?: unknown[]; personIds?: unknown[] };
        out[id] = {
          folder: rec.folder ? normalizeDriveFolderLink(rec.folder) : null,
          docs: Array.isArray(rec.docs)
            ? rec.docs.map(normalizeDriveDocLink).filter((d): d is DriveDocLink => d !== null)
            : [],
          personIds: Array.isArray(rec.personIds)
            ? rec.personIds.filter((p): p is string => typeof p === "string")
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
        personIds: [],
      };
    }
    return migrated;
  } catch {
    return {};
  }
}

function loadMeta(): LocalProjectMeta {
  try {
    const raw = localStorage.getItem(LOCAL_META_KEY);
    if (!raw) return emptyMeta();
    const parsed = JSON.parse(raw) as Partial<LocalProjectMeta>;
    return {
      overrides: parsed.overrides ?? {},
      created: Array.isArray(parsed.created) ? parsed.created : [],
      hidden: Array.isArray(parsed.hidden) ? parsed.hidden : [],
    };
  } catch {
    return emptyMeta();
  }
}

function mergeProjectList(
  base: Project[],
  meta: LocalProjectMeta,
  links: ProjectLinksStore
): Project[] {
  const hidden = new Set(meta.hidden);
  const byId = new Map<string, Project>();

  for (const p of base) {
    if (hidden.has(p.id)) continue;
    const patch = meta.overrides[p.id];
    byId.set(p.id, patch ? { ...p, ...patch } : p);
  }

  for (const p of meta.created) {
    if (hidden.has(p.id)) continue;
    const patch = meta.overrides[p.id];
    byId.set(p.id, patch ? { ...p, ...patch } : p);
  }

  return Array.from(byId.values()).map((p) => {
    const rec = links[p.id] ?? emptyRecord();
    return {
      ...p,
      driveFolder: rec.folder ?? p.driveFolder ?? null,
      driveDocs: rec.docs ?? p.driveDocs ?? [],
      personIds: rec.personIds ?? p.personIds ?? [],
    };
  });
}

type ProjectsContextValue = {
  projects: Project[];
  getProject: (id: string) => Project | undefined;
  createProject: (draft: ProjectDraft) => Project;
  updateProject: (id: string, patch: Partial<ProjectDraft>) => void;
  deleteProject: (id: string) => string | null;
  isLocalProject: (id: string) => boolean;
  setProjectDriveFolder: (projectId: string, folder: DriveFolderLink) => void;
  removeProjectDriveFolder: (projectId: string) => void;
  addProjectDriveDoc: (projectId: string, doc: DriveDocLink) => void;
  removeProjectDriveDoc: (projectId: string, docId: string) => void;
  addProjectPerson: (projectId: string, personId: string) => void;
  removeProjectPerson: (projectId: string, personId: string) => void;
  replaceProjectsFromSheet: (incoming: Project[]) => void;
  clearSheetProjects: () => void;
};

const ProjectsContext = createContext<ProjectsContextValue | null>(null);

export function ProjectsProvider({ children }: { children: React.ReactNode }) {
  const [links, setLinks] = useState<ProjectLinksStore>({});
  const [meta, setMeta] = useState<LocalProjectMeta>(emptyMeta);
  const [sheetProjects, setSheetProjects] = useState<Project[] | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLinks(loadLinks());
    setMeta(loadMeta());
    try {
      const raw = localStorage.getItem(SHEET_PROJECTS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Project[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSheetProjects(parsed);
        }
      }
    } catch {
      /* ignore */
    }
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

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(LOCAL_META_KEY, JSON.stringify(meta));
    } catch {
      /* ignore */
    }
  }, [meta, hydrated]);

  const projects = useMemo(() => {
    const base = sheetProjects ?? SEED_PROJECTS;
    return mergeProjectList(base, meta, links);
  }, [sheetProjects, meta, links]);

  const projectsRef = useRef(projects);
  projectsRef.current = projects;

  const pushProjectLinks = useCallback((projectId: string, patch: Partial<ProjectLinkRecord>) => {
    const base = projectsRef.current.find((p) => p.id === projectId);
    if (!base) return;
    const rec = { ...emptyRecord(), ...patch };
    notifyAppDataProject({
      ...base,
      driveFolder: "folder" in patch ? patch.folder ?? null : base.driveFolder ?? null,
      driveDocs: "docs" in patch ? patch.docs ?? [] : base.driveDocs ?? [],
      personIds: "personIds" in patch ? patch.personIds ?? [] : base.personIds ?? [],
    });
  }, []);

  useEffect(() => {
    setActiveProjects(projects);
  }, [projects]);

  const getProject = useCallback(
    (id: string) => projects.find((p) => p.id === id),
    [projects]
  );

  const isLocalProject = useCallback(
    (id: string) => meta.created.some((p) => p.id === id),
    [meta.created]
  );

  const patchRecord = useCallback((projectId: string, patch: Partial<ProjectLinkRecord>) => {
    setLinks((prev) => ({
      ...prev,
      [projectId]: { ...emptyRecord(), ...prev[projectId], ...patch },
    }));
  }, []);

  const createProject = useCallback((draft: ProjectDraft): Project => {
    const name = draft.name.trim();
    const existingIds = new Set(projectsRef.current.map((p) => p.id));
    const id = uniqueId("proj", name, existingIds);
    const project: Project = {
      id,
      name,
      lifeAreaId: draft.lifeAreaId,
      why: draft.why?.trim() || null,
    };
    setMeta((prev) => ({ ...prev, created: [...prev.created, project] }));
    return project;
  }, []);

  const updateProject = useCallback((id: string, patch: Partial<ProjectDraft>) => {
    setMeta((prev) => {
      const nextOverride: ProjectOverride = { ...prev.overrides[id] };
      if (patch.name !== undefined) nextOverride.name = patch.name.trim();
      if (patch.why !== undefined) nextOverride.why = patch.why?.trim() || null;
      if (patch.lifeAreaId !== undefined) nextOverride.lifeAreaId = patch.lifeAreaId;

      const createdIdx = prev.created.findIndex((p) => p.id === id);
      if (createdIdx >= 0) {
        const created = [...prev.created];
        created[createdIdx] = {
          ...created[createdIdx]!,
          ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
          ...(patch.why !== undefined ? { why: patch.why?.trim() || null } : {}),
          ...(patch.lifeAreaId !== undefined ? { lifeAreaId: patch.lifeAreaId } : {}),
        };
        return {
          ...prev,
          created,
          overrides: { ...prev.overrides, [id]: nextOverride },
        };
      }

      return {
        ...prev,
        overrides: { ...prev.overrides, [id]: nextOverride },
      };
    });
  }, []);

  const deleteProject = useCallback((id: string): string | null => {
    let err: string | null = null;
    setMeta((prev) => {
      const isLocal = prev.created.some((p) => p.id === id);
      if (!isLocal) {
        if (sheetProjects?.some((p) => p.id === id)) {
          if (prev.hidden.includes(id)) return prev;
          return { ...prev, hidden: [...prev.hidden, id] };
        }
        err = "Only app-created projects can be deleted.";
        return prev;
      }
      return {
        ...prev,
        created: prev.created.filter((p) => p.id !== id),
        overrides: Object.fromEntries(Object.entries(prev.overrides).filter(([k]) => k !== id)),
      };
    });
    return err;
  }, [sheetProjects]);

  const setProjectDriveFolder = useCallback(
    (projectId: string, folder: DriveFolderLink) => {
      patchRecord(projectId, { folder });
      queueMicrotask(() => pushProjectLinks(projectId, { folder }));
    },
    [patchRecord, pushProjectLinks]
  );

  const removeProjectDriveFolder = useCallback(
    (projectId: string) => {
      patchRecord(projectId, { folder: null });
      queueMicrotask(() => pushProjectLinks(projectId, { folder: null }));
    },
    [patchRecord, pushProjectLinks]
  );

  const addProjectDriveDoc = useCallback(
    (projectId: string, doc: DriveDocLink) => {
      setLinks((prev) => {
        const current = prev[projectId] ?? emptyRecord();
        if (current.docs.some((d) => d.id === doc.id)) return prev;
        const docs = [...current.docs, doc];
        queueMicrotask(() => pushProjectLinks(projectId, { docs }));
        return {
          ...prev,
          [projectId]: { ...current, docs },
        };
      });
    },
    [pushProjectLinks]
  );

  const removeProjectDriveDoc = useCallback(
    (projectId: string, docId: string) => {
      setLinks((prev) => {
        const current = prev[projectId];
        if (!current) return prev;
        const docs = current.docs.filter((d) => d.id !== docId);
        queueMicrotask(() => pushProjectLinks(projectId, { docs }));
        return {
          ...prev,
          [projectId]: { ...current, docs },
        };
      });
    },
    [pushProjectLinks]
  );

  const addProjectPerson = useCallback(
    (projectId: string, personId: string) => {
      setLinks((prev) => {
        const current = prev[projectId] ?? emptyRecord();
        if (current.personIds.includes(personId)) return prev;
        const personIds = [...current.personIds, personId];
        queueMicrotask(() => pushProjectLinks(projectId, { personIds }));
        return { ...prev, [projectId]: { ...current, personIds } };
      });
    },
    [pushProjectLinks]
  );

  const removeProjectPerson = useCallback(
    (projectId: string, personId: string) => {
      setLinks((prev) => {
        const current = prev[projectId];
        if (!current) return prev;
        const personIds = current.personIds.filter((id) => id !== personId);
        queueMicrotask(() => pushProjectLinks(projectId, { personIds }));
        return { ...prev, [projectId]: { ...current, personIds } };
      });
    },
    [pushProjectLinks]
  );

  const replaceProjectsFromSheet = useCallback((incoming: Project[]) => {
    setSheetProjects(incoming);
    try {
      localStorage.setItem(SHEET_PROJECTS_KEY, JSON.stringify(incoming));
    } catch {
      /* ignore */
    }
  }, []);

  const clearSheetProjects = useCallback(() => {
    setSheetProjects(null);
    try {
      localStorage.removeItem(SHEET_PROJECTS_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <ProjectsContext.Provider
      value={{
        projects,
        getProject,
        createProject,
        updateProject,
        deleteProject,
        isLocalProject,
        setProjectDriveFolder,
        removeProjectDriveFolder,
        addProjectDriveDoc,
        removeProjectDriveDoc,
        addProjectPerson,
        removeProjectPerson,
        replaceProjectsFromSheet,
        clearSheetProjects,
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
