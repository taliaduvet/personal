"use client";

import { useEffect } from "react";
import { preloadGsi } from "@/lib/google/gis-oauth";

/** Load Google Identity Services early so OAuth popups work on first click. */
export function GoogleGsiPreload() {
  useEffect(() => {
    void preloadGsi().catch(() => {
      /* retried on connect */
    });
  }, []);
  return null;
}
