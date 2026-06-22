"use client";

import { useEffect, useState } from "react";
import { fetchCalendarEvents } from "../google/calendar-client";
import type { RawCalendarEvent } from "../calendar/types";

export type WeekCalendarState = {
  events: RawCalendarEvent[];
  loading: boolean;
  error: string | null;
  connected: boolean;
};

export function useWeekCalendarEvents(
  accessToken: string | null,
  startDateKey: string,
  endDateKey: string,
  enabled: boolean
): WeekCalendarState {
  const [events, setEvents] = useState<RawCalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !accessToken) {
      setEvents([]);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchCalendarEvents(accessToken, startDateKey, endDateKey)
      .then((data) => {
        if (!cancelled) {
          setEvents(data);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setEvents([]);
          setError(e instanceof Error ? e.message : "Could not load calendar");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, startDateKey, endDateKey, enabled]);

  return {
    events,
    loading,
    error,
    connected: Boolean(accessToken),
  };
}
