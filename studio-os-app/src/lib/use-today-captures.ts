"use client";

import { useCallback, useEffect, useState } from "react";
import { addTodayCaptureChip, getTodayCaptureChips } from "./today-captures";

export function useTodayCaptures() {
  const [chips, setChips] = useState<string[]>([]);

  useEffect(() => {
    setChips(getTodayCaptureChips());
  }, []);

  const capture = useCallback((text: string) => {
    const next = addTodayCaptureChip(text);
    setChips(next);
    return next;
  }, []);

  return { chips, capture };
}
