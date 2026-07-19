import type { Task } from "./types";
import {
  needsRespondTasks,
  respondByOffset,
  scoreNeedsRespond,
  topNeedsRespond,
  RESPOND_STRIP_MAX,
} from "./needs-respond";
import { deadlineOffsetFromDateKey } from "./do-plan";

export function partitionForBriefing(tasks: Task[], from = new Date()) {
  const respond = needsRespondTasks(tasks);
  const respondIds = new Set(respond.map((t) => t.id));

  const onFire = tasks.filter((t) => {
    if (t.status === "done") return false;
    const by = respondByOffset(t, from);
    if (t.needsRespond && by !== null && by <= 0) return true;
    const dl =
      t.deadlineDateKey != null ? deadlineOffsetFromDateKey(t.deadlineDateKey, from) : null;
    if (dl !== null && dl <= 0 && (t.inToday || t.needsRespond)) return true;
    return false;
  });
  const onFireIds = new Set(onFire.map((t) => t.id));

  const topReplies = topNeedsRespond(
    respond.filter((t) => !onFireIds.has(t.id)),
    RESPOND_STRIP_MAX,
    { from }
  );
  const topIds = new Set(topReplies.map((t) => t.id));

  const safelyParked = respond
    .filter((t) => !onFireIds.has(t.id) && !topIds.has(t.id))
    .sort((a, b) => scoreNeedsRespond(b, { from }) - scoreNeedsRespond(a, { from }));

  const todayBench = tasks
    .filter((t) => t.inToday && !respondIds.has(t.id) && !onFireIds.has(t.id))
    .slice(0, 12);

  return { onFire, topReplies, safelyParked, todayBench, respondCount: respond.length };
}
