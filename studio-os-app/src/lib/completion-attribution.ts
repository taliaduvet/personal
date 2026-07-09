import type { CompletionAttribution } from "./activity-log";
import type { DayShapeBlock } from "./week-focus";

export type CompletionAttributionResult = {
  attribution: CompletionAttribution;
  sessionId?: string;
  shapeBlock?: DayShapeBlock;
};

export function resolveCompletionAttribution(
  taskId: string,
  task: { inToday: boolean },
  ctx: {
    activeSessionTaskId: string | null;
    activeSessionStartLogId: string | null;
    shapeBlock: DayShapeBlock | null;
  }
): CompletionAttributionResult {
  if (ctx.activeSessionTaskId === taskId && ctx.activeSessionStartLogId) {
    return { attribution: "session", sessionId: ctx.activeSessionStartLogId };
  }
  if (ctx.shapeBlock) {
    return { attribution: "shape_block", shapeBlock: ctx.shapeBlock };
  }
  if (task.inToday) {
    return { attribution: "today_bench" };
  }
  return { attribution: "unplaced" };
}
