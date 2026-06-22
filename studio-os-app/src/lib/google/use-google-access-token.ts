"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/supabase/env";

/** Google OAuth access token from the Supabase session (for Picker / Drive). */
export function useGoogleAccessToken(): string | null {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (!hasSupabaseEnv) return;

    const supabase = createClient();

    supabase.auth.getSession().then(({ data }) => {
      setToken(data.session?.provider_token ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setToken(session?.provider_token ?? null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return token;
}

export function useGoogleSignedIn(): boolean {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    if (!hasSupabaseEnv) return;

    const supabase = createClient();

    supabase.auth.getSession().then(({ data }) => {
      setSignedIn(Boolean(data.session));
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session));
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return signedIn;
}
