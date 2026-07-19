import { NextRequest, NextResponse } from "next/server";
import { buildNeedsRespondCaptureTask } from "@/lib/capture-task";
import { parseCaptureWithGemini } from "@/lib/capture-parse";
import { createClient } from "@/lib/supabase/server";
import {
  captureEnvConfigured,
  createServiceRoleClient,
  timingSafeEqualString,
} from "@/lib/supabase/admin";
import { hasGeminiKey } from "@/lib/gemini";

/** Capture + Gemini parse can take a few seconds. */
export const maxDuration = 60;

function bearerToken(req: NextRequest): string | null {
  const h = req.headers.get("authorization");
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return m?.[1]?.trim() || null;
}

/** GET — signed-in status of capture/Gemini env (never returns the token). */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    captureConfigured: captureEnvConfigured(),
    geminiConfigured: hasGeminiKey(),
    cloudRequired:
      "iPhone Share only appears in Studio OS when you are signed in with Supabase cloud sync on the live site.",
  });
}

/**
 * POST — iOS Shortcut / Share capture.
 * Auth: Authorization: Bearer <CAPTURE_TOKEN>
 * Body: { text: string } or { content: string }
 * Optional Gemini cleanup of OCR (person / title / message).
 */
export async function POST(req: NextRequest) {
  if (!captureEnvConfigured()) {
    return NextResponse.json(
      { error: "capture_not_configured", message: "Set CAPTURE_TOKEN, CAPTURE_USER_ID, and SUPABASE_SERVICE_ROLE_KEY." },
      { status: 503 }
    );
  }

  const expected = process.env.CAPTURE_TOKEN!.trim();
  const got = bearerToken(req);
  if (!got || !timingSafeEqualString(got, expected)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const text = String(record.text ?? record.content ?? record.input ?? "").trim();
  if (!text) {
    return NextResponse.json({ error: "empty_text" }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "service_role_missing" }, { status: 503 });
  }

  const parsed = await parseCaptureWithGemini(text);
  const userId = process.env.CAPTURE_USER_ID!.trim();
  const task = buildNeedsRespondCaptureTask({ text, parsed });

  const { error } = await admin.from("sos_tasks").upsert(
    {
      user_id: userId,
      id: task.id,
      data: task,
      deleted: false,
    },
    { onConflict: "user_id,id" }
  );

  if (error) {
    console.warn("[capture] upsert failed:", error.message);
    return NextResponse.json({ error: "db_error", message: error.message }, { status: 500 });
  }

  return NextResponse.json(
    {
      ok: true,
      id: task.id,
      title: task.title,
      personName: task.personName ?? null,
      respondByDateKey: task.respondByDateKey,
      parsed: Boolean(parsed),
    },
    { status: 201 }
  );
}
