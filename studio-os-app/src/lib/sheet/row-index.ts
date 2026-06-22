import { TASKS_COL } from "./schema";

function cellStr(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

/** Map Task ID (column M) → 1-indexed sheet row number. */
export function buildTaskRowIndex(tasksRows: unknown[][]): Map<string, number> {
  const map = new Map<string, number>();
  for (let i = 1; i < tasksRows.length; i++) {
    const id = cellStr(tasksRows[i]?.[TASKS_COL.TASK_ID]);
    if (id) map.set(id, i + 1);
  }
  return map;
}

/** First empty data row (after header) for append fallback. */
export function nextEmptyTaskRow(tasksRows: unknown[][]): number {
  for (let i = 1; i < tasksRows.length; i++) {
    const title = cellStr(tasksRows[i]?.[TASKS_COL.TASK]);
    const id = cellStr(tasksRows[i]?.[TASKS_COL.TASK_ID]);
    if (!title && !id) return i + 1;
  }
  return tasksRows.length + 1;
}
