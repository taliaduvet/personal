import type { WeekStartDay } from "@/lib/week";
import type { Project, Task } from "@/lib/types";
import { appendTaskRows, batchUpdateValues } from "./client";
import { isSheetTaskId, newSheetTaskId, taskToSheetRow } from "./map-write";
import { nextEmptyTaskRow } from "./row-index";

export type TaskIdMigration = { oldId: string; newId: string; task: Task };

export type PushTasksResult = {
  rowIndex: Map<string, number>;
  migrations: TaskIdMigration[];
};

export async function pushTasksToSheet(
  sheetId: string,
  token: string,
  tasks: Task[],
  rowIndex: Map<string, number>,
  projects: Project[],
  weekStartsOn: WeekStartDay,
  tasksRowsForAppend?: unknown[][]
): Promise<PushTasksResult> {
  const migrations: TaskIdMigration[] = [];
  const updates: { range: string; values: unknown[][] }[] = [];
  const appends: unknown[][] = [];
  const nextRow = tasksRowsForAppend ? nextEmptyTaskRow(tasksRowsForAppend) : rowIndex.size + 2;

  let appendRowCursor = nextRow;

  for (const raw of tasks) {
    let task = raw;
    if (!isSheetTaskId(task.id)) {
      const newId = newSheetTaskId();
      task = { ...task, id: newId };
      migrations.push({ oldId: raw.id, newId, task });
    }

    const values = taskToSheetRow(task, projects, weekStartsOn);
    const existingRow = rowIndex.get(task.id);

    if (existingRow) {
      updates.push({ range: `Tasks!A${existingRow}:O${existingRow}`, values: [values] });
    } else {
      appends.push(values);
      rowIndex.set(task.id, appendRowCursor);
      appendRowCursor += 1;
    }
  }

  await batchUpdateValues(sheetId, token, updates);
  await appendTaskRows(sheetId, token, appends);

  return { rowIndex, migrations };
}

export async function clearTaskRowOnSheet(
  sheetId: string,
  token: string,
  row: number
): Promise<void> {
  const blanks = Array.from({ length: 15 }, () => "");
  await batchUpdateValues(sheetId, token, [
    { range: `Tasks!A${row}:O${row}`, values: [blanks] },
  ]);
}

export async function deleteTaskFromSheet(
  sheetId: string,
  token: string,
  taskId: string,
  rowIndex: Map<string, number>
): Promise<Map<string, number>> {
  const row = rowIndex.get(taskId);
  if (!row) return rowIndex;
  await clearTaskRowOnSheet(sheetId, token, row);
  rowIndex.delete(taskId);
  return rowIndex;
}
