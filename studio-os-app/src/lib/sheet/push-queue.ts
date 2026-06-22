import type { Task } from "@/lib/types";

type FlushFn = (tasks: Task[]) => Promise<void>;
type DeleteFn = (taskId: string) => Promise<void>;

const DEBOUNCE_MS = 900;

export class SheetPushQueue {
  private pending = new Map<string, Task>();
  private deleteIds = new Set<string>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private flushing = false;

  constructor(
    private flushFn: FlushFn,
    private deleteFn: DeleteFn,
    private onStatus: (status: "idle" | "pending" | "syncing" | "error", message?: string) => void
  ) {}

  upsert(task: Task) {
    this.deleteIds.delete(task.id);
    this.pending.set(task.id, task);
    this.schedule();
  }

  remove(taskId: string) {
    this.pending.delete(taskId);
    this.deleteIds.add(taskId);
    this.schedule();
  }

  dispose() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.pending.clear();
    this.deleteIds.clear();
  }

  async flushNow() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    await this.flush();
  }

  private schedule() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, DEBOUNCE_MS);
    queueMicrotask(() => this.onStatus("pending"));
  }

  private async flush() {
    if (this.flushing) return;
    const batch = [...this.pending.values()];
    const deletes = [...this.deleteIds];
    if (batch.length === 0 && deletes.length === 0) {
      this.onStatus("idle");
      return;
    }

    this.pending.clear();
    this.deleteIds.clear();
    this.flushing = true;
    this.onStatus("syncing");

    try {
      for (const id of deletes) {
        await this.deleteFn(id);
      }
      if (batch.length > 0) {
        await this.flushFn(batch);
      }
      this.onStatus("idle");
    } catch (e) {
      for (const t of batch) this.pending.set(t.id, t);
      for (const id of deletes) this.deleteIds.add(id);
      const message = e instanceof Error ? e.message : "Could not save to sheet";
      this.onStatus("error", message);
    } finally {
      this.flushing = false;
      if (this.pending.size > 0 || this.deleteIds.size > 0) {
        this.schedule();
      }
    }
  }
}
