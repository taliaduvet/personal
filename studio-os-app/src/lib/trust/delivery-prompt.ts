/**
 * The delivery prompt channel.
 *
 * Completion is triggered from eight surfaces (Today, Lot, Inbox, Dashboard,
 * project rooms, the detail sheet…). Threading a prompt through every one of
 * them would mean eight chances to forget, so `completeTask` announces the
 * need once and a single listener renders it.
 */

export const DELIVERY_PROMPT_EVENT = "studio-os:delivery-prompt";

export type DeliveryPromptDetail = {
  taskId: string;
  /** Who is owed the thing — always present, or we wouldn't be asking. */
  person: string;
};

export function dispatchDeliveryPrompt(detail: DeliveryPromptDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(DELIVERY_PROMPT_EVENT, { detail }));
}
