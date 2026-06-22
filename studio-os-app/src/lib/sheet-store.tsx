"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { parseSheetId } from "@/lib/sheet/parse-id";
import { pullFromSheet } from "@/lib/sheet/sync";
import { TEMPLATE_COPY_URL } from "@/lib/sheet/schema";
import {
  connectSheetsDirect,
  disconnectSheetsDirect,
  getSheetsAccessToken,
} from "@/lib/google/sheets-auth";
import { getCalendarAccessToken } from "@/lib/google/calendar-auth";
import { useSettings } from "@/lib/settings-store";
import { useTasks } from "@/lib/store";
import { useProjects } from "@/lib/projects-store";
import { buildTaskRowIndex } from "@/lib/sheet/row-index";
import { fetchSheetData } from "@/lib/sheet/client";
import { deleteTaskFromSheet, pushTasksToSheet } from "@/lib/sheet/push";
import { SheetPushQueue } from "@/lib/sheet/push-queue";
import {
  registerSheetPush,
  shouldPushTask,
} from "@/lib/sheet/push-registry";
import {
  registerAppDataPush,
} from "@/lib/sheet/app-data-notify";
import {
  emptyAppDataStore,
  type AppDataStore,
} from "@/lib/sheet/app-data";
import { writeAppDataStore, upsertSheetSetting } from "@/lib/sheet/app-data-write";
import { SCHEMA_VERSION } from "@/lib/sheet/schema";
import {
  ensureWeeklyReviewEvent,
  getOrCreateStudioCalendarId,
  syncTaskCalendarEvents,
} from "@/lib/calendar/calendar-write";
import type { Task } from "@/lib/types";

const STORAGE_KEY = "studio-os.sheet.v1";
const APP_DATA_DEBOUNCE_MS = 900;

export type SheetConnection = {
  sheetId: string;
  sheetTitle: string;
  lastSyncAt: string | null;
};

export type WriteStatus = "idle" | "pending" | "syncing" | "error";

type SheetContextValue = {
  connection: SheetConnection | null;
  syncing: boolean;
  syncError: string | null;
  writeStatus: WriteStatus;
  writeError: string | null;
  templateCopyUrl: string;
  connectAndSync: (sheetUrlOrId: string) => Promise<void>;
  syncNow: () => Promise<void>;
  disconnect: () => void;
};

const SheetContext = createContext<SheetContextValue | null>(null);

function loadConnection(): SheetConnection | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SheetConnection;
    if (!parsed?.sheetId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function SheetProvider({ children }: { children: ReactNode }) {
  const { weekStartsOn, applyFromSheetAppData } = useSettings();
  const { replaceTasksFromSheet, replaceTaskId } = useTasks();
  const { projects, replaceProjectsFromSheet, clearSheetProjects } = useProjects();

  const [connection, setConnection] = useState<SheetConnection | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [writeStatus, setWriteStatus] = useState<WriteStatus>("idle");
  const [writeError, setWriteError] = useState<string | null>(null);

  const rowIndexRef = useRef<Map<string, number>>(new Map());
  const tasksRowsRef = useRef<unknown[][]>([]);
  const appDataRef = useRef<AppDataStore>(emptyAppDataStore());
  const appDataDirtyRef = useRef(false);
  const appDataTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const calendarIdRef = useRef<string | null>(null);
  const sheetSettingsRef = useRef<Record<string, string>>({});

  const projectsRef = useRef(projects);
  const weekStartsOnRef = useRef(weekStartsOn);
  const connectionRef = useRef(connection);
  const pullingRef = useRef(false);
  const queueRef = useRef<SheetPushQueue | null>(null);

  projectsRef.current = projects;
  weekStartsOnRef.current = weekStartsOn;
  connectionRef.current = connection;

  useEffect(() => {
    setConnection(loadConnection());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      if (connection) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(connection));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      /* ignore */
    }
  }, [connection, hydrated]);

  const ensureToken = useCallback(async () => {
    let token = getSheetsAccessToken();
    if (!token) token = await connectSheetsDirect();
    return token;
  }, []);

  const flushAppData = useCallback(async () => {
    const conn = connectionRef.current;
    if (!conn?.sheetId || !appDataDirtyRef.current) return;
    const token = await ensureToken();
    await writeAppDataStore(conn.sheetId, token, appDataRef.current);
    appDataDirtyRef.current = false;
    setConnection((c) =>
      c ? { ...c, lastSyncAt: new Date().toISOString() } : c
    );
  }, [ensureToken]);

  const scheduleAppDataFlush = useCallback(() => {
    if (pullingRef.current) return;
    appDataDirtyRef.current = true;
    if (appDataTimerRef.current) clearTimeout(appDataTimerRef.current);
    appDataTimerRef.current = setTimeout(() => {
      appDataTimerRef.current = null;
      void flushAppData().catch((e) => {
        const message = e instanceof Error ? e.message : "Could not save app data";
        setWriteError(message);
        setWriteStatus("error");
      });
    }, APP_DATA_DEBOUNCE_MS);
  }, [flushAppData]);

  const refreshRowIndex = useCallback(async (sheetId: string, token: string) => {
    const raw = await fetchSheetData(sheetId, token);
    rowIndexRef.current = buildTaskRowIndex(raw.tasks);
    tasksRowsRef.current = raw.tasks;
  }, []);

  useEffect(() => {
    if (!hydrated || !connection?.sheetId) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await ensureToken();
        if (cancelled) return;
        await refreshRowIndex(connection.sheetId, token);
      } catch {
        /* row index rebuilds on next sync */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, connection?.sheetId, ensureToken, refreshRowIndex]);

  const maybeSyncWeeklyReview = useCallback(async (settings: Record<string, string>) => {
    const calToken = getCalendarAccessToken();
    if (!calToken) return;

    const mode = settings.calendarSyncMode ?? "appsScript";
    if (mode === "off" || mode === "appsScript") return;

    const calId = calendarIdRef.current ?? (await getOrCreateStudioCalendarId(calToken));
    calendarIdRef.current = calId;

    const seriesId = await ensureWeeklyReviewEvent(
      calToken,
      calId,
      settings.weeklyReviewDay ?? "Mon",
      settings.weeklyReviewTime ?? "09:00",
      settings.weeklyReviewEventId ?? null
    );
    if (seriesId && seriesId !== settings.weeklyReviewEventId) {
      sheetSettingsRef.current = { ...settings, weeklyReviewEventId: seriesId };
    }
  }, []);

  const applyPull = useCallback(
    (
      sheetId: string,
      sheetTitle: string,
      tasks: Task[],
      nextProjects: Parameters<typeof replaceProjectsFromSheet>[0],
      rowIndex: Map<string, number>,
      tasksRows: unknown[][],
      appData: AppDataStore,
      settings: Record<string, string>
    ) => {
      pullingRef.current = true;
      appDataRef.current = appData;
      appDataDirtyRef.current = false;
      sheetSettingsRef.current = settings;

      replaceProjectsFromSheet(nextProjects);
      replaceTasksFromSheet(tasks);

      const weekPlanning: Record<string, import("@/lib/settings-store").WeekPlanningRecord> = {};
      for (const [key, rec] of appData.weekPlanning) {
        weekPlanning[key] = rec;
      }
      applyFromSheetAppData({ contacts: appData.contacts, weekPlanning, lifeAreas: appData.lifeAreas });

      rowIndexRef.current = rowIndex;
      tasksRowsRef.current = tasksRows;
      setConnection({
        sheetId,
        sheetTitle,
        lastSyncAt: new Date().toISOString(),
      });
      setSyncError(null);
      pullingRef.current = false;

      void maybeSyncWeeklyReview(settings);
    },
    [applyFromSheetAppData, maybeSyncWeeklyReview, replaceProjectsFromSheet, replaceTasksFromSheet]
  );

  const runPull = useCallback(
    async (sheetId: string, token: string, bootstrapSettings = false) => {
      const result = await pullFromSheet(sheetId, token, weekStartsOn);
      const raw = await fetchSheetData(sheetId, token);

      if (bootstrapSettings) {
        const settings = result.settings;
        if (settings.calendarSyncMode !== "app") {
          await upsertSheetSetting(sheetId, token, "calendarSyncMode", "app", raw.settings);
          settings.calendarSyncMode = "app";
        }
        if (settings.schemaVersion !== SCHEMA_VERSION) {
          await upsertSheetSetting(sheetId, token, "schemaVersion", SCHEMA_VERSION, raw.settings);
          settings.schemaVersion = SCHEMA_VERSION;
        }
        result.settings = settings;
      }

      const rowIndex = buildTaskRowIndex(raw.tasks);
      applyPull(
        sheetId,
        result.sheetTitle,
        result.tasks,
        result.projects,
        rowIndex,
        raw.tasks,
        result.appData,
        result.settings
      );
    },
    [applyPull, weekStartsOn]
  );

  const syncCalendarForBatch = useCallback(async (batch: Task[]): Promise<Task[]> => {
    const calToken = getCalendarAccessToken();
    if (!calToken) return batch;

    const mode = sheetSettingsRef.current.calendarSyncMode ?? "appsScript";
    if (mode === "off" || mode === "appsScript") return batch;

    let calId = calendarIdRef.current;
    const out: Task[] = [];

    for (const task of batch) {
      try {
        const result = await syncTaskCalendarEvents(
          calToken,
          task,
          weekStartsOnRef.current,
          calId
        );
        if (result) {
          calId = result.calendarId;
          calendarIdRef.current = calId;
          out.push({
            ...task,
            sheetMeta: { ...task.sheetMeta, eventId: result.eventId || undefined },
          });
        } else {
          out.push(task);
        }
      } catch {
        out.push(task);
      }
    }

    return out;
  }, []);

  const flushTasks = useCallback(
    async (batch: Task[]) => {
      const conn = connectionRef.current;
      if (!conn?.sheetId) return;
      const token = await ensureToken();
      const withCalendar = await syncCalendarForBatch(batch);
      const result = await pushTasksToSheet(
        conn.sheetId,
        token,
        withCalendar,
        new Map(rowIndexRef.current),
        projectsRef.current,
        weekStartsOnRef.current,
        tasksRowsRef.current
      );
      rowIndexRef.current = result.rowIndex;
      for (const m of result.migrations) {
        replaceTaskId(m.oldId, m.newId, m.task);
      }
      setConnection((c) =>
        c ? { ...c, lastSyncAt: new Date().toISOString() } : c
      );
      setWriteError(null);
    },
    [ensureToken, replaceTaskId, syncCalendarForBatch]
  );

  const flushDelete = useCallback(
    async (taskId: string) => {
      const conn = connectionRef.current;
      if (!conn?.sheetId) return;
      const token = await ensureToken();
      rowIndexRef.current = await deleteTaskFromSheet(
        conn.sheetId,
        token,
        taskId,
        rowIndexRef.current
      );
      appDataRef.current.tasks.delete(taskId);
      appDataDirtyRef.current = true;
      await flushAppData();
      setConnection((c) =>
        c ? { ...c, lastSyncAt: new Date().toISOString() } : c
      );
      setWriteError(null);
    },
    [ensureToken, flushAppData]
  );

  useEffect(() => {
    if (!connection?.sheetId) {
      queueRef.current?.dispose();
      queueRef.current = null;
      registerSheetPush(null);
      registerAppDataPush(null);
      if (appDataTimerRef.current) clearTimeout(appDataTimerRef.current);
      setWriteStatus("idle");
      setWriteError(null);
      return;
    }

    const queue = new SheetPushQueue(
      flushTasks,
      flushDelete,
      (status, message) => {
        setWriteStatus(status);
        if (status === "error") setWriteError(message ?? "Could not save to sheet");
        else if (status === "idle") setWriteError(null);
      }
    );
    queueRef.current = queue;

    registerSheetPush({
      upsert: (task) => {
        if (pullingRef.current || !shouldPushTask(task)) return;
        queue.upsert(task);
      },
      delete: (taskId) => {
        if (pullingRef.current) return;
        queue.remove(taskId);
      },
      replaceId: () => {
        /* handled during flush */
      },
    });

    registerAppDataPush({
      patch: (fn) => {
        if (pullingRef.current) return;
        fn(appDataRef.current);
        scheduleAppDataFlush();
      },
    });

    return () => {
      queue.dispose();
      registerSheetPush(null);
      registerAppDataPush(null);
      if (appDataTimerRef.current) clearTimeout(appDataTimerRef.current);
    };
  }, [connection?.sheetId, flushTasks, flushDelete, scheduleAppDataFlush]);

  const connectAndSync = useCallback(
    async (sheetUrlOrId: string) => {
      const sheetId = parseSheetId(sheetUrlOrId);
      if (!sheetId) {
        throw new Error("Paste a valid Google Sheet URL or ID.");
      }

      setSyncing(true);
      setSyncError(null);
      try {
        disconnectSheetsDirect();
        const token = await connectSheetsDirect();
        await runPull(sheetId, token, true);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Could not sync sheet";
        setSyncError(message);
        throw e;
      } finally {
        setSyncing(false);
      }
    },
    [runPull]
  );

  const syncNow = useCallback(async () => {
    if (!connection?.sheetId) {
      throw new Error("No sheet connected yet.");
    }
    setSyncing(true);
    setSyncError(null);
    try {
      await queueRef.current?.flushNow();
      if (appDataDirtyRef.current) await flushAppData();
      const token = await ensureToken();
      await runPull(connection.sheetId, token);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Sync failed";
      setSyncError(message);
      throw e;
    } finally {
      setSyncing(false);
    }
  }, [connection?.sheetId, ensureToken, flushAppData, runPull]);

  const disconnect = useCallback(() => {
    queueRef.current?.dispose();
    queueRef.current = null;
    registerSheetPush(null);
    registerAppDataPush(null);
    if (appDataTimerRef.current) clearTimeout(appDataTimerRef.current);
    appDataRef.current = emptyAppDataStore();
    appDataDirtyRef.current = false;
    calendarIdRef.current = null;
    setConnection(null);
    setSyncError(null);
    setWriteStatus("idle");
    setWriteError(null);
    rowIndexRef.current = new Map();
    tasksRowsRef.current = [];
    disconnectSheetsDirect();
    clearSheetProjects();
  }, [clearSheetProjects]);

  return (
    <SheetContext.Provider
      value={{
        connection,
        syncing,
        syncError,
        writeStatus,
        writeError,
        templateCopyUrl: TEMPLATE_COPY_URL,
        connectAndSync,
        syncNow,
        disconnect,
      }}
    >
      {children}
    </SheetContext.Provider>
  );
}

export function useSheet(): SheetContextValue {
  const ctx = useContext(SheetContext);
  if (!ctx) throw new Error("useSheet must be used within a SheetProvider");
  return ctx;
}
