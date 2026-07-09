import type { DayShapeBlock } from "./week-focus";
import type { ActiveSession } from "./sessions";

export type CompletionContext = {
  activeSession: ActiveSession | null;
  shapeBlockForTask: (taskId: string) => DayShapeBlock | null;
};

let readContext: (() => CompletionContext) | null = null;

export function registerCompletionContext(reader: (() => CompletionContext) | null) {
  readContext = reader;
}

export function getCompletionContext(): CompletionContext {
  return (
    readContext?.() ?? {
      activeSession: null,
      shapeBlockForTask: () => null,
    }
  );
}
