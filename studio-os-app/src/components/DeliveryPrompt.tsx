"use client";

import { useCallback, useEffect, useState } from "react";
import { useTasks } from "@/lib/store";
import {
  DELIVERY_PROMPT_EVENT,
  type DeliveryPromptDetail,
} from "@/lib/trust/delivery-prompt";

/**
 * "Did you send it?" — asked once, at completion.
 *
 * TRUST-CORE §"Loop closing": completing and delivering are different events.
 * The trust core has always modelled that (`deliveredAt`), but nothing captured
 * the answer at the moment the user actually knows it, so `awaitingDelivery`
 * filled with un-annotated false positives and the all-clear had to ignore it.
 * This is the capture point that lets the all-clear depend on delivery honestly.
 *
 * Deliberate choices:
 *  - Only appears when a person is genuinely attached, so it stays rare rather
 *    than becoming a tax on every completion (principle 3 — no manufactured
 *    pressure).
 *  - Names the physical action ("Send to Kim") rather than an abstract state.
 *  - Dismissing is NOT a failure state. "Not yet" is a legitimate answer that
 *    leaves the task in `awaitingDelivery`, where the Trust Panel already
 *    surfaces it. Nothing is lost by ignoring this.
 */
export function DeliveryPrompt() {
  const { updateTask } = useTasks();
  const [prompt, setPrompt] = useState<DeliveryPromptDetail | null>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      setPrompt((e as CustomEvent<DeliveryPromptDetail>).detail);
    };
    window.addEventListener(DELIVERY_PROMPT_EVENT, onPrompt);
    return () => window.removeEventListener(DELIVERY_PROMPT_EVENT, onPrompt);
  }, []);

  const dismiss = useCallback(() => setPrompt(null), []);

  // Escape is "not yet", not "cancel" — there is no destructive option here.
  useEffect(() => {
    if (!prompt) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prompt, dismiss]);

  if (!prompt) return null;

  const markSent = () => {
    updateTask(prompt.taskId, { deliveredAt: new Date().toISOString() });
    setPrompt(null);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-[7.5rem] z-40 flex justify-center px-4 md:bottom-6"
    >
      <div className="flex w-full max-w-md flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-sm">
        <p className="min-w-0 flex-1 text-sm text-ink">
          Send to <span className="font-medium">{prompt.person}</span>?
        </p>

        <div className="flex shrink-0 gap-2">
          <button
            onClick={markSent}
            className="rounded-md border border-border px-2.5 py-1 text-[13px] text-ink hover:border-accent hover:text-accent"
          >
            Sent
          </button>
          <button
            onClick={dismiss}
            className="rounded-md px-2.5 py-1 text-[13px] text-muted hover:text-ink"
          >
            Not yet
          </button>
        </div>
      </div>
    </div>
  );
}
