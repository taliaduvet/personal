"use client";

import { useTasks } from "@/lib/store";
import { PlusIcon } from "./icons";

type Props = {
  className?: string;
  iconClassName?: string;
  label?: string;
  showLabel?: boolean;
  "aria-label"?: string;
};

export function NewTaskButton({
  className,
  iconClassName = "h-4 w-4",
  label = "New",
  showLabel = true,
  "aria-label": ariaLabel = "New task",
}: Props) {
  const { createBlankTask } = useTasks();

  return (
    <button type="button" onClick={createBlankTask} className={className} aria-label={ariaLabel}>
      <PlusIcon className={iconClassName} />
      {showLabel ? label : null}
    </button>
  );
}
